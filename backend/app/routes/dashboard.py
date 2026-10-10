
from datetime import datetime
from collections import defaultdict

from fastapi import APIRouter, Depends
from app.database.connection import invoices_collection
from app.routes.auth import get_current_company

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


def parse_date(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

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
        return datetime.fromisoformat(
            value.replace("Z", "+00:00")
        ).replace(tzinfo=None)
    except ValueError:
        return None


def number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def payment_status(invoice):
    status = invoice.get("payment", {}).get("status")

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

    year = now.year
    month = now.month

    for offset in range(5, -1, -1):
        m = month - offset
        y = year

        while m <= 0:
            m += 12
            y -= 1

        months.append(datetime(y, m, 1))

    return months


@router.get("")
def get_dashboard(
    company: dict = Depends(get_current_company)
):
    company_id = company["_id"]
    # Fetch only the logged-in company's invoices.
    invoices = list(
        invoices_collection.find(
            {
                "recordType": {
                    "$in": ["sales", "purchase"]
                },
                "companyId": company_id
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

    today = datetime.now()

    for invoice in invoices:
        record_type = invoice.get("recordType")

        if record_type == "sales":
            amount = number(
                invoice.get("totals", {}).get("grandTotal")
            )
            sales_total += amount
        else:
            amount = number(
                invoice.get("totals", {}).get("grandTotal")
            )
            purchase_total += amount

        status = payment_status(invoice)

        if status == "paid":
            paid_count += 1
        else:
            pending_count += 1

        invoice_date = parse_date(
            invoice.get("invoiceDate")
        )

        if invoice_date:
            key = month_key(invoice_date)

            if record_type == "sales":
                monthly_sales[key] += amount
            elif record_type == "purchase":
                monthly_purchases[key] += amount

        # Count overdue unpaid sales invoices.
        if (
            record_type == "sales"
            and status != "paid"
        ):
            due_date = parse_date(
                invoice.get("dueDate")
            )

            if due_date and due_date.date() < today.date():
                overdue_count += 1

        recent.append(
            {
                "id": str(invoice.get("_id")),
                "recordType": record_type,
                "invoiceNumber": (
                    invoice.get("invoiceNumber") or "N/A"
                ),
                "invoiceDate": invoice.get("invoiceDate"),
                "amount": amount,
                "paymentStatus": status,
                "partyName": (
                    invoice.get("customer", {}).get("name")
                    if record_type == "sales"
                    else invoice.get("vendor", {}).get("name")
                ) or "N/A",
            }
        )

    profit = sales_total - purchase_total

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

    recent.sort(
        key=lambda item: (
            parse_date(item.get("invoiceDate"))
            or datetime.min
        ),
        reverse=True
    )

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
