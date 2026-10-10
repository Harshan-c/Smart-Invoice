from typing import Optional
from pydantic import BaseModel


class CompanyProfileCreate(BaseModel):
    companyName: str
    logo: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    state: Optional[str] = None
    password: str

class CompanyLogin(BaseModel):
    email: str
    password: str