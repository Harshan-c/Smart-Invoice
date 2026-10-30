
from pathlib import Path

import pandas as pd
from datetime import datetime, timezone

import numpy as np
from fastapi import APIRouter, Depends, HTTPException

from app.database.connection import invoices_collection
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

        required_columns = {
            "monthly": {"Month", "Sales"},
            "forecast": {"Month", "SelectedModel", "ActualSales", "PredictedSales", "AbsoluteError"},
            "backtest": {"Model", "AbsoluteError"},
        }
        for label, frame, required in (
            ("monthly", monthly_df, required_columns["monthly"]),
            ("forecast", forecast_df, required_columns["forecast"]),
            ("backtest", backtest_df, required_columns["backtest"]),
        ):
            missing = required.difference(frame.columns)
            if missing:
                raise ValueError(f"{label} forecasting file is missing columns: {sorted(missing)}")

        for label, frame, columns in (
            ("monthly", monthly_df, ["Sales"]),
            ("forecast", forecast_df, ["ActualSales", "PredictedSales", "AbsoluteError"]),
            ("backtest", backtest_df, ["AbsoluteError"]),
        ):
            for column in columns:
                frame[column] = pd.to_numeric(frame[column], errors="coerce")
                if frame[column].isna().any() or not np.isfinite(frame[column].to_numpy(dtype=float)).all():
                    raise ValueError(f"{label} forecasting file contains invalid numeric values in {column}.")

        if monthly_df["Month"].isna().any() or forecast_df["Month"].isna().any():
            raise ValueError("Forecasting files contain invalid month values.")
        if (monthly_df["Sales"] < 0).any() or (forecast_df[["ActualSales", "PredictedSales", "AbsoluteError"]] < 0).any().any() or (backtest_df["AbsoluteError"] < 0).any():
            raise ValueError("Forecasting files contain negative sales or error values.")

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
            sales = monthly_df["Sales"].to_numpy(dtype=float)
            x = np.arange(len(sales), dtype=float)
            slope, intercept = np.polyfit(x, sales, 1)
            next_sales = max(0.0, float(slope * len(sales) + intercept))

        elif selected_model == "moving_average_3":
            next_sales = float(monthly_df["Sales"].tail(3).mean())

        elif selected_model == "seasonal_average":
            same_month = monthly_df.loc[
                monthly_df["Month"].dt.month == next_month.month, "Sales"
            ]
            next_sales = float(same_month.mean()) if not same_month.empty else float(monthly_df["Sales"].mean())

        elif selected_model == "seasonal_trend_regression":
            sales = monthly_df["Sales"].to_numpy(dtype=float)
            month_numbers = monthly_df["Month"].dt.month.to_numpy(dtype=int)
            month_effects = {
                m: float(np.mean(sales[month_numbers == m]))
                for m in range(1, 13) if np.any(month_numbers == m)
            }
            seasonal_center = float(np.mean(list(month_effects.values())))
            deseasonalized = np.asarray([
                value - (month_effects[m] - seasonal_center)
                for value, m in zip(sales, month_numbers)
            ], dtype=float)
            slope, intercept = np.polyfit(
                np.arange(len(deseasonalized), dtype=float), deseasonalized, 1
            )
            next_sales = max(0.0, float(
                slope * len(sales) + intercept
                + month_effects.get(next_month.month, seasonal_center)
                - seasonal_center
            ))

        else:
            raise ValueError("Unknown selected forecasting model.")

        metrics = [
            {
                "model": str(model),
                "meanAbsoluteError": round(float(score), 2),
            }
            for model, score in model_mae.sort_values().items()
        ]

        dataset_through_month = monthly_df["Month"].max()
        forecast_month_text = next_month.strftime("%Y-%m")
        dataset_through_text = dataset_through_month.strftime("%Y-%m")
        # This is a fixed research estimate from the last available synthetic
        # dataset month. Do not describe it as a live/current business forecast.
        current_month = pd.Timestamp.now().to_period("M").to_timestamp()
        forecast_status = (
            "historical_research_estimate"
            if next_month <= current_month
            else "future_research_estimate"
        )

        holdout_mae_by_model = []
        for column in forecast_df.columns:
            if column.endswith("_Prediction"):
                model_name = column.removesuffix("_Prediction")
                prediction_values = pd.to_numeric(forecast_df[column], errors="coerce")
                if prediction_values.isna().any() or not np.isfinite(prediction_values.to_numpy(dtype=float)).all():
                    raise ValueError(f"forecast file contains invalid predictions in {column}.")
                holdout_mae_by_model.append({
                    "model": model_name,
                    "meanAbsoluteError": round(
                        float(np.mean(np.abs(forecast_df["ActualSales"].to_numpy(dtype=float) - prediction_values.to_numpy(dtype=float)))),
                        2,
                    ),
                })
        holdout_mae_by_model.sort(key=lambda item: item["meanAbsoluteError"])

        return {
            "source": "Synthetic Indian invoice dataset (simulated; not real business data)",
            "forecastType": "static_research_estimate",
            "forecastStatus": forecast_status,
            "datasetThroughMonth": dataset_through_text,
            "forecastMonth": forecast_month_text,
            "selectedModel": selected_model,
            "nextMonthSalesEstimate": round(next_sales, 2),
            "currencyNote": (
                "Synthetic Indian invoice data. Values are in INR and represent taxable sales before GST; "
                "patterns are simulated and do not establish real-market forecast accuracy. "
                "This is a static one-month-ahead research estimate based on data through "
                f"{dataset_through_text}, separate from your company's actual MongoDB invoices. "
                "If the forecast month has already started or ended, this remains a historical research estimate, not a live forecast."
            ),
            "rollingValidationMethod": "expanding_window_rolling_validation_on_development_data",
            "rollingValidationMetrics": metrics,
            "finalHoldoutPeriod": (
                f"{forecast_df['Month'].min().strftime('%Y-%m')} to "
                f"{forecast_df['Month'].max().strftime('%Y-%m')}"
            ),
            "finalHoldoutMetrics": holdout_mae_by_model,
            "metrics": metrics,
            "history": historical,
            "holdout": holdout,
        }

    except (ValueError, KeyError, TypeError, OSError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load forecasting results: {exc}",
        ) from exc


def _forecast_evaluations_collection():
    """Return the dedicated collection used only for forecast evaluation snapshots."""
    return invoices_collection.database["company_forecast_evaluations"]


def _business_month_start(value):
    """Parse an invoice date and normalize it to a month start, or return None."""
    parsed = pd.to_datetime(value, errors="coerce", utc=True)
    if pd.isna(parsed):
        return None
    # Invoice dates are calendar dates, not instants; normalize using their written
    # date so an ISO date cannot shift to the previous month due to timezone offsets.
    try:
        text = str(value).strip()
        if len(text) >= 7 and text[4] == "-":
            year, month = int(text[:4]), int(text[5:7])
            if 1 <= month <= 12:
                return pd.Timestamp(year=year, month=month, day=1)
    except (TypeError, ValueError):
        pass
    return parsed.tz_convert(None).to_period("M").to_timestamp()


def _get_company_monthly_sales(company_id):
    """Return monthly grand totals from this company's real sales invoices."""
    invoices = list(
        invoices_collection.find(
            {"companyId": company_id, "recordType": "sales"},
            {"_id": 0, "invoiceDate": 1, "totals.grandTotal": 1},
        )
    )
    monthly_totals = {}
    for invoice in invoices:
        month = _business_month_start(invoice.get("invoiceDate"))
        if month is None:
            continue
        totals = invoice.get("totals") or {}
        try:
            amount = float(totals.get("grandTotal"))
        except (TypeError, ValueError):
            continue
        if not np.isfinite(amount) or amount < 0:
            continue
        monthly_totals[month] = monthly_totals.get(month, 0.0) + amount
    return invoices, monthly_totals


def _company_current_month_start():
    """Use the business timezone for month boundaries (SmartInvoice targets India)."""
    from zoneinfo import ZoneInfo

    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    return pd.Timestamp(year=now.year, month=now.month, day=1)


@router.get("/company")
def get_company_forecast(
    company: dict = Depends(get_current_company),
):
    """Forecast the current calendar month's total using completed months only."""
    if not company:
        raise HTTPException(status_code=401, detail="Authentication required.")

    company_id = company["_id"]

    try:
        invoices, all_monthly_totals = _get_company_monthly_sales(company_id)
        current_month = _company_current_month_start()

        # Never treat the current partial month as a complete training observation.
        monthly_totals = {
            month: total for month, total in all_monthly_totals.items()
            if month < current_month
        }

        if not monthly_totals:
            return {
                "source": "authenticated_company_sales_invoices",
                "salesMeasure": "invoice_grand_total_including_gst",
                "ready": False,
                "message": "No completed-month sales history found yet. Forecasting uses completed calendar months only.",
                "invoiceCount": len(invoices),
                "monthsOfHistory": 0,
                "activeSalesMonths": 0,
                "history": [],
                "forecastMonth": None,
                "nextMonthSalesEstimate": None,
                "selectedModel": None,
                "modelSelectionValidated": False,
                "metrics": [],
                "holdout": [],
            }

        first_month = min(monthly_totals)
        last_month = max(monthly_totals)
        month_index = pd.date_range(first_month, last_month, freq="MS")
        sales = np.array([monthly_totals.get(month, 0.0) for month in month_index], dtype=float)
        active_months = int(np.count_nonzero(sales > 0))
        history = [
            {"month": month.strftime("%Y-%m"), "sales": round(float(value), 2)}
            for month, value in zip(month_index, sales)
        ]

        if len(month_index) < 12 or active_months < 6:
            return {
                "source": "authenticated_company_sales_invoices",
                "salesMeasure": "invoice_grand_total_including_gst",
                "ready": False,
                "message": (
                    "There is not enough completed company sales history for a useful forecast yet. "
                    "Build at least 12 completed calendar months of history with sales in at least "
                    "6 different months. This minimum is not a guarantee of forecast accuracy."
                ),
                "invoiceCount": len(invoices),
                "monthsOfHistory": len(month_index),
                "activeSalesMonths": active_months,
                "history": history,
                "forecastMonth": None,
                "nextMonthSalesEstimate": None,
                "selectedModel": None,
                "modelSelectionValidated": False,
                "metrics": [],
                "holdout": [],
            }

        candidate_names = (
            "historical_mean_baseline", "moving_average_3", "linear_regression", "seasonal_naive"
        )
        candidate_errors = {name: [] for name in candidate_names}
        candidate_holdouts = {name: [] for name in candidate_names}
        min_training_months = 6
        test_months = min(6, max(0, len(sales) - min_training_months))
        backtest_start = len(sales) - test_months
        # Seasonal naive needs a complete year of prior observations. All models
        # are therefore compared on the exact same final target months.
        common_backtest_start = max(backtest_start, 12)

        def predict_model(model_name, training_sales, target_idx):
            if model_name == "historical_mean_baseline":
                return float(np.mean(training_sales))
            if model_name == "moving_average_3":
                return float(np.mean(training_sales[-3:]))
            if model_name == "linear_regression":
                train_x = np.arange(len(training_sales), dtype=float)
                slope, intercept = np.polyfit(train_x, training_sales, 1)
                return max(0.0, float(slope * target_idx + intercept))
            if model_name == "seasonal_naive":
                return float(training_sales[target_idx - 12]) if target_idx >= 12 else None
            return None

        for target_idx in range(common_backtest_start, len(sales)):
            training_sales = sales[:target_idx]
            if len(training_sales) < min_training_months:
                continue
            actual = float(sales[target_idx])
            target_month = month_index[target_idx].strftime("%Y-%m")
            for model_name in candidate_names:
                predicted = predict_model(model_name, training_sales, target_idx)
                if predicted is None or not np.isfinite(predicted):
                    continue
                predicted = max(0.0, float(predicted))
                error = abs(actual - predicted)
                candidate_errors[model_name].append(error)
                candidate_holdouts[model_name].append({
                    "month": target_month,
                    "actualSales": round(actual, 2),
                    "predictedSales": round(predicted, 2),
                    "absoluteError": round(error, 2),
                })

        # Because the evaluation window is shared, each candidate should have
        # the same number of errors. Require three shared test months to select.
        model_mae = {
            name: float(np.mean(errors))
            for name, errors in candidate_errors.items()
            if len(errors) >= 3
        }
        selection_is_validated = bool(model_mae)
        selected_model = min(model_mae, key=model_mae.get) if selection_is_validated else "linear_regression"

        next_idx = len(sales)
        if selected_model == "historical_mean_baseline":
            next_sales = float(np.mean(sales))
        elif selected_model == "moving_average_3":
            next_sales = float(np.mean(sales[-3:]))
        elif selected_model == "seasonal_naive":
            next_sales = float(sales[-12])
        else:
            x = np.arange(len(sales), dtype=float)
            slope, intercept = np.polyfit(x, sales, 1)
            next_sales = max(0.0, float(slope * next_idx + intercept))

        # The forecast target is the current calendar month; its partial invoices
        # are excluded from training and become actuals only after the month ends.
        forecast_month_text = current_month.strftime("%Y-%m")
        metrics = [
            {
                "model": name,
                "meanAbsoluteError": round(model_mae[name], 2),
                "backtestMonths": len(candidate_errors[name]),
            }
            for name in sorted(model_mae, key=model_mae.get)
        ]
        holdout = candidate_holdouts.get(selected_model, [])

        evaluations = _forecast_evaluations_collection()
        evaluations.update_one(
            {"companyId": company_id, "forecastMonth": forecast_month_text},
            {"$setOnInsert": {
                "companyId": company_id,
                "forecastMonth": forecast_month_text,
                "forecastCreatedAt": datetime.now(timezone.utc),
                "predictedSales": round(max(0.0, float(next_sales)), 2),
                "selectedModel": selected_model,
                "modelSelectionValidated": selection_is_validated,
                "monthsOfHistory": int(len(month_index)),
                "activeSalesMonths": active_months,
                "backtestMethod": "expanding_window_shared_test_months",
                "backtestMonthsCompared": len(next(iter(candidate_errors.values()))) if candidate_errors else 0,
            }},
            upsert=True,
        )

        return {
            "source": "authenticated_company_sales_invoices",
            "salesMeasure": "invoice_grand_total_including_gst",
            "ready": True,
            "message": (
                "Estimate for the current calendar month's total, trained only on completed months. "
                + (
                    "The selected model had the lowest MAE among candidates evaluated on the same backtest months; "
                    "past test performance does not guarantee future accuracy."
                    if selection_is_validated else
                    "Model selection is provisional because there are not yet three shared backtest months."
                )
            ),
            "invoiceCount": len(invoices),
            "monthsOfHistory": len(month_index),
            "activeSalesMonths": active_months,
            "history": history,
            "forecastMonth": forecast_month_text,
            "nextMonthSalesEstimate": round(max(0.0, next_sales), 2),
            "selectedModel": selected_model,
            "modelSelectionValidated": selection_is_validated,
            "backtestMethod": "expanding_window_shared_test_months",
            "backtestMonthsCompared": len(next(iter(candidate_errors.values()))) if candidate_errors else 0,
            "metrics": metrics,
            "holdout": holdout,
            "evaluationTracking": "The first forecast for this company and forecast month is saved for later actual-sales evaluation.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to calculate company sales forecast. Check backend logs for details.",
        ) from exc


@router.get("/company/evaluations")
def get_company_forecast_evaluations(
    company: dict = Depends(get_current_company),
):
    """List saved forecasts and reconcile completed forecast months to real sales."""
    if not company:
        raise HTTPException(status_code=401, detail="Authentication required.")

    company_id = company["_id"]
    try:
        _, monthly_sales = _get_company_monthly_sales(company_id)
        evaluations = _forecast_evaluations_collection()
        current_month = _company_current_month_start().strftime("%Y-%m")

        pending = list(evaluations.find({
            "companyId": company_id,
            "forecastMonth": {"$lt": current_month},
            "actualSales": {"$exists": False},
        }))
        for record in pending:
            try:
                month = pd.Period(record["forecastMonth"], freq="M").to_timestamp()
                actual = round(float(monthly_sales.get(month, 0.0)), 2)
                predicted = float(record["predictedSales"])
                if not np.isfinite(actual) or not np.isfinite(predicted):
                    continue
            except (KeyError, TypeError, ValueError):
                continue
            evaluations.update_one(
                {"_id": record["_id"], "companyId": company_id, "actualSales": {"$exists": False}},
                {"$set": {
                    "actualSales": actual,
                    "absoluteError": round(abs(actual - predicted), 2),
                    "evaluatedAt": datetime.now(timezone.utc),
                }},
            )

        records = list(evaluations.find(
            {"companyId": company_id},
            {"_id": 0, "companyId": 0},
        ).sort("forecastMonth", -1).limit(60))
        results = []
        for record in records:
            for key in ("forecastCreatedAt", "evaluatedAt"):
                if isinstance(record.get(key), datetime):
                    record[key] = record[key].isoformat()
            results.append(record)

        evaluated = [r for r in results if r.get("absoluteError") is not None]
        overall_mae = (
            round(sum(float(r["absoluteError"]) for r in evaluated) / len(evaluated), 2)
            if evaluated else None
        )
        return {
            "source": "authenticated_company_sales_invoices",
            "salesMeasure": "invoice_grand_total_including_gst",
            "evaluations": results,
            "evaluatedForecastCount": len(evaluated),
            "realWorldMeanAbsoluteError": overall_mae,
            "note": (
                "Actual sales are attached only after the forecast month has ended. "
                "Actuals use this company's sales invoice grand totals including GST. "
                "Months with no qualifying sales invoices are treated as zero sales. "
                "Only forecasts saved by this endpoint are evaluated."
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unable to load company forecast evaluations. Check backend logs for details.",
        ) from exc
