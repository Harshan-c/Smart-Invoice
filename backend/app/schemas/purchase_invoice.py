from typing import List, Optional
from pydantic import BaseModel


class PurchaseVendor(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    state: Optional[str] = None


class PurchaseItem(BaseModel):
    serialNumber: Optional[str] = None
    productName: Optional[str] = None
    hsnSac: Optional[str] = None
    mrp: Optional[str] = None
    rate: Optional[str] = None
    quantity: Optional[str] = None
    ctUn: Optional[str] = None
    taxableAmount: Optional[str] = None


class PurchaseTotals(BaseModel):
    grandTotal: Optional[float] = None


class PurchaseInvoiceCreate(BaseModel):
    invoiceType: str = "purchase"
    invoiceNumber: Optional[str] = None
    invoiceDate: Optional[str] = None
    orderNumber: Optional[str] = None
    orderDate: Optional[str] = None
    vendor: PurchaseVendor
    paymentMode: Optional[str] = None
    items: List[PurchaseItem] = []
    totals: PurchaseTotals