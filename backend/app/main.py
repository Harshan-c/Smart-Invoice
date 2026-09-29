import os
from bson import ObjectId
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import (
    database,
    invoices_collection
)
from app.schemas.invoice import InvoiceCreate, Payment
from app.ocr.paddle_ocr import extract_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "SmartInvoice API is running"
    }


@app.get("/api/message")
def message():
    return {
        "message": "Hello from SmartInvoice Backend"
    }


@app.get("/api/database-test")
def database_test():
    database.command("ping")

    return {
        "message": "MongoDB connection successful"
    }


@app.post("/api/invoices/upload")
async def upload_invoice(file: UploadFile = File(...)):

    upload_folder = "../data/invoices"

    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(
        upload_folder,
        file.filename
    )

    file_content = await file.read()

    with open(file_path, "wb") as saved_file:
        saved_file.write(file_content)

    try:

        ocr_result = extract_text(file_path)

        invoice_data = {
            "invoice_number": None,
            "invoice_date": None,
            "gstin": None,
            "payment_mode": None,
            "vendor": None
        }

        from app.services.invoice_extractor import (
            extract_invoice_fields
        )

        invoice_data = extract_invoice_fields(
            ocr_result
        )

        return {
            "message": "Invoice uploaded and OCR processed successfully",
            "filename": file.filename,
            "extracted_data": invoice_data
        }

    except Exception as error:

        print("OCR Error:", error)

        return {
            "message": "Invoice uploaded successfully, but OCR processing failed",
            "filename": file.filename,
            "extracted_data": None
        }


@app.post("/api/invoices")
def create_invoice(invoice: InvoiceCreate):

    invoice_data = invoice.model_dump()

    result = invoices_collection.insert_one(
        invoice_data
    )

    return {
        "message": "Invoice saved successfully",
        "invoice_id": str(result.inserted_id),
        "invoice_number": invoice.invoiceNumber,
        "grand_total": invoice.totals.grandTotal
    }


@app.get("/api/invoices")
def get_invoices():

    invoices = list(
        invoices_collection.find(
            {},
            {
                "_id": 1,
                "invoiceNumber": 1,
                "invoiceDate": 1,
                "customer": 1,
                "payment": 1,
                "totals": 1
            }
        )
    )

    for invoice in invoices:
        invoice["_id"] = str(
            invoice["_id"]
        )

    return invoices

@app.get("/api/invoices/{invoice_id}")
def get_invoice(invoice_id: str):

    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID"
        )

    invoice = invoices_collection.find_one(
        {
            "_id": ObjectId(invoice_id)
        }
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    invoice["_id"] = str(invoice["_id"])

    return invoice

@app.patch("/api/invoices/{invoice_id}/payment")
def update_invoice_payment(
    invoice_id: str,
    payment: Payment
):

    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID"
        )

    result = invoices_collection.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "payment": payment.model_dump()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    return {
        "message": "Payment details updated successfully",
        "invoice_id": invoice_id
    }

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: str):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid invoice ID"
        )

    result = invoices_collection.delete_one(
        {"_id": ObjectId(invoice_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    return {
        "message": "Invoice deleted successfully",
        "invoice_id": invoice_id
    }