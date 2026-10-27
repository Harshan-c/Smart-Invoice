
from typing import List
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ALLOWED_GST_RATES = {0, 5, 12, 18, 28}


class Company(BaseModel):
    name: str = Field(min_length=1)
    address: str
    phone: str
    email: str
    gstin: str
    pan: str
    state: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if not value.strip():
            raise ValueError("Company name is required")
        return value.strip()


class Customer(BaseModel):
    name: str = Field(min_length=1)
    address: str
    phone: str
    email: str
    gstin: str
    pan: str
    state: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value):
        if not value.strip():
            raise ValueError("Customer name is required")
        return value.strip()


class InvoiceItem(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    productName: str = Field(min_length=1)
    hsnSac: str

    quantity: float = Field(gt=0)
    unit: str

    rate: float = Field(ge=0)
    discount: float = Field(ge=0)
    gstRate: float

    grossAmount: float = Field(ge=0)
    taxableAmount: float = Field(ge=0)
    gstAmount: float = Field(ge=0)
    total: float = Field(ge=0)

    @field_validator("productName")
    @classmethod
    def validate_product_name(cls, value):
        if not value.strip():
            raise ValueError("Product or service name is required")
        return value.strip()

    @field_validator("gstRate")
    @classmethod
    def validate_gst_rate(cls, value):
        if value not in ALLOWED_GST_RATES:
            raise ValueError(
                "GST rate must be one of 0, 5, 12, 18, or 28"
            )
        return value

    @model_validator(mode="after")
    def validate_amounts(self):
        expected_gross = self.quantity * self.rate

        if self.discount > expected_gross:
            raise ValueError(
                "Discount cannot exceed the item's gross amount"
            )

        expected_taxable = expected_gross - self.discount

        if abs(self.grossAmount - expected_gross) > 0.02:
            raise ValueError("Gross amount does not match quantity × rate")

        if abs(self.taxableAmount - expected_taxable) > 0.02:
            raise ValueError(
                "Taxable amount does not match gross amount minus discount"
            )

        expected_gst = expected_taxable * self.gstRate / 100

        if abs(self.gstAmount - expected_gst) > 0.02:
            raise ValueError("GST amount does not match taxable amount and GST rate")

        if abs(self.total - (expected_taxable + expected_gst)) > 0.02:
            raise ValueError("Item total does not match taxable amount plus GST")

        return self


class Payment(BaseModel):
    mode: str = Field(min_length=1)
    status: str = "Pending"
    referenceNumber: str = ""
    amountPaid: float | None = Field(default=None, ge=0)


class InvoiceTotals(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    subtotal: float = Field(ge=0)
    discount: float = Field(ge=0)
    taxableAmount: float = Field(ge=0)

    cgst: float = Field(ge=0)
    sgst: float = Field(ge=0)
    igst: float = Field(ge=0)

    totalGST: float = Field(ge=0)
    grandTotal: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    invoiceNumber: str = Field(min_length=1)
    invoiceDate: str = Field(min_length=1)
    dueDate: str
    orderNumber: str
    orderDate: str

    company: Company
    customer: Customer

    items: List[InvoiceItem] = Field(min_length=1)

    payment: Payment
    totals: InvoiceTotals

    @field_validator("invoiceNumber", "invoiceDate")
    @classmethod
    def validate_required_text(cls, value):
        if not value.strip():
            raise ValueError("This field cannot be empty")
        return value.strip()

    @model_validator(mode="after")
    def validate_invoice_totals(self):
        item_subtotal = sum(item.grossAmount for item in self.items)
        item_discount = sum(item.discount for item in self.items)
        item_taxable = sum(item.taxableAmount for item in self.items)
        item_gst = sum(item.gstAmount for item in self.items)
        item_total = sum(item.total for item in self.items)

        checks = [
            ("Subtotal", self.totals.subtotal, item_subtotal),
            ("Discount", self.totals.discount, item_discount),
            ("Taxable amount", self.totals.taxableAmount, item_taxable),
            ("Total GST", self.totals.totalGST, item_gst),
            ("Grand total", self.totals.grandTotal, item_total),
        ]

        for label, actual, expected in checks:
            if abs(actual - expected) > 0.05:
                raise ValueError(
                    f"{label} does not match the invoice item totals"
                )

        if abs(
            self.totals.cgst + self.totals.sgst + self.totals.igst
            - self.totals.totalGST
        ) > 0.05:
            raise ValueError(
                "CGST + SGST + IGST must equal total GST"
            )

        return self
