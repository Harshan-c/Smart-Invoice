
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_FILE = PROJECT_ROOT / "data" / "forecasting" / "online_retail.xlsx"


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")

    workbook = pd.ExcelFile(DATA_FILE)
    print("Workbook sheets:", workbook.sheet_names)

    for sheet in workbook.sheet_names:
        preview = pd.read_excel(DATA_FILE, sheet_name=sheet, nrows=5)
        print(f"\nSheet: {sheet}")
        print("Columns:", preview.columns.tolist())
        print("Preview rows:", len(preview))


if __name__ == "__main__":
    main()
