import os
from app.services.invoice_extractor import extract_invoice_fields

# Disable PaddlePaddle PIR execution
os.environ["FLAGS_enable_pir_api"] = "0"

from paddleocr import PaddleOCR


ocr = PaddleOCR(
    lang="en",
    enable_mkldnn=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False
)


def extract_text(image_path):
    result = ocr.predict(image_path)

    return result[0]


if __name__ == "__main__":
    image_path = "../data/invoices/Invoice003.jpg"

    ocr_result = extract_text(image_path)

    invoice_data = extract_invoice_fields(ocr_result)

    print(invoice_data)