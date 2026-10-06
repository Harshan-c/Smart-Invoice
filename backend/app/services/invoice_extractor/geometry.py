from app.services.invoice_extractor.text_utils import normalize_text


# =========================================================
# OCR REGION PREPARATION
# =========================================================

def prepare_ocr_regions(ocr_result):
    """Converts the cleaned PaddleOCR result into internal regions."""

    regions = []

    for item in (ocr_result or {}).get("text", []):

        text = str(item.get("text", "")).strip()

        if not text:
            continue

        box = item.get("box", [0, 0, 0, 0])

        if len(box) != 4:
            continue

        regions.append({
            "text": text,
            "normalized": normalize_text(text),
            "confidence": float(item.get("confidence", 0)),
            "box": box
        })

    return regions


def get_page_size(regions):
    """Approximate page size from the extent of all OCR boxes."""

    if not regions:
        return 1, 1

    width = max(
        region["box"][2]
        for region in regions
    )

    height = max(
        region["box"][3]
        for region in regions
    )

    return max(width, 1), max(height, 1)


# =========================================================
# BASIC GEOMETRY
# =========================================================

def get_box_center(box):
    x1, y1, x2, y2 = box

    return (
        (x1 + x2) / 2,
        (y1 + y2) / 2
    )


def get_box_height(box):
    return abs(box[3] - box[1])


def get_box_width(box):
    return abs(box[2] - box[0])


# =========================================================
# OCR ROW GROUPING
# =========================================================

def group_regions_into_rows(regions):
    """
    Groups OCR regions that sit on the same horizontal line.

    Invoices are multi-column, so this is essential.
    """

    sorted_regions = sorted(
        regions,
        key=lambda region: get_box_center(
            region["box"]
        )[1]
    )

    rows = []

    for region in sorted_regions:

        _, center_y = get_box_center(
            region["box"]
        )

        placed = False

        for row in rows:

            tolerance = max(
                get_box_height(region["box"]),
                row["average_height"]
            ) * 0.6

            if abs(
                center_y - row["center_y"]
            ) <= tolerance:

                row["regions"].append(region)

                row["center_y"] = sum(
                    get_box_center(item["box"])[1]
                    for item in row["regions"]
                ) / len(row["regions"])

                row["average_height"] = sum(
                    get_box_height(item["box"])
                    for item in row["regions"]
                ) / len(row["regions"])

                placed = True
                break

        if not placed:

            rows.append({
                "center_y": center_y,
                "average_height": get_box_height(
                    region["box"]
                ),
                "regions": [region]
            })

    for row in rows:
        row["regions"].sort(
            key=lambda region: region["box"][0]
        )

    rows.sort(
        key=lambda row: row["center_y"]
    )

    return rows


# =========================================================
# FIND VALUE NEXT TO A LABEL
# =========================================================

def find_value_in_same_row(
    label_region,
    rows,
    validator=None
):
    """Nearest valid value to the RIGHT of the label."""

    label_right = label_region["box"][2]

    for row in rows:

        if not any(
            item is label_region
            for item in row["regions"]
        ):
            continue

        candidates = []

        for region in row["regions"]:

            if region is label_region:
                continue

            if region["box"][0] < label_right:
                continue

            if (
                validator
                and not validator(region["text"])
            ):
                continue

            candidates.append(
                (
                    region["box"][0] - label_right,
                    region
                )
            )

        if candidates:

            candidates.sort(
                key=lambda item: item[0]
            )

            return candidates[0][1]

    return None


def find_value_below(
    label_region,
    regions,
    validator=None,
    max_gap=3.0
):
    """
    Nearest valid value directly BELOW the label.

    Common layout:
    label on one line,
    value on the next.
    """

    lx1, _, lx2, ly2 = label_region["box"]

    height = max(
        get_box_height(label_region["box"]),
        1
    )

    best = None

    for region in regions:

        if region is label_region:
            continue

        x1, y1, x2, _ = region["box"]

        if y1 < ly2 - height * 0.3:
            continue

        gap = y1 - ly2

        if gap > height * max_gap:
            continue

        if min(x2, lx2) - max(x1, lx1) <= 0:
            continue

        if (
            validator
            and not validator(region["text"])
        ):
            continue

        if best is None or gap < best[0]:
            best = (gap, region)

    return best[1] if best else None