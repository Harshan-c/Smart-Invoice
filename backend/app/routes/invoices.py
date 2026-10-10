
import os

from bson import ObjectId
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)

from app.database.connection import invoices_collection
from app.schemas.invoice import InvoiceCreate, Payment
from app.schemas.purchase_invoice import PurchaseInvoiceCreate
from app.ocr.paddle_ocr import extract_text
from app.services.invoice_extractor import extract_invoice_fields
from app.routes.auth import get_current_company


router = APIRouter(
    prefix="/api",
    tags=["Invoices"],
)


# =========================================================
# INVOICE UPLOAD + OCR
# =========================================================

@router.post("/invoices/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    company: dict = Depends(get_current_company),
):
    upload_folder = "../data/invoices"

    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(
        upload_folder,
        file.filename,
    )

    file_content = await file.read()

    with open(file_path, "wb") as saved_file:
        saved_file.write(file_content)

    try:
        ocr_result = extract_text(file_path)

        invoice_data = extract_invoice_fields(
            ocr_result
        )

        return {
            "message": (
                "Invoice uploaded and OCR processed successfully"
            ),
            "filename": file.filename,
            "extracted_data": invoice_data,
        }

    except Exception as error:
        print("OCR Error:", error)

        return {
            "message": (
                "Invoice uploaded successfully, "
                "but OCR processing failed"
            ),
            "filename": file.filename,
            "extracted_data": None,
        }


# =========================================================
# CREATE PURCHASE INVOICE
# =========================================================

@router.post("/purchase-invoices")
def create_purchase_invoice(
    invoice: PurchaseInvoiceCreate,
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    invoice_data = invoice.model_dump()
    invoice_data["recordType"] = "purchase"
    invoice_data["companyId"] = company_id

    result = invoices_collection.insert_one(
        invoice_data
    )

    return {
        "message": "Purchase invoice saved successfully",
        "invoice_id": str(result.inserted_id),
        "invoice_number": invoice.invoiceNumber,
        "grand_total": invoice.totals.grandTotal,
    }


# =========================================================
# CREATE SALES INVOICE
# =========================================================

@router.post("/invoices")
def create_invoice(
    invoice: InvoiceCreate,
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    invoice_data = invoice.model_dump()
    invoice_data["recordType"] = "sales"
    invoice_data["companyId"] = company_id

    result = invoices_collection.insert_one(
        invoice_data
    )

    return {
        "message": "Invoice saved successfully",
        "invoice_id": str(result.inserted_id),
        "invoice_number": invoice.invoiceNumber,
        "grand_total": invoice.totals.grandTotal,
    }


# =========================================================
# GET COMPANY-SPECIFIC INVOICES
# =========================================================

@router.get("/invoices")
def get_invoices(
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    invoices = list(
        invoices_collection.find({
            "recordType": {
                "$in": ["sales", "purchase"]
            },
            "companyId": company_id,
        })
    )

    for invoice in invoices:
        invoice["_id"] = str(invoice["_id"])

    return invoices


# =========================================================
# GET SINGLE COMPANY-SPECIFIC INVOICE
# =========================================================

@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: str,
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID",
        )

    invoice = invoices_collection.find_one({
        "_id": ObjectId(invoice_id),
        "companyId": company_id,
        "recordType": {
            "$in": ["sales", "purchase"]
        },
    })

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    invoice["_id"] = str(invoice["_id"])

    return invoice


# =========================================================
# UPDATE INVOICE PAYMENT
# =========================================================

@router.patch("/invoices/{invoice_id}/payment")
def update_invoice_payment(
    invoice_id: str,
    payment: Payment,
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID",
        )

    invoice = invoices_collection.find_one({
        "_id": ObjectId(invoice_id),
        "companyId": company_id,
        "recordType": {
            "$in": ["sales", "purchase"]
        },
    })

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    payment_data = payment.model_dump()

    if invoice.get("recordType") == "purchase":
        invoices_collection.update_one(
            {
                "_id": ObjectId(invoice_id),
                "companyId": company_id,
                "recordType": "purchase",
            },
            {
                "$set": {
                    "paymentMode": payment.mode,
                    "payment": payment_data,
                }
            },
        )

        return {
            "message": (
                "Purchase payment details updated successfully"
            ),
            "invoice_id": invoice_id,
        }

    invoices_collection.update_one(
        {
            "_id": ObjectId(invoice_id),
            "companyId": company_id,
            "recordType": "sales",
        },
        {
            "$set": {
                "payment": payment_data,
            }
        },
    )

    return {
        "message": "Payment details updated successfully",
        "invoice_id": invoice_id,
    }


# =========================================================
# DELETE COMPANY-SPECIFIC INVOICE
# =========================================================

@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    company: dict = Depends(get_current_company),
):
    company_id = company["_id"]

    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID",
        )

    result = invoices_collection.delete_one({
        "_id": ObjectId(invoice_id),
        "companyId": company_id,
        "recordType": {
            "$in": ["sales", "purchase"]
        },
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return {
        "message": "Invoice deleted successfully",
        "invoice_id": invoice_id,
    }
