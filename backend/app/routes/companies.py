
import hashlib
import secrets

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Header

from app.database.connection import invoices_collection
from app.schemas.company import CompanyProfileCreate, CompanyLogin
from app.routes.auth import create_access_token, get_current_company


router = APIRouter(
    prefix="/api/company",
    tags=["Company"]
)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )

    return f"{salt}${password_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, stored_password_hash = stored_hash.split("$")

        password_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        )

        return secrets.compare_digest(
            password_hash.hex(),
            stored_password_hash
        )

    except (ValueError, AttributeError):
        return False


@router.post("/profile")
def create_company_profile(profile: CompanyProfileCreate):
    existing_profile = invoices_collection.find_one({
        "recordType": "company_profile",
        "email": profile.email.strip().lower()
    })

    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="A company with this email already exists"
        )

    profile_data = profile.model_dump()

    password = profile_data.pop("password")
    profile_data["passwordHash"] = hash_password(password)
    profile_data["recordType"] = "company_profile"

    result = invoices_collection.insert_one(profile_data)

    return {
        "message": "Company profile created successfully",
        "company_id": str(result.inserted_id)
    }


@router.get("/profile")
def get_company_profile(
    company: dict = Depends(get_current_company)
):
    company_id = company["_id"]

    profile = invoices_collection.find_one(
        {
            "_id": ObjectId(company_id),
            "recordType": "company_profile"
        },
        {
            "passwordHash": 0,
            "password": 0
        }
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Company profile not found"
        )

    profile["_id"] = str(profile["_id"])

    return profile


@router.put("/profile")
def update_company_profile(
    profile: CompanyProfileCreate,
    company: dict = Depends(get_current_company)
):
    company_id = company["_id"]

    existing_profile = invoices_collection.find_one(
        {
            "_id": ObjectId(company_id),
            "recordType": "company_profile"
        }
    )

    if existing_profile is None:
        raise HTTPException(
            status_code=404,
            detail="Company profile not found"
        )

    profile_data = profile.model_dump()

    # Never store a plain-text password.
    password = profile_data.pop("password", None)

    if password:
        profile_data["passwordHash"] = hash_password(password)
    else:
        profile_data.pop("passwordHash", None)

    result = invoices_collection.update_one(
        {
            "_id": ObjectId(company_id),
            "recordType": "company_profile"
        },
        {
            "$set": profile_data
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Company profile not found"
        )

    return {
        "message": "Company profile updated successfully"
    }


@router.post("/login")
def company_login(login: CompanyLogin):
    company = invoices_collection.find_one({
        "recordType": "company_profile",
        "email": login.email.strip().lower()
    })

    if company is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    stored_hash = company.get("passwordHash")

    if not stored_hash or not verify_password(
        login.password,
        stored_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    company_id = str(company["_id"])
    access_token = create_access_token(company_id)

    return {
        "message": "Login successful",
        "accessToken": access_token,
        "tokenType": "bearer",
        "company": {
            "id": company_id,
            "companyName": company.get("companyName", ""),
            "email": company.get("email", ""),
            "phone": company.get("phone", ""),
            "address": company.get("address", ""),
            "logo": company.get("logo")
        }
    }
