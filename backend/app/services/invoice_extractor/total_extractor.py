import re

from app.services.invoice_extractor.constants import LABELS
from app.services.invoice_extractor.text_utils import find_amount_in_text
from app.services.invoice_extractor.geometry import (
    find_value_in_same_row,
    find_value_below,
)
from app.services.invoice_extractor.field_extractors import (
    find_label_regions,
    split_inline_label,
)


def extract_grand_total(regions, rows):
    """
    Extract the grand total using the existing
    SmartInvoice extraction logic.

    Current behavior:
    - Check values beside total labels
    - Check values below total labels
    - Check inline total labels
    - If none found, use clearly formatted amounts
    - Select the largest detected amount
    """

    def amount_validator(text):
        return (
            find_amount_in_text(
                text,
                allow_integer=True
            ) is not None
        )

    totals = []

    # -----------------------------------------------------
    # Values beside / below total labels
    # -----------------------------------------------------

    for label in find_label_regions(
        regions,
        LABELS["total"]
    ):

        value = (
            find_value_in_same_row(
                label,
                rows,
                amount_validator
            )
            or find_value_below(
                label,
                regions,
                amount_validator
            )
        )

        if value:

            amount = find_amount_in_text(
                value["text"],
                allow_integer=True
            )

            if amount is not None:
                totals.append(amount)

    # -----------------------------------------------------
    # Inline total labels
    # -----------------------------------------------------

    for region in regions:

        inline = split_inline_label(
            region,
            LABELS["total"]
        )

        if inline:

            amount = find_amount_in_text(
                inline,
                allow_integer=True
            )

            if amount is not None:
                totals.append(amount)

    # -----------------------------------------------------
    # Fallback
    # -----------------------------------------------------

    if not totals:

        for region in regions:

            if re.fullmatch(
                r"(?:₹|rs\.?|inr)?\s*"
                r"[\d,]+\.\d{2}",
                region["text"].strip(),
                re.IGNORECASE
            ):

                amount = find_amount_in_text(
                    region["text"]
                )

                if amount is not None:
                    totals.append(amount)

    # -----------------------------------------------------
    # Final total
    # -----------------------------------------------------

    if totals:
        return max(totals)

    return None