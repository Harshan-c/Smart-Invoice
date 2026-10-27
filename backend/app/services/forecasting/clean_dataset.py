
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[4]

DATA_FILE = PROJECT_ROOT / "data" / "forecasting" / "online_retail.xlsx"
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_FILE = OUTPUT_DIR / "online_retail_cleaned.csv"


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load and combine both worksheet periods
    sheets = pd.read_excel(
        DATA_FILE,
        sheet_name=None
    )

    df = pd.concat(
        sheets.values(),
        ignore_index=True
    )

    original_rows = len(df)

    print("Sheets loaded:", list(sheets.keys()))
    print("Original rows across both sheets:", original_rows)

    # Clean column names
    df.columns = df.columns.str.strip()

    # Convert data types
    df["InvoiceDate"] = pd.to_datetime(
        df["InvoiceDate"],
        errors="coerce"
    )

    df["Quantity"] = pd.to_numeric(
        df["Quantity"],
        errors="coerce"
    )

    df["Price"] = pd.to_numeric(
        df["Price"],
        errors="coerce"
    )

    # Remove rows with missing essential values
    df = df.dropna(
        subset=["Invoice", "InvoiceDate", "Quantity", "Price"]
    )

    # Remove cancelled invoices
    cancelled = (
        df["Invoice"]
        .astype(str)
        .str.strip()
        .str.upper()
        .str.startswith("C")
    )
    df = df[~cancelled]

    # Exclude invalid quantities and prices
    df = df[
        (df["Quantity"] > 0) &
        (df["Price"] > 0)
    ].copy()

    # Calculate transaction line value
    df["LineTotal"] = df["Quantity"] * df["Price"]

    # Fill missing product descriptions
    df["Description"] = (
        df["Description"]
        .fillna("Unknown product")
    )

    # Sort chronologically
    df = df.sort_values("InvoiceDate").reset_index(drop=True)

    # Save cleaned dataset
    df.to_csv(OUTPUT_FILE, index=False)

    print("\nCleaning completed successfully.")
    print("Original rows:", original_rows)
    print("Remaining rows:", len(df))
    print("Removed rows:", original_rows - len(df))
    print("Date range:", df["InvoiceDate"].min(), "to", df["InvoiceDate"].max())
    print("Unique invoices:", df["Invoice"].nunique())
    print("Monthly periods:", df["InvoiceDate"].dt.to_period("M").nunique())
    print("Total line value:", round(df["LineTotal"].sum(), 2))
    print("Saved to:", OUTPUT_FILE)


if __name__ == "__main__":
    main()
