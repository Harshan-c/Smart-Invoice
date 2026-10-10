"""
Generalized invoice item extraction.

This module intentionally does NOT assume that every invoice has a table,
serial number, HSN column, or fixed X coordinates.

Public API is kept compatible with the existing extractor.py:
    find_item_rows(rows)
    map_item_row_columns(row)
"""

import re
from math import isclose

from app.services.invoice_extractor.text_utils import normalize_text


# ---------------------------------------------------------------------------
# Labels / patterns used only to reject obvious non-item rows.
# These are semantic boundaries, not invoice-template coordinates.
# ---------------------------------------------------------------------------
STOP_LABELS = (
    "subtotal",
    "sub total",
    "grand total",
    "total amount",
    "total payable",
    "amount payable",
    "amount due",
    "net amount",
    "total qty",
    "total quantity",
    "round off",
    "rounding",
    "sgst",
    "cgst",
    "igst",
    "cess",
    "tax total",
    "tax amount",
    "balance",
    "paid",
    "payment",
    "amount received",
    "amount tendered",
    "change",
    "thank you",
)

META_LABELS = (
    "invoice",
    "invoice no",
    "invoice number",
    "bill no",
    "bill number",
    "date",
    "invoice date",
    "bill date",
    "order no",
    "order number",
    "order date",
    "po no",
    "po number",
    "cashier",
    "token",
    "dine in",
    "table",
    "gstin",
    "gst no",
    "gst number",
    "mobile",
    "mob",
    "phone",
    "email",
    "customer",
    "customer name",
    "bill to",
    "billed to",
    "ship to",
    "sold to",
)

HEADER_WORDS = {
    "item", "items", "description", "particular", "particulars",
    "product", "product name", "name", "qty", "quantity", "price",
    "rate", "unit price", "amount", "value", "total", "hsn", "hsn code",
    "sac", "serial", "sl", "sr", "mrp", "unit", "uom",
}

UNIT_WORDS = {
    "pc", "pcs", "piece", "pieces", "nos", "no", "unit", "units",
    "kg", "kgs", "g", "gm", "gms", "gram", "grams", "mg",
    "l", "ltr", "litre", "litres", "ml", "box", "boxes", "pack",
    "packs", "set", "sets", "dozen", "dz", "bottle", "bottles",
    "bag", "bags", "case", "cases", "meter", "metre", "mtr", "ft",
}

NUMBER_RE = re.compile(
    r"(?<![A-Za-z])(?:₹|rs\.?|inr)?\s*"
    r"[-+]?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?"
    r"|(?<![A-Za-z])(?:₹|rs\.?|inr)?\s*[-+]?\d+(?:\.\d+)?"
    r"(?![A-Za-z])",
    re.IGNORECASE,
)

DATE_RE = re.compile(
    r"^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$|"
    r"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$",
    re.IGNORECASE,
)

GSTIN_RE = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b", re.I)
PHONE_RE = re.compile(r"(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}")


def _clean_number(text):
    """Return a float for a money/quantity-like string, or None."""
    value = str(text).strip()
    value = value.replace("₹", "").replace("Rs.", "").replace("Rs", "")
    value = value.replace("INR", "").replace("inr", "")
    value = value.replace(",", "").replace("/-", "")
    value = value.strip()

    # Keep only the first numeric token.
    match = re.search(r"[-+]?\d+(?:\.\d+)?", value)
    if not match:
        return None

    try:
        return float(match.group())
    except ValueError:
        return None


def _number_tokens(text):
    """Return [(value, raw_text, start, end), ...] from one OCR region."""
    result = []
    for match in NUMBER_RE.finditer(str(text)):
        raw = match.group().strip()
        value = _clean_number(raw)
        if value is not None:
            result.append((value, raw, match.start(), match.end()))
    return result


def _is_stop_row(row):
    text = " ".join(r["text"].strip() for r in row["regions"])
    normalized = normalize_text(text)
    return any(
        normalized == label
        or normalized.startswith(label + " ")
        or normalized.startswith(label + ":")
        for label in STOP_LABELS
    )


def _looks_like_metadata(text):
    normalized = normalize_text(text)

    if not normalized:
        return True

    if GSTIN_RE.search(text) or PHONE_RE.search(text):
        return True

    if DATE_RE.fullmatch(normalized):
        return True

    for label in META_LABELS:
        if normalized == label or normalized.startswith(label + ":"):
            return True
        if normalized.startswith(label + " ") and len(normalized.split()) <= 5:
            return True

    return False


def _region_numbers(region):
    return _number_tokens(region["text"])


def _row_numbers(row):
    values = []
    for region in row["regions"]:
        for value, raw, start, end in _region_numbers(region):
            values.append({
                "value": value,
                "raw": raw,
                "region": region,
                "start": start,
                "end": end,
            })
    return values


def _meaningful_text_regions(row):
    """Return OCR regions containing useful description text."""
    result = []

    for region in row["regions"]:
        text = region["text"].strip()
        normalized = normalize_text(text)

        if not normalized:
            continue

        # A region that is purely numeric is not a description.
        if _number_tokens(text) and re.fullmatch(
            r"[₹RsINR\s,./:+()\-\d]+", text, re.I
        ):
            continue

        if normalized in HEADER_WORDS:
            continue

        if _looks_like_metadata(text):
            continue

        result.append(region)

    return result


def _has_item_math(values, tolerance=0.06):
    """
    Detect q * rate ~= amount without assuming column positions.
    This is particularly useful for POS receipts.
    """
    nums = [item["value"] for item in values]

    for i, a in enumerate(nums):
        for j, b in enumerate(nums):
            if i == j or a <= 0 or b <= 0:
                continue

            product = a * b
            for k, c in enumerate(nums):
                if k in (i, j) or c <= 0:
                    continue

                allowed = max(0.05, abs(c) * tolerance)
                if abs(product - c) <= allowed:
                    return True

    return False


def _looks_like_quantity(value):
    return value > 0 and value <= 10000 and isclose(value, round(value), abs_tol=1e-9)


def _row_item_score(row):
    """Score whether an OCR row is likely to represent an invoice item."""
    if not row.get("regions"):
        return -999

    text = " ".join(r["text"].strip() for r in row["regions"])
    normalized = normalize_text(text)

    if _is_stop_row(row):
        return -999

    if _looks_like_metadata(text):
        return -999

    descriptions = _meaningful_text_regions(row)
    values = _row_numbers(row)

    if not descriptions or not values:
        return -999

    score = 0.0

    # Description is essential.
    score += 2.0

    if len(values) >= 2:
        score += 1.5

    if len(values) >= 3:
        score += 0.5

    if _has_item_math(values):
        score += 4.0

    if any(_looks_like_quantity(v["value"]) for v in values):
        score += 1.0

    # A row that contains obvious field labels is probably metadata/header.
    if any(
        normalize_text(r["text"]) in HEADER_WORDS
        for r in row["regions"]
    ):
        score -= 3.0

    # Very long prose is more likely to be an address/notes row.
    if len(normalized.split()) > 18:
        score -= 3.0

    return score


def _is_probable_item_row(row):
    return _row_item_score(row) >= 4.0


def find_item_rows(rows):
    """
    Generalized invoice/POS line-item detection.

    No assumptions are made about:
      - a table existing
      - serial numbers existing
      - HSN/SAC existing
      - fixed X coordinates
      - a specific item header

    Instead, rows are selected when description text and numeric values have
    an item-like relationship. Rows such as category headings are ignored,
    while continuation/modifier rows are merged later by map_item_row_columns.
    """
    item_rows = []
    started = False
    pending_text_rows = []

    for row in rows:
        if not row.get("regions"):
            continue

        if _is_stop_row(row):
            # Once line items have started, totals mark the end of the item area.
            if started:
                break
            pending_text_rows.clear()
            continue

        score = _row_item_score(row)

        if score >= 4.0:
            # A description can appear on the line immediately above the
            # numeric part of an item. Attach only short, nearby text rows.
            if pending_text_rows:
                candidate = pending_text_rows[-1]
                if _can_merge_continuation(candidate, row):
                    merged = {**row, "regions": candidate["regions"] + row["regions"]}
                    item_rows.append(merged)
                else:
                    item_rows.append(row)
            else:
                item_rows.append(row)

            pending_text_rows.clear()
            started = True
            continue

        if started and _can_be_continuation(row):
            # Preserve short continuation/modifier rows such as "PC" so they
            # are not lost. They are attached to the preceding item below.
            if item_rows and _can_merge_continuation(item_rows[-1], row):
                item_rows[-1] = {
                    **item_rows[-1],
                    "regions": item_rows[-1]["regions"] + row["regions"],
                }
            continue

        # Before the first strong item candidate we deliberately do NOT merge
        # text-only rows. POS receipts often contain category/section headings
        # (for example "The Best Biryaani") immediately before the first item.
        # Keeping them separate prevents category names from becoming products.

    return item_rows


def _can_be_continuation(row):
    """Whether a row could be a short item-description/modifier line."""
    if not row.get("regions") or _is_stop_row(row):
        return False

    text = " ".join(r["text"].strip() for r in row["regions"])
    normalized = normalize_text(text)

    if not normalized or _looks_like_metadata(text):
        return False

    # Do not hold arbitrary paragraphs as possible item descriptions.
    if len(normalized.split()) > 8:
        return False

    # Header-like rows are not useful continuations.
    if all(normalize_text(r["text"]) in HEADER_WORDS for r in row["regions"]):
        return False

    return True


def _row_vertical_gap(upper, lower):
    uy2 = max(r["box"][3] for r in upper["regions"])
    ly1 = min(r["box"][1] for r in lower["regions"])
    return ly1 - uy2


def _can_merge_continuation(upper, lower):
    """Allow only nearby rows to be merged into one item."""
    if not upper.get("regions") or not lower.get("regions"):
        return False

    gap = _row_vertical_gap(upper, lower)
    heights = [
        abs(r["box"][3] - r["box"][1])
        for r in upper["regions"] + lower["regions"]
    ]
    median_height = sorted(heights)[len(heights) // 2] or 1

    if gap < -median_height * 0.5 or gap > median_height * 2.8:
        return False

    # Keep continuation roughly in the same text area as the item.
    upper_left = min(r["box"][0] for r in upper["regions"])
    lower_left = min(r["box"][0] for r in lower["regions"])
    if abs(upper_left - lower_left) > max(80, median_height * 8):
        return False

    return True


def _format_number(value):
    if value is None:
        return None
    if isclose(value, round(value), abs_tol=1e-9):
        return str(int(round(value)))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _description_text(row, excluded_regions=None):
    excluded_regions = excluded_regions or set()
    parts = []

    for region in sorted(row["regions"], key=lambda r: r["box"][0]):
        if id(region) in excluded_regions:
            continue

        text = region["text"].strip()
        normalized = normalize_text(text)

        if not normalized or normalized in HEADER_WORDS:
            continue

        # Remove pure numeric regions.
        if _number_tokens(text) and re.fullmatch(
            r"[₹RsINR\s,./:+()\-\d]+", text, re.I
        ):
            continue

        if _looks_like_metadata(text):
            continue

        parts.append(text)

    return " ".join(parts).strip() or None


def _find_best_math_triplet(values):
    """Return (quantity, rate, amount) based on multiplication relationship."""
    if len(values) < 3:
        return None

    for i, q in enumerate(values):
        if not _looks_like_quantity(q["value"]):
            continue
        for j, rate in enumerate(values):
            if j == i or rate["value"] <= 0:
                continue
            for k, amount in enumerate(values):
                if k in (i, j) or amount["value"] <= 0:
                    continue

                expected = q["value"] * rate["value"]
                tolerance = max(0.05, abs(amount["value"]) * 0.06)
                if abs(expected - amount["value"]) <= tolerance:
                    return q, rate, amount

    return None


def _infer_numeric_roles(row):
    """Infer quantity/rate/amount without relying on column X coordinates."""
    values = _row_numbers(row)

    if not values:
        return None, None, None, set()

    triplet = _find_best_math_triplet(values)
    if triplet:
        q, rate, amount = triplet
        return q["value"], rate["value"], amount["value"], {
            id(q["region"]), id(rate["region"]), id(amount["region"])
        }

    # Two-number POS/invoice pattern: small integer quantity + total amount.
    if len(values) >= 2:
        quantity_candidates = [v for v in values if _looks_like_quantity(v["value"])]
        if quantity_candidates:
            q = quantity_candidates[0]
            others = [v for v in values if v is not q]
            amount = max(others, key=lambda v: v["value"])
            if amount["value"] >= q["value"]:
                return (
                    q["value"],
                    amount["value"] / q["value"],
                    amount["value"],
                    {id(q["region"]), id(amount["region"])},
                )

    # Single amount: preserve it as taxable amount. Quantity/rate remain unknown.
    if len(values) == 1:
        amount = values[0]
        return None, None, amount["value"], {id(amount["region"])}

    return None, None, None, set()


def _extract_hsn(values):
    """Find a plausible HSN/SAC candidate without requiring an HSN column."""
    for value in values:
        number = value["value"]
        raw = value["raw"].replace(",", "")
        if re.fullmatch(r"\d{4,8}", raw):
            # Avoid treating a large quantity or amount as HSN.
            if number >= 1000 and number <= 99999999:
                return raw
    return None


def _extract_serial(row, values):
    """Use a left-most small integer as serial only when another quantity exists."""
    if not values:
        return None

    ordered = sorted(values, key=lambda v: v["region"]["box"][0])
    first = ordered[0]

    if not _looks_like_quantity(first["value"]):
        return None

    # A serial number is only inferred when there are enough numeric fields
    # for a real tabular row. In POS rows such as "5 20.00 100.00", the
    # left-most small integer is the quantity, not a serial number.
    if len(values) < 4:
        return None

    quantity_like = [v for v in values if _looks_like_quantity(v["value"])]
    if len(quantity_like) >= 2 and first is not quantity_like[-1]:
        return first["raw"].replace(",", "")

    return None


def _find_unit(row, quantity_value):
    if quantity_value is None:
        return None

    regions = sorted(row["regions"], key=lambda r: r["box"][0])

    for region in regions:
        normalized = normalize_text(region["text"])
        if normalized in UNIT_WORDS:
            return region["text"].strip()

    return None


def map_item_row_columns(row):
    """
    Convert a dynamically detected item row into the existing SmartInvoice
    item structure. The output keys remain unchanged for compatibility.
    """
    item = {
        "serialNumber": None,
        "productName": _description_text(row),
        "hsnSac": None,
        "mrp": None,
        "rate": None,
        "quantity": None,
        "ctUn": None,
        "taxableAmount": None,
    }

    values = _row_numbers(row)

    quantity, rate, amount, used_regions = _infer_numeric_roles(row)

    item["quantity"] = _format_number(quantity)
    item["rate"] = _format_number(rate)
    item["taxableAmount"] = _format_number(amount)
    item["hsnSac"] = _extract_hsn(values)
    item["serialNumber"] = _extract_serial(row, values)
    item["ctUn"] = _find_unit(row, quantity)

    # If a serial was identified, remove it from a description that OCR may
    # have combined into the same region.
    if item["serialNumber"] and item["productName"]:
        item["productName"] = re.sub(
            rf"^\s*{re.escape(item['serialNumber'])}[.)\-:\s]+",
            "",
            item["productName"],
        ).strip() or item["productName"]

    # A standalone unit region should not become part of productName.
    if item["productName"]:
        words = item["productName"].split()
        if words and normalize_text(words[-1]) in UNIT_WORDS:
            item["productName"] = " ".join(words[:-1]).strip() or item["productName"]

    return item
