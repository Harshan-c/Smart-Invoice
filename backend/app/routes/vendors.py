from fastapi import APIRouter
from bson import ObjectId
from app.database.connection import invoices_collection
from app.schemas.vendor import VendorCreate


router = APIRouter(
    prefix="/api/vendors",
    tags=["Vendors"]
)


@router.post("")
def create_vendor(vendor: VendorCreate):
    vendor_data = vendor.model_dump()

    result = invoices_collection.insert_one({
        "recordType": "vendor",
        **vendor_data
    })

    return {
        "message": "Vendor saved successfully",
        "vendor_id": str(result.inserted_id),
        "vendor": vendor_data
    }


@router.get("")
def get_vendors():
    vendors = []

    for vendor in invoices_collection.find(
        {"recordType": "vendor"}
    ):
        vendor["id"] = str(vendor["_id"])
        del vendor["_id"]

        vendors.append(vendor)

    return {
        "vendors": vendors
    }

@router.put("/{vendor_id}")
def update_vendor(vendor_id: str, vendor: VendorCreate):
    vendor_data = vendor.model_dump()

    result = invoices_collection.update_one(
        {
            "_id": ObjectId(vendor_id),
            "recordType": "vendor"
        },
        {
            "$set": vendor_data
        }
    )

    if result.matched_count == 0:
        return {
            "message": "Vendor not found"
        }

    return {
        "message": "Vendor updated successfully",
        "vendor_id": vendor_id,
        "vendor": vendor_data
    }

@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: str):

    result = invoices_collection.delete_one(
        {
            "_id": ObjectId(vendor_id),
            "recordType": "vendor"
        }
    )

    if result.deleted_count == 0:
        return {
            "message": "Vendor not found"
        }

    return {
        "message": "Vendor deleted successfully",
        "vendor_id": vendor_id
    }