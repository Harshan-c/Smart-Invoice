
from pathlib import Path

import pandas as pd


# Project root: SmartInvoice/
PROJECT_ROOT = Path(__file__).resolve().parents[4]

# Existing data folder outside backend/
DATA_FILE = PROJECT_ROOT / "data"/ "forecasting" / "online_retail.xlsx"


def load_retail_dataset():
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_FILE}\n"
            "Check the filename and extension."
        )

    df = pd.read_excel(DATA_FILE)

    print("\nDataset loaded successfully.")
    print(f"Rows: {len(df):,}")
    print("\nColumn names:")
    print(df.columns.tolist())

    print("\nFirst five rows:")
    print(df.head())

    print("\nMissing values per column:")
    print(df.isnull().sum())

    return df


if __name__ == "__main__":
    load_retail_dataset()
