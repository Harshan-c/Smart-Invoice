import os
from datetime import date
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
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

    # Normalize initial purchase payment details from the declared status.
    total = round(float(invoice.totals.grandTotal or 0), 2)
    submitted_payment = invoice.payment.model_dump() if invoice.payment else {}
    mode = submitted_payment.get("mode") or invoice.paymentMode or "Cash"
    status = str(submitted_payment.get("status") or "Pending")
    if status not in {"Pending", "Paid", "Partially Paid"}:
        raise HTTPException(status_code=400, detail="Invalid payment status for a new invoice.")

    if status == "Paid":
        amount_paid = total
    elif status == "Pending":
        amount_paid = 0.0
    else:
        try:
            amount_paid = round(float(submitted_payment.get("amountPaid") or 0), 2)
        except (TypeError, ValueError):
            amount_paid = 0.0
        if amount_paid <= 0 or amount_paid >= total:
            raise HTTPException(
                status_code=400,
                detail="For a partially paid invoice, amount paid must be greater than zero and less than the grand total.",
            )

    invoice_data["paymentMode"] = mode
    invoice_data["payment"] = {
        "mode": mode,
        "status": status,
        "referenceNumber": submitted_payment.get("referenceNumber") or "",
        "amountPaid": amount_paid,
        "balanceDue": round(total - amount_paid, 2),
    }

    try:
        result = invoices_collection.insert_one(invoice_data)

    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail=(
                "A purchase invoice with this number already exists "
                "for your company."
            ),
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

    # Derive amount paid and balance due from the initial payment status.
    total = round(float(invoice.totals.grandTotal or 0), 2)
    submitted_payment = invoice.payment.model_dump()
    status = str(submitted_payment.get("status") or "Pending")
    if status not in {"Pending", "Paid", "Partially Paid"}:
        raise HTTPException(status_code=400, detail="Invalid payment status for a new invoice.")

    if status == "Paid":
        amount_paid = total
    elif status == "Pending":
        amount_paid = 0.0
    else:
        try:
            amount_paid = round(float(submitted_payment.get("amountPaid") or 0), 2)
        except (TypeError, ValueError):
            amount_paid = 0.0
        if amount_paid <= 0 or amount_paid >= total:
            raise HTTPException(
                status_code=400,
                detail="For a partially paid invoice, amount paid must be greater than zero and less than the grand total.",
            )

    invoice_data["payment"]["amountPaid"] = amount_paid
    invoice_data["payment"]["balanceDue"] = round(total - amount_paid, 2)
    invoice_data["payment"]["status"] = status

    try:
        result = invoices_collection.insert_one(invoice_data)

    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail=(
                "An invoice with this number already exists "
                "for your company."
            ),
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
        "recordType": {"$in": ["sales", "purchase"]},
    })

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    # Obtain the original invoice amount.
    total = round(
        float(invoice.get("totals", {}).get("grandTotal", 0) or 0),
        2,
    )

    existing_payment = invoice.get("payment") or {}

    # Support older invoices and older frontend requests.
    if payment.amountPaid is not None:
        amount_paid = round(float(payment.amountPaid), 2)
    elif str(payment.status).lower() == "paid":
        amount_paid = total
    else:
        amount_paid = round(
            float(existing_payment.get("amountPaid", 0) or 0),
            2,
        )

    if amount_paid < 0:
        raise HTTPException(
            status_code=400,
            detail="Amount paid cannot be negative.",
        )

    if amount_paid > total:
        raise HTTPException(
            status_code=400,
            detail="Amount paid cannot exceed the invoice total.",
        )

    balance_due = round(total - amount_paid, 2)

    # Determine whether the invoice is overdue.
    due_date_value = invoice.get("dueDate")
    is_overdue = False

    if due_date_value:
        try:
            due_date = date.fromisoformat(str(due_date_value)[:10])
            is_overdue = due_date < date.today()
        except (ValueError, TypeError):
            is_overdue = False

    # Derive the status from the actual payment amount and due date.
    if balance_due <= 0:
        status = "Paid"
    elif is_overdue:
        status = "Overdue"
    elif amount_paid > 0:
        status = "Partially Paid"
    else:
        status = "Pending"

    payment_data = payment.model_dump()
    payment_data["amountPaid"] = amount_paid
    payment_data["balanceDue"] = balance_due
    payment_data["status"] = status

    update_fields = {
        "payment": payment_data,
    }

    if invoice.get("recordType") == "purchase":
        update_fields["paymentMode"] = payment.mode

    result = invoices_collection.update_one(
        {
            "_id": ObjectId(invoice_id),
            "companyId": company_id,
            "recordType": invoice.get("recordType"),
        },
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    return {
        "message": "Payment details updated successfully.",
        "invoice_id": invoice_id,
        "totalAmount": total,
        "amountPaid": amount_paid,
        "balanceDue": balance_due,
        "status": status,
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
