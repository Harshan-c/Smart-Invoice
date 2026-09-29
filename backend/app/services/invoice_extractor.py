import re


LABELS = {
    "invoice_number": [
        "invoice no",
        "invoice number",
        "inv no",
        "inv number",
        "bill no",
        "bill number"
    ],

    "invoice_date": [
        "invoice date",
        "inv date",
        "bill date"
    ],

    "vendor": [
        "vendor",
        "vendor name",
        "supplier",
        "supplier name",
        "seller",
        "seller name",
        "bill from"
    ],

    "customer": [
        "customer",
        "customer name",
        "buyer",
        "buyer name",
        "bill to",
        "ship to"
    ],

    "payment_mode": [
        "mode of payment",
        "payment mode",
        "payment method"
    ]
}


def normalize_text(text):
    return " ".join(text.strip().lower().split())


def find_label_indexes(texts, labels):
    indexes = []

    normalized_labels = {
        normalize_text(label)
        for label in labels
    }

    for index, text in enumerate(texts):

        if normalize_text(text) in normalized_labels:
            indexes.append(index)

    return indexes

def find_vendor(texts):
    vendor_labels = LABELS["vendor"]

    indexes = find_label_indexes(texts, vendor_labels)

    if not indexes:
        return None

    label_index = indexes[0]

    # Check text immediately after the vendor/supplier label
    candidates = texts[label_index + 1:label_index + 4]

    for candidate in candidates:
        candidate = candidate.strip()

        if not candidate:
            continue

        # Ignore values that are clearly not company names
        if re.fullmatch(r"\d{2}[-/]\d{2}[-/]\d{4}", candidate):
            continue

        if re.fullmatch(
            r"\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]",
            candidate.upper()
        ):
            continue

        if re.search(r"\d", candidate):
            continue

        # A company/vendor name should contain letters
        if re.search(r"[A-Za-z]", candidate):
            return candidate

    return None


def find_date(texts):
    pattern = r"\b\d{2}[-/]\d{2}[-/]\d{4}\b"

    for text in texts:

        match = re.search(pattern, text)

        if match:
            return match.group()

    return None


def find_gstin(texts):
    pattern = r"\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b"

    for text in texts:

        match = re.search(pattern, text.upper())

        if match:
            return match.group()

    return None


def find_payment_mode(texts):
    payment_modes = [
        "cash",
        "credit",
        "card",
        "upi",
        "online",
        "bank transfer"
    ]

    for text in texts:

        normalized = normalize_text(text)

        if normalized in payment_modes:
            return text.strip()

    return None


def extract_invoice_fields(ocr_result):

    texts = ocr_result["rec_texts"]

    invoice_number = None

    invoice_labels = LABELS["invoice_number"]

    indexes = find_label_indexes(
        texts,
        invoice_labels
    )

    if indexes:
        label_index = indexes[0]

        candidates = texts[label_index + 1:label_index + 4]

        for candidate in candidates:
            candidate = candidate.strip()

            if not candidate:
                continue

            # Ignore dates
            if re.fullmatch(r"\d{2}[-/]\d{2}[-/]\d{4}", candidate):
                continue

            # Ignore page numbers
            if re.search(r"\bpage\s+no\b", candidate, re.IGNORECASE):
                continue

            # Ignore GSTIN
            if re.fullmatch(
                r"\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]",
                candidate.upper()
            ):
                continue

            # Invoice numbers normally contain letters/numbers
            # and are not ordinary monetary values
            if re.search(r"[A-Za-z]", candidate) and re.search(r"\d", candidate):
                invoice_number = candidate
                break

    return {
        "invoice_number": invoice_number,
        "invoice_date": find_date(texts),
        "gstin": find_gstin(texts),
        "payment_mode": find_payment_mode(texts),
        "vendor": find_vendor(texts)
    }
def create_empty_invoice_data():
    return {
        "invoiceNumber": "",
        "invoiceDate": "",
        "dueDate": "",
        "orderNumber": "",
        "orderDate": "",

        "company": {
            "name": "",
            "address": "",
            "phone": "",
            "email": "",
            "gstin": "",
            "pan": "",
            "state": ""
        },

        "customer": {
            "name": "",
            "address": "",
            "phone": "",
            "email": "",
            "gstin": "",
            "pan": "",
            "state": ""
        },

        "items": [],

        "payment": {
            "mode": "",
            "status": "",
            "referenceNumber": ""
        },

        "totals": {
            "subtotal": 0,
            "discount": 0,
            "taxableAmount": 0,
            "cgst": 0,
            "sgst": 0,
            "igst": 0,
            "totalGST": 0,
            "grandTotal": 0
        }
    }
def find_value_after_label(texts, labels):

    indexes = find_label_indexes(
        texts,
        labels
    )

    if not indexes:
        return ""

    label_index = indexes[0]

    for candidate in texts[label_index + 1:label_index + 4]:

        candidate = candidate.strip()

        if not candidate:
            continue

        return candidate

    return ""
def extract_standard_invoice_fields(ocr_result):

    texts = ocr_result.get("rec_texts", [])

    invoice = create_empty_invoice_data()

    # ---------------------------------------------------------
    # HEADER INFORMATION
    # ---------------------------------------------------------

    invoice["invoiceNumber"] = find_value_after_label(
        texts,
        [
            "invoice no",
            "invoice number"
        ]
    )

    invoice["invoiceDate"] = find_value_after_label(
        texts,
        [
            "invoice date"
        ]
    )

    invoice["dueDate"] = find_value_after_label(
        texts,
        [
            "due date"
        ]
    )

    invoice["orderNumber"] = find_value_after_label(
        texts,
        [
            "order no",
            "order number"
        ]
    )

    invoice["orderDate"] = find_value_after_label(
        texts,
        [
            "order date"
        ]
    )

    # ---------------------------------------------------------
    # COMPANY INFORMATION
    # ---------------------------------------------------------

    invoice["company"]["name"] = find_value_after_label(
        texts,
        [
            "company name"
        ]
    )

    invoice["company"]["address"] = find_value_after_label(
        texts,
        [
            "company address"
        ]
    )

    invoice["company"]["phone"] = find_value_after_label(
        texts,
        [
            "company phone",
            "phone"
        ]
    )

    invoice["company"]["email"] = find_value_after_label(
        texts,
        [
            "company email",
            "email"
        ]
    )

    invoice["company"]["gstin"] = find_value_after_label(
        texts,
        [
            "company gstin",
            "gstin"
        ]
    )

    invoice["company"]["pan"] = find_value_after_label(
        texts,
        [
            "company pan",
            "pan"
        ]
    )

    invoice["company"]["state"] = find_value_after_label(
        texts,
        [
            "company state"
        ]
    )

    # ---------------------------------------------------------
    # CUSTOMER INFORMATION
    # ---------------------------------------------------------

    invoice["customer"]["name"] = find_value_after_label(
        texts,
        [
            "customer name"
        ]
    )

    invoice["customer"]["address"] = find_value_after_label(
        texts,
        [
            "customer address"
        ]
    )

    invoice["customer"]["phone"] = find_value_after_label(
        texts,
        [
            "customer phone"
        ]
    )

    invoice["customer"]["email"] = find_value_after_label(
        texts,
        [
            "customer email"
        ]
    )

    invoice["customer"]["gstin"] = find_value_after_label(
        texts,
        [
            "customer gstin"
        ]
    )

    invoice["customer"]["pan"] = find_value_after_label(
        texts,
        [
            "customer pan"
        ]
    )

    invoice["customer"]["state"] = find_value_after_label(
        texts,
        [
            "customer state"
        ]
    )

    # ---------------------------------------------------------
    # PAYMENT INFORMATION
    # ---------------------------------------------------------

    invoice["payment"]["mode"] = find_value_after_label(
        texts,
        [
            "payment mode",
            "payment method"
        ]
    )

    invoice["payment"]["status"] = find_value_after_label(
        texts,
        [
            "payment status"
        ]
    )

    invoice["payment"]["referenceNumber"] = find_value_after_label(
        texts,
        [
            "reference number",
            "reference no"
        ]
    )

    return invoice