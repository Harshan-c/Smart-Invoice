
import os
import re

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError


load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client = MongoClient(MONGODB_URL)

database = client["smartinvoice"]

invoices_collection = database["invoices"]
invoice_counters_collection = database["invoice_counters"]


# =========================================================
# INVOICE NUMBER UNIQUENESS
# =========================================================

def ensure_invoice_indexes():
    """
    Prevent duplicate invoice numbers within the same
    company and invoice type.
    """
    try:
        invoices_collection.create_index(
            [
                ("companyId", ASCENDING),
                ("recordType", ASCENDING),
                ("invoiceNumber", ASCENDING),
            ],
            unique=True,
            partialFilterExpression={
                "recordType": {
                    "$in": ["sales", "purchase"]
                },
                "invoiceNumber": {
                    "$type": "string"
                },
            },
            name="unique_company_invoice_number",
        )

        print("Invoice uniqueness index is ready.")

    except DuplicateKeyError:
        print(
            "Could not create invoice index: "
            "duplicate invoice numbers already exist."
        )
        raise


def get_next_sales_invoice_number(company_id):
    """Return the next unique sales invoice number for one company.

    Existing INV-<number> invoices are considered when a company first uses
    automatic numbering, so deploying this feature does not restart a legacy
    company's sequence at INV-00001.
    """
    prefix = "INV"
    counter_id = f"{company_id}:sales"

    # Seed a new counter from the highest existing number for this company.
    # $setOnInsert means concurrent first-time requests do not reset a counter
    # that another request has already created.
    highest_existing = 0
    existing_numbers = invoices_collection.find(
        {
            "companyId": company_id,
            "recordType": "sales",
            "invoiceNumber": {"$regex": r"^INV-\d+$"},
        },
        {"invoiceNumber": 1, "_id": 0},
    )
    for record in existing_numbers:
        match = re.fullmatch(r"INV-(\d+)", str(record.get("invoiceNumber", "")))
        if match:
            highest_existing = max(highest_existing, int(match.group(1)))

    try:
        invoice_counters_collection.update_one(
            {"_id": counter_id},
            {"$max": {"sequence": highest_existing}},
            upsert=True,
        )
    except DuplicateKeyError:
        # Another request created the counter between our upsert check and
        # insert. Its counter is the one we should increment.
        pass

    counter = invoice_counters_collection.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"sequence": 1}},
        return_document=ReturnDocument.AFTER,
    )

    if not counter:
        raise RuntimeError("Could not allocate a sales invoice number.")

    return f"{prefix}-{int(counter['sequence']):05d}"


# =========================================================
# FORECAST EVALUATION UNIQUENESS
# =========================================================

def ensure_forecast_evaluation_indexes():
    """Prevent multiple saved forecasts for one company and forecast month."""
    evaluations_collection = database["company_forecast_evaluations"]
    try:
        evaluations_collection.create_index(
            [("companyId", ASCENDING), ("forecastMonth", ASCENDING)],
            unique=True,
            name="unique_company_forecast_month",
        )
        print("Forecast evaluation uniqueness index is ready.")
    except DuplicateKeyError:
        print(
            "Could not create forecast evaluation index: duplicate company/month "
            "records already exist. Resolve duplicates before restarting."
        )
        raise
