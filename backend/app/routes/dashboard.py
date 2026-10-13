
from datetime import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends

from app.database.connection import invoices_collection
from app.routes.auth import get_current_company


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


# =========================================================
# DATE HELPERS
# =========================================================

def parse_date(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value

    value = str(value).strip()

    formats = (
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%d/%m/%Y",
        "%d-%m-%Y",
    )

    for fmt in formats:
        try:
            return datetime.strptime(value.replace("Z", ""), fmt)
        except ValueError:
            pass

    try:
        parsed = datetime.fromisoformat(
            value.replace("Z", "+00:00")
        )
        return parsed.replace(tzinfo=None)
    except ValueError:
        return None


def number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def payment_status(invoice):
    payment = invoice.get("payment") or {}
    status = payment.get("status")

    if status:
        return str(status).strip().lower()

    # Purchase invoices without payment details are pending.
    return "pending"


def month_key(date_value):
    return date_value.strftime("%Y-%m")


def month_label(date_value):
    return date_value.strftime("%b %Y")


def last_six_months():
    now = datetime.now()
    months = []

    for offset in range(5, -1, -1):
        month = now.month - offset
        year = now.year

        while month <= 0:
            month += 12
            year -= 1

        months.append(datetime(year, month, 1))

    return months


# =========================================================
# DASHBOARD ENDPOINT
# =========================================================

@router.get("")
def get_dashboard(
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    # Fetch only this company's sales and purchase invoices.
    invoices = list(
        invoices_collection.find(
            {
                "recordType": {
                    "$in": ["sales", "purchase"],
                },
                "companyId": company_id,
            }
        )
    )

    sales_total = 0.0
    purchase_total = 0.0

    paid_count = 0
    pending_count = 0
    overdue_count = 0

    monthly_sales = defaultdict(float)
    monthly_purchases = defaultdict(float)

    recent = []

    today = datetime.now().date()

    for invoice in invoices:
        record_type = invoice.get("recordType")

        # -------------------------------------------------
        # INVOICE AMOUNT
        # -------------------------------------------------

        totals = invoice.get("totals") or {}
        amount = number(totals.get("grandTotal"))

        if record_type == "sales":
            sales_total += amount
        elif record_type == "purchase":
            purchase_total += amount

        # -------------------------------------------------
        # PAYMENT STATUS
        # -------------------------------------------------

        status = payment_status(invoice)
        due_date = parse_date(invoice.get("dueDate"))

        # Derive overdue status for unpaid sales invoices.
        if (
            record_type == "sales"
            and status != "paid"
            and due_date
            and due_date.date() < today
        ):
            status = "overdue"

        # Count each invoice in exactly one category.
        if status == "paid":
            paid_count += 1
        elif status == "overdue":
            overdue_count += 1
        else:
            pending_count += 1

        # -------------------------------------------------
        # MONTHLY SALES AND PURCHASES
        # -------------------------------------------------

        invoice_date = parse_date(invoice.get("invoiceDate"))

        if invoice_date:
            key = month_key(invoice_date)

            if record_type == "sales":
                monthly_sales[key] += amount
            elif record_type == "purchase":
                monthly_purchases[key] += amount

        # -------------------------------------------------
        # RECENT INVOICES
        # -------------------------------------------------

        party_name = (
            invoice.get("customer", {}).get("name")
            if record_type == "sales"
            else invoice.get("vendor", {}).get("name")
        )

        recent.append(
            {
                "id": str(invoice.get("_id")),
                "recordType": record_type,
                "invoiceNumber": (
                    invoice.get("invoiceNumber") or "N/A"
                ),
                "invoiceDate": invoice.get("invoiceDate"),
                "amount": round(amount, 2),
                "paymentStatus": status,
                "partyName": party_name or "N/A",
            }
        )

    # -----------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------

    # This is sales minus purchases, not full accounting
    # net profit after all business expenses and adjustments.
    profit = sales_total - purchase_total

    # -----------------------------------------------------
    # LAST SIX CALENDAR MONTHS
    # -----------------------------------------------------

    monthly = []

    for month in last_six_months():
        key = month_key(month)

        sales = monthly_sales[key]
        purchases = monthly_purchases[key]

        monthly.append(
            {
                "month": month_label(month),
                "sales": round(sales, 2),
                "purchases": round(purchases, 2),
                "profit": round(sales - purchases, 2),
            }
        )

    # -----------------------------------------------------
    # SORT MOST RECENT INVOICES FIRST
    # -----------------------------------------------------

    recent.sort(
        key=lambda item: (
            parse_date(item.get("invoiceDate"))
            or datetime.min
        ),
        reverse=True,
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "summary": {
            "totalSales": round(sales_total, 2),
            "totalPurchases": round(purchase_total, 2),
            "totalExpenses": round(purchase_total, 2),
            "profit": round(profit, 2),
        },
        "payments": {
            "paid": paid_count,
            "pending": pending_count,
            "overdue": overdue_count,
        },
        "monthly": monthly,
        "recentInvoices": recent[:8],
    }
