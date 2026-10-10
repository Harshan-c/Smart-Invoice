from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.database.connection import invoices_collection
from app.schemas.vendor import VendorCreate
from app.routes.auth import get_current_company



router = APIRouter(
    prefix="/api/vendors",
    tags=["Vendors"]
)

@router.post("")
def create_vendor(
    vendor: VendorCreate,
    company: dict = Depends(get_current_company)
):
    company_id = company["_id"]

    vendor_data = vendor.model_dump()

    result = invoices_collection.insert_one({
        "recordType": "vendor",
        "companyId": company_id,
        **vendor_data
    })

    return {
        "message": "Vendor saved successfully",
        "vendor_id": str(result.inserted_id),
        "vendor": vendor_data
    }


@router.get("")
def get_vendors(
    company: dict = Depends(get_current_company)
):
    company_id = company["_id"]
    vendors = []

    for vendor in invoices_collection.find({
        "recordType": "vendor",
        "companyId": company_id
    }):
        vendor["id"] = str(vendor["_id"])
        del vendor["_id"]
        vendors.append(vendor)

    return {"vendors": vendors}

@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: str,
    vendor: VendorCreate,
    company: dict = Depends(get_current_company)
):
    if not ObjectId.is_valid(vendor_id):
        raise HTTPException(status_code=400, detail="Invalid vendor ID")

    company_id = company["_id"]
    vendor_data = vendor.model_dump()

    result = invoices_collection.update_one(
        {
            "_id": ObjectId(vendor_id),
            "recordType": "vendor",
            "companyId": company_id
        },
        {"$set": vendor_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "message": "Vendor updated successfully",
        "vendor_id": vendor_id,
        "vendor": vendor_data
    }


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: str,
    company: dict = Depends(get_current_company)
):
    if not ObjectId.is_valid(vendor_id):
        raise HTTPException(status_code=400, detail="Invalid vendor ID")

    company_id = company["_id"]

    result = invoices_collection.delete_one({
        "_id": ObjectId(vendor_id),
        "recordType": "vendor",
        "companyId": company_id
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "message": "Vendor deleted successfully",
        "vendor_id": vendor_id
    }