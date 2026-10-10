
import os
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.database.connection import invoices_collection


load_dotenv()

SECRET_KEY = os.getenv("SMARTINVOICE_SECRET_KEY")

if not SECRET_KEY or SECRET_KEY == "replace_with_a_secure_random_secret":
    raise RuntimeError(
        "Set a secure SMARTINVOICE_SECRET_KEY in backend/.env"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(company_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": company_id,
        "exp": expires,
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_company(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    )
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        company_id = payload.get("sub")

        if not company_id or not ObjectId.is_valid(company_id):
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    company = invoices_collection.find_one(
        {
            "_id": ObjectId(company_id),
            "recordType": "company_profile",
        },
        {
            "password": 0,
            "passwordHash": 0,
        },
    )

    if company is None:
        raise HTTPException(
            status_code=401,
            detail="Company account not found",
        )

    company["_id"] = str(company["_id"])
    return company
