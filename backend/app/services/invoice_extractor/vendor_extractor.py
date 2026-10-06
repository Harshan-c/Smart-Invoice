import re

from app.services.invoice_extractor.constants import (
    CUSTOMER_LABELS,
    REJECTED_VENDOR_TEXT,
    COMPANY_WORDS,
    NAME_STOP_WORDS,
    ADDRESS_WORDS,
    ADDRESS_STOP_WORDS,
)
from app.services.invoice_extractor.text_utils import (
    is_date,
    find_gstin_in_text,
    find_phone_in_text,
    find_phone_flexible,
    find_email_in_text,
)
from app.services.invoice_extractor.geometry import (
    get_page_size,
    get_box_center,
    get_box_height,
)


def _words(text):
    return re.findall(r"[a-z&]+", text.lower())


def has_company_suffix(text):
    return any(
        word in COMPANY_WORDS
        for word in _words(text)
    )


def looks_like_vendor_name(text):
    """Does this OCR text look like a company name?"""

    text = text.strip()

    if not text:
        return False

    if text.lower() in REJECTED_VENDOR_TEXT:
        return False

    if is_date(text):
        return False

    if find_gstin_in_text(text) or find_phone_in_text(text):
        return False

    if find_email_in_text(text) or text.lower().startswith("www"):
        return False

    if re.fullmatch(r"[\d\s.,:/()-]+", text):
        return False

    return bool(re.search(r"[A-Za-z]", text))


def looks_like_address(text):
    words = _words(text)

    hits = sum(
        1 for word in words
        if word in ADDRESS_WORDS
    )

    if re.search(r"\b\d{6}\b", text):
        return True

    if hits >= 2:
        return True

    return hits >= 1 and (
        bool(re.search(r"\d", text))
        or "," in text
    )


def customer_zones(regions, page_width):
    """
    Areas that belong to the CUSTOMER.

    Names found there must never be chosen as vendor.
    """

    zones = []

    for region in regions:

        label = region["normalized"]

        if any(
            label == item
            or label.startswith(item + " ")
            for item in CUSTOMER_LABELS
        ):

            x1, y1, x2, _ = region["box"]

            zones.append((
                x1 - page_width * 0.05,
                x2 + page_width * 0.35,
                y1 - get_box_height(
                    region["box"]
                ) * 0.5
            ))

    return zones


def in_customer_zone(region, zones):

    center_x, _ = get_box_center(
        region["box"]
    )

    y1 = region["box"][1]

    return any(
        x_low <= center_x <= x_high
        and y1 >= y_top
        for x_low, x_high, y_top in zones
    )


def find_vendor_anchor(regions, zones, page_height):
    """
    Finds vendor contact/tax information.

    Priority:
    GSTIN -> phone -> email
    """

    ordered = sorted(
        regions,
        key=lambda region: (
            region["box"][1],
            region["box"][0]
        )
    )

    for finder in (
        find_gstin_in_text,
        find_phone_flexible,
        find_email_in_text
    ):

        for region in ordered:

            if region["box"][1] > page_height * 0.5:
                break

            if in_customer_zone(region, zones):
                continue

            if finder(region["text"]):
                return region

    return None


def rank_vendor_candidates(regions):
    """
    Scores OCR lines as possible vendor names.

    Returns:
        [(score, region, reasons)]
    """

    if not regions:
        return []

    page_width, page_height = get_page_size(
        regions
    )

    heights = sorted(
        get_box_height(region["box"])
        for region in regions
    )

    median_height = max(
        heights[len(heights) // 2],
        1
    )

    zones = customer_zones(
        regions,
        page_width
    )

    anchor = find_vendor_anchor(
        regions,
        zones,
        page_height
    )

    ranked = []

    for region in regions:

        text = region["text"]

        if not looks_like_vendor_name(text):
            continue

        if in_customer_zone(region, zones):
            continue

        x1, y1, x2, y2 = region["box"]

        if (
            y1 > page_height * 0.35
            or x1 > page_width * 0.60
        ):
            continue

        words = _words(text)

        if not words:
            continue

        score = 0.0
        reasons = []

        suffix = has_company_suffix(text)

        if suffix:
            score += 3.0
            reasons.append("company word +3")

        top_bonus = max(
            0.0,
            2.0 * (
                1 - y1 / (page_height * 0.35)
            )
        )

        score += top_bonus
        reasons.append(
            f"top +{top_bonus:.1f}"
        )

        size_ratio = (
            get_box_height(region["box"])
            / median_height
        )

        size_bonus = max(
            0.0,
            min(size_ratio - 1.0, 1.5)
        )

        score += size_bonus
        reasons.append(
            f"size +{size_bonus:.1f}"
        )

        letters = [
            c for c in text
            if c.isalpha()
        ]

        if (
            letters
            and sum(
                c.isupper()
                for c in letters
            ) / len(letters) > 0.8
        ):
            score += 0.5
            reasons.append("upper +0.5")

        if (
            anchor is not None
            and region is not anchor
        ):

            ax1, ay1, ax2, _ = anchor["box"]

            if y1 <= (
                ay1
                + get_box_height(
                    anchor["box"]
                )
            ):

                distance = max(
                    ay1 - y2,
                    0
                )

                near = max(
                    0.0,
                    1.0
                    - distance
                    / (page_height * 0.2)
                )

                column_gap = abs(
                    get_box_center(
                        region["box"]
                    )[0]
                    - get_box_center(
                        anchor["box"]
                    )[0]
                )

                if column_gap > page_width * 0.3:
                    near *= 0.5

                score += 1.5 * near
                reasons.append(
                    f"near contact +{1.5 * near:.1f}"
                )

        if (
            not suffix
            and any(
                word in NAME_STOP_WORDS
                for word in words
            )
        ):
            score -= 4.0
            reasons.append(
                "title/header word -4"
            )

        if looks_like_address(text):
            score -= 3.0
            reasons.append(
                "address-like -3"
            )

        digit_ratio = (
            sum(c.isdigit() for c in text)
            / max(len(text), 1)
        )

        if digit_ratio > 0.15:
            score -= 3.0
            reasons.append(
                "many digits -3"
            )

        if text.rstrip().endswith(":"):
            score -= 4.0
            reasons.append(
                "ends with ':' -4"
            )

        if len(words) > 8:
            score -= 2.0
            reasons.append(
                "too long -2"
            )

        if region["confidence"] < 0.6:
            score -= 1.0
            reasons.append(
                "low confidence -1"
            )

        ranked.append(
            (score, region, reasons)
        )

    ranked.sort(
        key=lambda item: item[0],
        reverse=True
    )

    return ranked


def merge_name_continuation(
    best,
    regions
):
    """
    Joins a second line containing
    only the company suffix.
    """

    _, y1, _, y2 = best["box"]

    height = max(
        get_box_height(best["box"]),
        1
    )

    for region in sorted(
        regions,
        key=lambda item: item["box"][1]
    ):

        if region is best:
            continue

        words = _words(region["text"])

        if (
            not words
            or not all(
                word in COMPANY_WORDS
                for word in words
            )
        ):
            continue

        gap = region["box"][1] - y2

        if (
            gap < -height * 0.3
            or gap > height * 1.2
        ):
            continue

        if (
            min(
                region["box"][2],
                best["box"][2]
            )
            - max(
                region["box"][0],
                best["box"][0]
            )
            <= 0
        ):
            continue

        return (
            f"{best['text']} "
            f"{region['text']}"
        )

    return best["text"]


def find_vendor_region(regions):

    ranked = rank_vendor_candidates(
        regions
    )

    if (
        not ranked
        or ranked[0][0] <= 0
    ):
        return None

    return ranked[0][1]


def find_vendor_name(regions):

    region = find_vendor_region(
        regions
    )

    if region is None:
        return None

    return merge_name_continuation(
        region,
        regions
    )


def find_vendor_address(
    vendor_region,
    rows,
    page_width,
    max_rows=4
):
    """
    Extracts address lines below vendor name.
    """

    if vendor_region is None:
        return None

    name_right = vendor_region["box"][2]

    column_limit = max(
        name_right,
        page_width * 0.5
    )

    start = None

    for index, row in enumerate(rows):

        if any(
            item is vendor_region
            for item in row["regions"]
        ):
            start = index
            break

    if start is None:
        return None

    address_regions = []

    for row in rows[
        start:start + max_rows + 1
    ]:

        for region in row["regions"]:

            if region is vendor_region:
                continue

            if region["box"][0] > column_limit:
                continue

            normalized = region["normalized"]

            if any(
                normalized == label
                for label in CUSTOMER_LABELS
            ):
                continue

            text = region["text"]

            if (
                find_gstin_in_text(text)
                or find_email_in_text(text)
                or find_phone_flexible(text)
            ):
                continue

            first_word = normalized.split(" ")[0]

            if first_word in ADDRESS_STOP_WORDS:
                continue

            if normalized in REJECTED_VENDOR_TEXT:
                continue

            address_regions.append(region)

    address_regions.sort(
        key=lambda region: (
            region["box"][1],
            region["box"][0]
        )
    )

    lines = []

    for region in address_regions:

        text = region["text"].strip()

        if not text:
            continue

        if text == vendor_region["text"]:
            continue

        lines.append(text)

    if not lines:
        return None

    return ", ".join(lines)


def first_match(
    sorted_regions,
    finder
):
    """Topmost region where finder returns a value."""

    for region in sorted_regions:

        value = finder(
            region["text"]
        )

        if value:
            return value

    return None