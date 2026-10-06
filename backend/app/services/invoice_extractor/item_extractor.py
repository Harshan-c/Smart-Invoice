import re

from app.services.invoice_extractor.text_utils import normalize_text

# =========================================================
# ITEM ROW DETECTION
# =========================================================

def find_item_rows(rows):
    """
    Identify invoice product rows.

    Product rows normally:
    - begin with a serial number
    - contain an HSN code
    - contain several numeric columns
    - appear after the item-table header
    - end before the Total row
    """

    item_rows = []
    table_started = False

    for row in rows:

        texts = [
            region["text"].strip()
            for region in row["regions"]
        ]

        normalized_texts = [
            normalize_text(text)
            for text in texts
        ]

        if (
            "sn." in normalized_texts
            or "item name" in normalized_texts
            or "hsn code pk*" in normalized_texts
        ):
            table_started = True
            continue

        if not table_started:
            continue

        if any(
            text.lower() == "total"
            for text in texts
        ):
            break

        if not row["regions"]:
            continue

        first_text = (
            row["regions"][0]["text"].strip()
        )

        if not re.fullmatch(
            r"\d+",
            first_text
        ):
            continue

        if len(row["regions"]) < 5:
            continue

        item_rows.append(row)

    return item_rows


# =========================================================
# ITEM COLUMN MAPPING
# =========================================================

def map_item_row_columns(row):
    item = {
        "serialNumber": None,
        "productName": None,
        "hsnSac": None,
        "mrp": None,
        "rate": None,
        "quantity": None,
        "ctUn": None,
        "taxableAmount": None,
    }

    for region in row["regions"]:

        text = region["text"].strip()

        x1, y1, x2, y2 = region["box"]

        center_x = (x1 + x2) / 2

        if 180 <= center_x < 260:

            item["serialNumber"] = text

        elif 260 <= center_x < 650:

            item["productName"] = text

        elif 650 <= center_x < 830:

            item["hsnSac"] = text

        elif 830 <= center_x < 980:

            item["mrp"] = text

        elif 980 <= center_x < 1080:

            item["rate"] = text

        elif 1080 <= center_x < 1200:

            item["quantity"] = text

        elif 1200 <= center_x < 1350:

            item["ctUn"] = text

        elif 1350 <= center_x < 1570:

            item["taxableAmount"] = text

    return item
