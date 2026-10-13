
import os

from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError


load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client = MongoClient(MONGODB_URL)

database = client["smartinvoice"]

invoices_collection = database["invoices"]


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
