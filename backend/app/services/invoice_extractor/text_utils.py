import re

from app.services.invoice_extractor.constants import LABELS


# =========================================================
# TEXT NORMALIZATION
# =========================================================

def normalize_text(text):
    """
    Lower-cases, collapses whitespace and strips trailing punctuation,
    so "Invoice No :" and "INVOICE NO." both become "invoice no".
    """

    text = str(text).strip().lower()
    text = text.strip(" :;.-–")

    return " ".join(text.split())


# =========================================================
# DATE DETECTION
# =========================================================

DATE_PATTERNS = [
    r"\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}",
    r"\d{4}[-/.]\d{1,2}[-/.]\d{1,2}",
    r"\d{1,2}[-/ ][A-Za-z]{3,9}[-/ ,]+\d{2,4}",
    r"[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}"
]


def is_date(text):
    text = text.strip()

    return any(
        re.fullmatch(pattern, text)
        for pattern in DATE_PATTERNS
    )


# =========================================================
# GSTIN / PAN / PHONE / EMAIL DETECTION
# =========================================================

def find_gstin_in_text(text):
    pattern = r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b"

    match = re.search(pattern, text.upper())

    return match.group() if match else None


def find_pan_in_text(text):
    match = re.search(
        r"\b[A-Z]{5}\d{4}[A-Z]\b",
        text.upper()
    )

    return match.group() if match else None


def find_phone_in_text(text):
    match = re.search(r"\b[6-9]\d{9}\b", text)

    return match.group() if match else None


def find_phone_flexible(text):
    """
    Also accepts:
    +91 98765 43210
    98765-43210
    Ph: 9876543210

    Only used for the vendor phone.
    """

    phone = find_phone_in_text(text)

    if phone:
        return phone

    compact = re.sub(r"[\s\-()]", "", text)
    compact = re.sub(r"^[^\d+]+", "", compact)

    match = re.fullmatch(
        r"(?:\+?91|0)?([6-9]\d{9})",
        compact
    )

    return match.group(1) if match else None


def find_email_in_text(text):
    match = re.search(
        r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}",
        text
    )

    return match.group().lower() if match else None


# =========================================================
# AMOUNT DETECTION
# =========================================================

def find_amount_in_text(text, allow_integer=False):
    """
    Extracts a money amount.

    allow_integer=True also accepts amounts without decimals,
    such as "12500" or "Rs. 12,500/-".
    """

    cleaned = str(text).replace(",", "").strip()

    patterns = [
        r"(?:₹|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)",
        r"\b\d+\.\d{2}\b"
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            cleaned,
            re.IGNORECASE
        )

        if match:
            try:
                if match.lastindex:
                    return float(match.group(1))

                return float(match.group())

            except ValueError:
                pass

    if allow_integer:

        match = re.fullmatch(
            r"(\d+(?:\.\d{1,2})?)\s*(?:/-)?",
            cleaned
        )

        if match:
            return float(match.group(1))

    return None


# =========================================================
# LABEL / REFERENCE VALIDATION
# =========================================================

def is_any_label(text):
    """
    True if the text is itself one of the known field labels.
    """

    normalized = normalize_text(text)

    return any(
        normalized == normalize_text(label)
        for labels in LABELS.values()
        for label in labels
    )


def valid_reference_number(text):
    """
    Invoice / order numbers:
    must contain a digit and must not be a date,
    GSTIN or known label.
    """

    return (
        not is_date(text)
        and not is_any_label(text)
        and find_gstin_in_text(text) is None
        and bool(re.search(r"\d", text))
    )