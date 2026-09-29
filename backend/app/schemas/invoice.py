from typing import List, Optional

from pydantic import BaseModel


class Company(BaseModel):
    name: str
    address: str
    phone: str
    email: str
    gstin: str
    pan: str
    state: str


class Customer(BaseModel):
    name: str
    address: str
    phone: str
    email: str
    gstin: str
    pan: str
    state: str


class InvoiceItem(BaseModel):
    productName: str
    hsnSac: str

    quantity: float
    unit: str

    rate: float
    discount: float
    gstRate: float

    grossAmount: float
    taxableAmount: float
    gstAmount: float
    total: float


class Payment(BaseModel):
    mode: str
    status: str
    referenceNumber: str


class InvoiceTotals(BaseModel):
    subtotal: float
    discount: float
    taxableAmount: float

    cgst: float
    sgst: float
    igst: float

    totalGST: float
    grandTotal: float


class InvoiceCreate(BaseModel):
    invoiceNumber: str

    invoiceDate: str
    dueDate: str

    orderNumber: str
    orderDate: str

    company: Company
    customer: Customer

    items: List[InvoiceItem]

    payment: Payment

    totals: InvoiceTotals