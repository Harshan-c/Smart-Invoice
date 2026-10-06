import re

from app.services.invoice_extractor.constants import (
    LABELS,
    PAYMENT_MODES,
    GST_STATE_CODES,
)
from app.services.invoice_extractor.text_utils import (
    normalize_text,
    is_date,
    find_gstin_in_text,
    find_pan_in_text,
    find_phone_flexible,
    find_email_in_text,
    find_amount_in_text,
    valid_reference_number,
)
from app.services.invoice_extractor.geometry import (
    prepare_ocr_regions,
    group_regions_into_rows,
    get_page_size,
)
from app.services.invoice_extractor.field_extractors import (
    extract_labeled_value,
)
from app.services.invoice_extractor.vendor_extractor import (
    find_vendor_region,
    merge_name_continuation,
    find_vendor_address,
    find_vendor_name,
    first_match,
)
from app.services.invoice_extractor.item_extractor import (
    find_item_rows,
    map_item_row_columns,
)
from app.services.invoice_extractor.total_extractor import (
    extract_grand_total,
)


def empty_invoice():
    return {
        "invoiceType": "purchase",
        "invoiceNumber": None,
        "invoiceDate": None,
        "orderNumber": None,
        "orderDate": None,
        "vendor": {
            "name": None,
            "address": None,
            "phone": None,
            "email": None,
            "gstin": None,
            "pan": None,
            "state": None,
        },
        "paymentMode": None,
        "items": [],
        "totals": {
            "grandTotal": None
        }
    }


def extract_invoice_fields(ocr_result):

    invoice = empty_invoice()

    regions = prepare_ocr_regions(ocr_result)

    if not regions:
        return invoice

    rows = group_regions_into_rows(regions)

    page_width, page_height = get_page_size(regions)

    # -----------------------------------------------------
    # Sort regions
    # -----------------------------------------------------

    sorted_regions = sorted(
        regions,
        key=lambda region: (
            region["box"][1],
            region["box"][0]
        )
    )

    header_regions = [
        region
        for region in sorted_regions
        if region["box"][1] <= page_height * 0.45
    ]

    # -----------------------------------------------------
    # Invoice / order numbers and dates
    # -----------------------------------------------------

    invoice["invoiceNumber"] = extract_labeled_value(
        regions,
        rows,
        LABELS["invoice_number"],
        valid_reference_number
    )

    invoice["invoiceDate"] = extract_labeled_value(
        regions,
        rows,
        LABELS["invoice_date"],
        is_date
    )

    invoice["orderNumber"] = extract_labeled_value(
        regions,
        rows,
        LABELS["order_number"],
        valid_reference_number
    )

    invoice["orderDate"] = extract_labeled_value(
        regions,
        rows,
        LABELS["order_date"],
        is_date
    )

    # -----------------------------------------------------
    # Payment mode
    # -----------------------------------------------------

    invoice["paymentMode"] = extract_labeled_value(
        regions,
        rows,
        LABELS["payment_mode"],
        lambda text: normalize_text(text) in PAYMENT_MODES
    )

    # -----------------------------------------------------
    # Vendor
    # -----------------------------------------------------

    vendor_region = None

    labeled_name = extract_labeled_value(
        regions,
        rows,
        LABELS["vendor"],
        find_vendor_name
    )

    if labeled_name:

        invoice["vendor"]["name"] = labeled_name

        vendor_region = next(
            (
                region
                for region in regions
                if region["text"] == labeled_name
            ),
            None
        )

    else:

        vendor_region = find_vendor_region(regions)

        if vendor_region:
            invoice["vendor"]["name"] = merge_name_continuation(
                vendor_region,
                regions
            )

    # -----------------------------------------------------
    # Vendor GSTIN / PAN / state
    # -----------------------------------------------------

    gstin = (
        first_match(
            header_regions,
            find_gstin_in_text
        )
        or first_match(
            sorted_regions,
            find_gstin_in_text
        )
    )

    invoice["vendor"]["gstin"] = gstin

    pan = (
        first_match(
            header_regions,
            find_pan_in_text
        )
        or (gstin[2:12] if gstin else None)
    )

    invoice["vendor"]["pan"] = pan

    if gstin:
        invoice["vendor"]["state"] = GST_STATE_CODES.get(
            gstin[:2]
        )

    # -----------------------------------------------------
    # Vendor contact information
    # -----------------------------------------------------

    invoice["vendor"]["phone"] = first_match(
        header_regions,
        find_phone_flexible
    )

    invoice["vendor"]["email"] = first_match(
        header_regions,
        find_email_in_text
    )

    invoice["vendor"]["address"] = find_vendor_address(
        vendor_region,
        rows,
        page_width
    )

    # -----------------------------------------------------
    # Items
    # -----------------------------------------------------

    item_rows = find_item_rows(rows)

    invoice["items"] = [
        map_item_row_columns(row)
        for row in item_rows
    ]

    # -----------------------------------------------------
    # Grand total
    # -----------------------------------------------------

    invoice["totals"]["grandTotal"] = extract_grand_total(
        regions,
        rows
    )

    return invoice