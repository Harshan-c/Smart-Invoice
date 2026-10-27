
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from app.routes.auth import get_current_company


router = APIRouter(
    prefix="/api/forecasting",
    tags=["Forecasting"],
)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data" / "processed"

MONTHLY_FILE = DATA_DIR / "monthly_sales.csv"
FORECAST_FILE = DATA_DIR / "sales_forecast.csv"
BACKTEST_FILE = DATA_DIR / "sales_backtest.csv"


@router.get("")
def get_forecast(
    company: dict = Depends(get_current_company),
):
    # Authentication is required, consistent with the dashboard.
    if not company:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    required_files = [MONTHLY_FILE, FORECAST_FILE, BACKTEST_FILE]

    missing_files = [
        str(file) for file in required_files if not file.exists()
    ]

    if missing_files:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Forecast files are not available. Run the forecasting training script first.",
                "missingFiles": missing_files,
            },
        )

    try:
        monthly_df = pd.read_csv(
            MONTHLY_FILE,
            parse_dates=["Month"],
        )

        forecast_df = pd.read_csv(
            FORECAST_FILE,
            parse_dates=["Month"],
        )

        backtest_df = pd.read_csv(BACKTEST_FILE)

        if monthly_df.empty or forecast_df.empty or backtest_df.empty:
            raise ValueError("One or more forecasting files are empty.")

        selected_model = str(forecast_df["SelectedModel"].iloc[0])
        next_month = (
            monthly_df["Month"].max() + pd.DateOffset(months=1)
        )

        # The selected method's rolling mean MAE.
        model_mae = (
            backtest_df.groupby("Model")["AbsoluteError"]
            .mean()
            if "AbsoluteError" in backtest_df.columns
            else None
        )

        if model_mae is None:
            raise ValueError("Backtest error metrics are missing.")

        if selected_model not in model_mae.index:
            raise ValueError("Selected model is missing from backtest data.")

        historical = [
            {
                "month": row["Month"].strftime("%Y-%m"),
                "sales": round(float(row["Sales"]), 2),
            }
            for _, row in monthly_df.iterrows()
        ]

        holdout = [
            {
                "month": row["Month"].strftime("%Y-%m"),
                "actualSales": round(float(row["ActualSales"]), 2),
                "predictedSales": round(float(row["PredictedSales"]), 2),
                "absoluteError": round(float(row["AbsoluteError"]), 2),
            }
            for _, row in forecast_df.iterrows()
        ]

        # The seasonal-naive next-month estimate uses the same month
        # from the previous year. Regression/mean use the current model
        # outputs; this API derives the estimate from the saved forecast
        # method and history to avoid retraining during a request.
        if selected_model == "seasonal_naive":
            prior_year = next_month - pd.DateOffset(years=1)
            matching = monthly_df.loc[
                monthly_df["Month"] == prior_year, "Sales"
            ]

            if matching.empty:
                raise ValueError(
                    "Previous-year sales are unavailable for the next forecast."
                )

            next_sales = float(matching.iloc[0])

        elif selected_model == "historical_mean_baseline":
            next_sales = float(monthly_df["Sales"].mean())

        elif selected_model == "linear_regression":
            import numpy as np

            sales = monthly_df["Sales"].to_numpy(dtype=float)
            x = np.arange(len(sales), dtype=float)
            slope, intercept = np.polyfit(x, sales, 1)
            next_sales = max(0.0, float(slope * len(sales) + intercept))

        elif selected_model == "moving_average_3":
            # Match train_model.py: average the latest three observed months.
            sales = monthly_df["Sales"].to_numpy(dtype=float)
            next_sales = float(sales[-min(3, len(sales)):].mean())

        elif selected_model == "seasonal_average":
            # Match train_model.py: average observed sales for the forecast
            # calendar month, using all available historical years.
            same_month_history = monthly_df.loc[
                monthly_df["Month"].dt.month == next_month.month, "Sales"
            ].to_numpy(dtype=float)

            if len(same_month_history) == 0:
                next_sales = float(monthly_df["Sales"].mean())
            else:
                next_sales = float(same_month_history.mean())

        else:
            raise ValueError("Unknown selected forecasting model.")

        metrics = [
            {
                "model": str(model),
                "meanAbsoluteError": round(float(score), 2),
            }
            for model, score in model_mae.sort_values().items()
        ]

        return {
            "source": "UCI Online Retail II experimental dataset",
            "forecastMonth": next_month.strftime("%Y-%m"),
            "selectedModel": selected_model,
            "nextMonthSalesEstimate": round(next_sales, 2),
            "currencyNote": (
                "Dataset transaction values are in the source dataset's currency; "
                "they are not verified as INR."
            ),
            "metrics": metrics,
            "history": historical,
            "holdout": holdout,
        }

    except (ValueError, KeyError, TypeError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load forecasting results: {exc}",
        ) from exc
