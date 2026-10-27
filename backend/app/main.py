
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import (
    database,
    ensure_invoice_indexes,
)

from app.routes.invoices import router as invoices_router
from app.routes.vendors import router as vendors_router
from app.routes.dashboard import router as dashboard_router
from app.routes.companies import router as companies_router
from app.routes.forecasting import router as forecasting_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the invoice uniqueness index at startup.
    ensure_invoice_indexes()
    yield


app = FastAPI(
    title="SmartInvoice API",
    description="SmartInvoice backend API",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(invoices_router)
app.include_router(vendors_router)
app.include_router(dashboard_router)
app.include_router(companies_router)
app.include_router(forecasting_router)


# =========================================================
# BASIC ROUTES
# =========================================================

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
