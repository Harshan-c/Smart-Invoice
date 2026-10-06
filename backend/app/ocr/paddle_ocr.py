import os

# Must be set BEFORE paddle is imported
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

import json
import logging
import threading
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from paddleocr import PaddleOCR


logger = logging.getLogger(__name__)


# =========================================================
# CONFIGURATION
# =========================================================

SUPPORTED_IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"
}
SUPPORTED_PDF_EXTENSIONS = {".pdf"}

# Drop low-confidence detections (noise, stamps, smudges)
MIN_CONFIDENCE = 0.50

# Small / low-res invoices are upscaled before OCR, then boxes are mapped back
MIN_LONG_SIDE = 1600
MAX_UPSCALE = 2.5

# Very large images are downscaled before OCR (speed + memory)
MAX_LONG_SIDE = 4000

# PDF render resolution (200 DPI is a good OCR trade-off)
PDF_DPI = 200


# =========================================================
# OCR ENGINE (lazy, thread-safe singleton)
# =========================================================

_ocr_engine = None
_ocr_lock = threading.Lock()


def get_ocr_engine():
    """Creates the PaddleOCR model once and reuses it."""

    global _ocr_engine

    if _ocr_engine is not None:
        return _ocr_engine

    with _ocr_lock:

        if _ocr_engine is not None:
            return _ocr_engine

        try:
            # PaddleOCR 3.x
            _ocr_engine = PaddleOCR(
                lang="en",
                enable_mkldnn=True,
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False
            )
        except (TypeError, ValueError):
            # PaddleOCR 2.x fallback
            _ocr_engine = PaddleOCR(
                lang="en",
                use_angle_cls=False,
                show_log=False
            )

    return _ocr_engine


# =========================================================
# IMAGE / PDF LOADING
# =========================================================

def _load_image(image_path):
    """Loads an image file as an RGB PIL image (EXIF rotation applied)."""

    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image)

    return image.convert("RGB")


def _load_pdf_pages(pdf_path):
    """Renders every PDF page to an RGB PIL image."""

    try:
        import pypdfium2 as pdfium
    except ImportError as error:
        raise RuntimeError(
            "PDF support needs pypdfium2: pip install pypdfium2"
        ) from error

    pdf = pdfium.PdfDocument(str(pdf_path))
    scale = PDF_DPI / 72

    pages = []

    for index in range(len(pdf)):
        bitmap = pdf[index].render(scale=scale)
        pages.append(bitmap.to_pil().convert("RGB"))

    return pages


def _load_pages(path):
    """Returns a list of PIL images for an image or PDF file."""

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    extension = path.suffix.lower()

    if extension in SUPPORTED_PDF_EXTENSIONS:
        return _load_pdf_pages(path)

    if extension in SUPPORTED_IMAGE_EXTENSIONS:
        return [_load_image(path)]

    raise ValueError(f"Unsupported file type: {extension}")


# =========================================================
# PREPROCESSING
# =========================================================

def _prepare_image(image):
    """
    Resizes the image for OCR if needed.

    Returns (numpy_array, scale). `scale` is how much the image was
    resized, so detected boxes can be divided by it afterwards.
    """

    width, height = image.size
    long_side = max(width, height)

    scale = 1.0

    if long_side < MIN_LONG_SIDE:
        scale = min(MIN_LONG_SIDE / long_side, MAX_UPSCALE)

    elif long_side > MAX_LONG_SIDE:
        scale = MAX_LONG_SIDE / long_side

    if abs(scale - 1.0) > 1e-3:
        new_size = (
            int(round(width * scale)),
            int(round(height * scale))
        )
        image = image.resize(new_size, Image.LANCZOS)

    return np.array(image), scale


# =========================================================
# BOX HELPERS
# =========================================================

def _to_xyxy(box):
    """
    Converts any box format PaddleOCR produces into [x1, y1, x2, y2].

    Accepts:
      - [x1, y1, x2, y2]
      - [[x, y], [x, y], [x, y], [x, y]]  (polygon)
    """

    array = np.asarray(box, dtype=float)

    if array.size == 4:
        x1, y1, x2, y2 = array.reshape(-1).tolist()
        return [x1, y1, x2, y2]

    points = array.reshape(-1, 2)

    return [
        float(points[:, 0].min()),
        float(points[:, 1].min()),
        float(points[:, 0].max()),
        float(points[:, 1].max())
    ]


def _rescale_box(box, scale, width, height):
    """Maps a box back to original coordinates and clamps it to the image."""

    x1, y1, x2, y2 = [value / scale for value in box]

    x1 = max(0, min(int(round(x1)), width))
    x2 = max(0, min(int(round(x2)), width))
    y1 = max(0, min(int(round(y1)), height))
    y2 = max(0, min(int(round(y2)), height))

    return [x1, y1, x2, y2]


# =========================================================
# RAW OCR PARSING (supports PaddleOCR 3.x and 2.x output)
# =========================================================

def _parse_prediction(prediction):
    """Returns a list of (text, score, box_xyxy) from one page result."""

    items = []

    if prediction is None:
        return items

    # ---------- PaddleOCR 3.x ----------
    if hasattr(prediction, "get"):

        texts = prediction.get("rec_texts", [])
        scores = prediction.get("rec_scores", [])

        boxes = prediction.get("rec_boxes", None)

        if boxes is None or len(boxes) == 0:
            boxes = prediction.get("rec_polys", None)

        if boxes is None or len(boxes) == 0:
            boxes = prediction.get("dt_polys", [])

        for text, score, box in zip(texts, scores, boxes):
            items.append((str(text), float(score), _to_xyxy(box)))

        return items

    # ---------- PaddleOCR 2.x : [[polygon, (text, score)], ...] ----------
    for line in prediction:
        polygon, (text, score) = line
        items.append((str(text), float(score), _to_xyxy(polygon)))

    return items


def _run_ocr_on_image(image, min_confidence):
    """Runs OCR on one PIL image and returns the cleaned text list."""

    engine = get_ocr_engine()

    original_width, original_height = image.size
    array, scale = _prepare_image(image)

    if hasattr(engine, "predict"):
        results = engine.predict(array)
        prediction = results[0] if results else None
    else:
        results = engine.ocr(array, cls=False)
        prediction = results[0] if results else None

    extracted = []

    for text, score, box in _parse_prediction(prediction):

        text = text.strip()

        if not text or score < min_confidence:
            continue

        extracted.append({
            "text": text,
            "confidence": round(score, 4),
            "box": _rescale_box(
                box,
                scale,
                original_width,
                original_height
            )
        })

    # Reading order: top to bottom, then left to right
    extracted.sort(key=lambda item: (item["box"][1], item["box"][0]))

    return extracted


# =========================================================
# PUBLIC API
# =========================================================

def extract_text(image_path, page=0, min_confidence=MIN_CONFIDENCE):
    """
    Runs OCR on an invoice image (or one page of a PDF).

    Drop-in replacement for the original extract_text():
    returns {"success": bool, "text": [...]} and never raises.
    """

    try:
        pages = _load_pages(image_path)

        if page >= len(pages):
            raise IndexError(
                f"Page {page} requested, file has {len(pages)} page(s)"
            )

        return {
            "success": True,
            "text": _run_ocr_on_image(pages[page], min_confidence)
        }

    except Exception as error:
        logger.exception("OCR failed for %s", image_path)

        return {
            "success": False,
            "text": [],
            "error": str(error)
        }


def extract_text_all_pages(file_path, min_confidence=MIN_CONFIDENCE):
    """OCR for multi-page PDFs: returns one result dict per page."""

    try:
        pages = _load_pages(file_path)
    except Exception as error:
        logger.exception("Could not load %s", file_path)
        return [{"success": False, "text": [], "error": str(error)}]

    results = []

    for index, image in enumerate(pages):
        try:
            results.append({
                "success": True,
                "page": index,
                "text": _run_ocr_on_image(image, min_confidence)
            })
        except Exception as error:
            logger.exception("OCR failed on page %s", index)
            results.append({
                "success": False,
                "page": index,
                "text": [],
                "error": str(error)
            })

    return results


def extract_invoice(file_path, min_confidence=MIN_CONFIDENCE):
    """
    End-to-end helper: OCR -> invoice_extractor.

    For multi-page PDFs, page text is merged with a vertical offset so
    the row-grouping logic in invoice_extractor stays correct.
    """

    from invoice_extractor import extract_invoice_fields

    pages = extract_text_all_pages(file_path, min_confidence)

    merged = []
    y_offset = 0

    for page_result in pages:

        if not page_result["success"]:
            continue

        page_bottom = 0

        for item in page_result["text"]:
            x1, y1, x2, y2 = item["box"]

            merged.append({
                **item,
                "box": [x1, y1 + y_offset, x2, y2 + y_offset]
            })

            page_bottom = max(page_bottom, y2)

        y_offset += page_bottom + 200

    ocr_result = {"success": bool(merged), "text": merged}

    return extract_invoice_fields(ocr_result)


# =========================================================
# CLI
# =========================================================

if __name__ == "__main__":

    import argparse

    parser = argparse.ArgumentParser(
        description="PaddleOCR invoice text extraction"
    )
    parser.add_argument(
        "path",
        nargs="?",
        default="../data/invoices/Invoice002.jpg",
        help="Invoice image or PDF"
    )
    parser.add_argument(
        "--invoice",
        action="store_true",
        help="Also run invoice_extractor and print structured fields"
    )
    parser.add_argument(
        "--min-conf",
        type=float,
        default=MIN_CONFIDENCE,
        help="Minimum OCR confidence (0-1)"
    )
    args = parser.parse_args()

    if args.invoice:
        output = extract_invoice(args.path, args.min_conf)
        title = "INVOICE FIELDS"
    else:
        output = extract_text(args.path, min_confidence=args.min_conf)
        title = "OCR RESULT"

    print(f"\n{title}\n")
    print(json.dumps(output, indent=2, ensure_ascii=False))