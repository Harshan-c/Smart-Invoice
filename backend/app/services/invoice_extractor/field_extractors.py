import re
from app.services.invoice_extractor.constants import LABELS
from app.services.invoice_extractor.text_utils import normalize_text
from app.services.invoice_extractor.geometry import (
    find_value_in_same_row,
    find_value_below,
)


# =========================================================
# LABEL MATCHING
# =========================================================

def find_label_regions(regions, labels):
    """
    Returns OCR regions whose normalized text
    exactly matches one of the supplied labels.
    """

    normalized_labels = {
        normalize_text(label)
        for label in labels
    }

    return [
        region
        for region in regions
        if region["normalized"] in normalized_labels
    ]


def split_inline_label(region, labels):
    """
    Handles OCR boxes that contain both label and value.

    Example:
        "Invoice No: INV-1042"

    Returns only:
        "INV-1042"

    Returns None if no inline value is found.
    """

    text = region["text"]

    for label in sorted(
        labels,
        key=len,
        reverse=True
    ):

        match = re.match(
            rf"^\s*{re.escape(label)}"
            rf"(?![a-z])\s*[:.\-#]\s*(.+)$",
            text,
            re.IGNORECASE
        )

        if match:

            value = match.group(1).strip()

            if value:
                return value

    return None


# =========================================================
# LABELED VALUE EXTRACTION
# =========================================================

def extract_labeled_value(
    regions,
    rows,
    labels,
    validator=None
):
    """
    Tries, in order:

    1. Value to the right of label
    2. Value below label
    3. "Label: value" inside one OCR box

    Returns text or None.
    """

    for label_region in find_label_regions(
        regions,
        labels
    ):

        value = find_value_in_same_row(
            label_region,
            rows,
            validator
        )

        if value:
            return value["text"]

        value = find_value_below(
            label_region,
            regions,
            validator
        )

        if value:
            return value["text"]

    for region in regions:

        inline = split_inline_label(
            region,
            labels
        )

        if inline and (
            validator is None
            or validator(inline)
        ):
            return inline

    return None


# =========================================================
# FIELD-SPECIFIC HELPERS
# =========================================================

def extract_invoice_number(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["invoice_number"],
        validator
    )


def extract_invoice_date(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["invoice_date"],
        validator
    )


def extract_order_number(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["order_number"],
        validator
    )


def extract_order_date(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["order_date"],
        validator
    )


def extract_payment_mode(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["payment_mode"],
        validator
    )


def extract_gstin(
    regions,
    rows,
    validator=None
):
    return extract_labeled_value(
        regions,
        rows,
        LABELS["gstin"],
        validator
    )