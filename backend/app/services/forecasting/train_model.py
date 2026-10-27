
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[4]
DATA_FILE = PROJECT_ROOT / "data" / "processed" / "online_retail_cleaned.csv"
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"
MONTHLY_FILE = OUTPUT_DIR / "monthly_sales.csv"
FORECAST_FILE = OUTPUT_DIR / "sales_forecast.csv"
BACKTEST_FILE = OUTPUT_DIR / "sales_backtest.csv"

TEST_SIZE = 3
MIN_TRAIN_MONTHS = 12


def mae(actual, predicted):
    return float(
        np.mean(
            np.abs(
                np.asarray(actual, dtype=float)
                - np.asarray(predicted, dtype=float)
            )
        )
    )


def fit_linear_regression(train_sales, steps):
    x_train = np.arange(len(train_sales), dtype=float)
    y_train = np.asarray(train_sales, dtype=float)

    slope, intercept = np.polyfit(x_train, y_train, 1)
    x_predict = np.asarray(steps, dtype=float)

    return np.maximum(0, slope * x_predict + intercept)


def predict_models(monthly, train_end, test_size=TEST_SIZE):
    """Fit/evaluate models using only data available before the test window."""
    train = monthly.iloc[:train_end]
    test = monthly.iloc[train_end:train_end + test_size]

    if len(test) != test_size:
        raise ValueError("Incomplete test window.")

    train_sales = train["Sales"].to_numpy(dtype=float)
    actual = test["Sales"].to_numpy(dtype=float)

    regression = fit_linear_regression(
        train_sales,
        np.arange(train_end, train_end + test_size, dtype=float),
    )

    mean_baseline = np.full(
        test_size,
        train_sales.mean(),
        dtype=float,
    )

    # Seasonal-naive uses the same calendar month from the previous year.
    sales_by_month = monthly.set_index("Month")["Sales"]
    seasonal = []

    for month in test["Month"]:
        previous_year_month = month - pd.DateOffset(years=1)

        if previous_year_month not in sales_by_month.index:
            raise ValueError(
                f"Missing previous-year value for {month:%Y-%m}."
            )

        seasonal.append(float(sales_by_month.loc[previous_year_month]))

    seasonal = np.asarray(seasonal, dtype=float)

    # Seasonal average: average only the same calendar month values that
    # are present in the training data. This avoids using test-period data.
    seasonal_average = []
    for month in test["Month"]:
        same_month_history = train.loc[
            train["Month"].dt.month == month.month, "Sales"
        ].to_numpy(dtype=float)
        if len(same_month_history) == 0:
            seasonal_average.append(float(train_sales.mean()))
        else:
            seasonal_average.append(float(np.mean(same_month_history)))
    seasonal_average = np.asarray(seasonal_average, dtype=float)

    # Three-month moving-average baseline.
    recent_mean = float(np.mean(train_sales[-min(3, len(train_sales)):]))
    moving_average_3 = np.full(test_size, recent_mean, dtype=float)

    # Seasonal-trend regression: fit a trend to deseasonalized training data.
    train_month_numbers = train["Month"].dt.month.to_numpy(dtype=int)
    month_effects = {
        m: float(np.mean(train_sales[train_month_numbers == m]))
        for m in range(1, 13) if np.any(train_month_numbers == m)
    }
    seasonal_center = float(np.mean(list(month_effects.values())))
    deseasonalized = np.asarray([
        value - (month_effects[m] - seasonal_center)
        for value, m in zip(train_sales, train_month_numbers)
    ], dtype=float)
    trend_slope, trend_intercept = np.polyfit(
        np.arange(len(deseasonalized), dtype=float), deseasonalized, 1
    )
    seasonal_trend = np.asarray([
        max(0.0, float(trend_slope * step + trend_intercept
                       + month_effects.get(month.month, seasonal_center)
                       - seasonal_center))
        for step, month in enumerate(test["Month"], start=train_end)
    ], dtype=float)

    predictions = {
        "linear_regression": regression,
        "historical_mean_baseline": mean_baseline,
        "moving_average_3": moving_average_3,
        "seasonal_average": seasonal_average,
        "seasonal_naive": seasonal,
        "seasonal_trend_regression": seasonal_trend,
    }

    return test, actual, predictions


def main():
    if not DATA_FILE.exists():
        raise FileNotFoundError(
            f"Cleaned dataset not found: {DATA_FILE}. "
            "Run clean_dataset.py first."
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(
        DATA_FILE,
        parse_dates=["InvoiceDate"],
        dtype={"Invoice": "string"},
        low_memory=False,
    )

    df["Month"] = (
        df["InvoiceDate"]
        .dt.to_period("M")
        .dt.to_timestamp()
    )

    monthly = (
        df.groupby("Month", as_index=False)["LineTotal"]
        .sum()
        .rename(columns={"LineTotal": "Sales"})
        .sort_values("Month")
        .reset_index(drop=True)
    )

    monthly = (
        monthly.set_index("Month")
        .asfreq("MS", fill_value=0)
        .rename_axis("Month")
        .reset_index()
    )

    monthly.to_csv(MONTHLY_FILE, index=False)

    if len(monthly) < MIN_TRAIN_MONTHS + TEST_SIZE:
        raise ValueError(
            "Not enough monthly observations for rolling backtesting."
        )

    # Reserve the final TEST_SIZE months as an untouched holdout.
    # Model selection uses rolling backtests only within development data.
    holdout_start = len(monthly) - TEST_SIZE
    development = monthly.iloc[:holdout_start].reset_index(drop=True)

    if len(development) < MIN_TRAIN_MONTHS + TEST_SIZE:
        raise ValueError(
            "Not enough monthly observations for rolling backtesting "
            "and a separate final holdout."
        )

    backtest_rows = []
    window_scores = []

    first_train_end = MIN_TRAIN_MONTHS
    final_development_train_end = len(development) - TEST_SIZE

    for train_end in range(
        first_train_end,
        final_development_train_end + 1,
    ):
        test, actual, predictions = predict_models(
            development,
            train_end,
        )

        window_start = test["Month"].iloc[0]

        for model_name, model_predictions in predictions.items():
            score = mae(actual, model_predictions)

            window_scores.append({
                "WindowStart": window_start,
                "TrainingMonths": train_end,
                "Model": model_name,
                "MAE": score,
            })

            for i, (_, row) in enumerate(test.iterrows()):
                backtest_rows.append({
                    "WindowStart": window_start,
                    "TrainingMonths": train_end,
                    "Month": row["Month"],
                    "Model": model_name,
                    "ActualSales": float(actual[i]),
                    "PredictedSales": float(model_predictions[i]),
                    "AbsoluteError": float(
                        abs(actual[i] - model_predictions[i])
                    ),
                })

    backtest = pd.DataFrame(backtest_rows)
    backtest.to_csv(BACKTEST_FILE, index=False)

    scores = pd.DataFrame(window_scores)

    summary = (
        scores.groupby("Model")["MAE"]
        .agg(["mean", "median", "count"])
        .sort_values("mean")
    )

    # Select using rolling-validation MAE only. When models tie on mean MAE,
    # prefer the simpler seasonal-naive baseline rather than relying on
    # alphabetical ordering or using final-holdout performance to break ties.
    best_mean_mae = float(summary["mean"].min())
    tied_models = set(
        summary.index[
            np.isclose(
                summary["mean"].to_numpy(dtype=float),
                best_mean_mae,
                rtol=1e-10,
                atol=1e-8,
            )
        ].tolist()
    )
    if "seasonal_naive" in tied_models:
        selected_name = "seasonal_naive"
    else:
        selected_name = str(summary.index[0])

    # Evaluate once on the final three months that were not used for
    # model selection. Training uses only observations before the holdout.
    final_train_end = holdout_start
    final_test, final_actual, final_predictions = predict_models(
        monthly,
        final_train_end,
    )

    selected_predictions = final_predictions[selected_name]

    final_results = final_test[["Month", "Sales"]].copy()
    final_results = final_results.rename(
        columns={"Sales": "ActualSales"}
    )

    for name, predictions in final_predictions.items():
        final_results[name + "_Prediction"] = predictions

    final_results["SelectedModel"] = selected_name
    final_results["PredictedSales"] = selected_predictions
    final_results["AbsoluteError"] = abs(
        final_results["ActualSales"] - final_results["PredictedSales"]
    )

    final_results.to_csv(FORECAST_FILE, index=False)

    holdout_scores = {
        name: mae(final_actual, predictions)
        for name, predictions in final_predictions.items()
    }

    # Refit the selected method using all monthly observations.
    next_month = monthly["Month"].max() + pd.DateOffset(months=1)
    all_sales = monthly["Sales"].to_numpy(dtype=float)

    if selected_name == "linear_regression":
        next_sales = float(
            fit_linear_regression(all_sales, [len(monthly)])[0]
        )

    elif selected_name == "historical_mean_baseline":
        next_sales = float(np.mean(all_sales))

    elif selected_name == "moving_average_3":
        next_sales = float(np.mean(all_sales[-min(3, len(all_sales)):]))

    elif selected_name == "seasonal_average":
        next_month_number = next_month.month
        same_month_history = monthly.loc[
            monthly["Month"].dt.month == next_month_number, "Sales"
        ].to_numpy(dtype=float)
        next_sales = (
            float(np.mean(same_month_history))
            if len(same_month_history)
            else float(np.mean(all_sales))
        )

    elif selected_name == "seasonal_trend_regression":
        month_numbers = monthly["Month"].dt.month.to_numpy(dtype=int)
        month_effects = {
            m: float(np.mean(all_sales[month_numbers == m]))
            for m in range(1, 13) if np.any(month_numbers == m)
        }
        seasonal_center = float(np.mean(list(month_effects.values())))
        deseasonalized = np.asarray([
            value - (month_effects[m] - seasonal_center)
            for value, m in zip(all_sales, month_numbers)
        ], dtype=float)
        slope, intercept = np.polyfit(
            np.arange(len(deseasonalized), dtype=float), deseasonalized, 1
        )
        next_sales = max(0.0, float(
            slope * len(all_sales) + intercept
            + month_effects.get(next_month.month, seasonal_center)
            - seasonal_center
        ))

    else:
        sales_by_month = monthly.set_index("Month")["Sales"]
        previous_year_month = next_month - pd.DateOffset(years=1)

        if previous_year_month not in sales_by_month.index:
            raise ValueError(
                "Cannot create seasonal forecast: "
                "previous-year month is unavailable."
            )

        next_sales = float(sales_by_month.loc[previous_year_month])

    print("\nMonthly sales dataset created:", MONTHLY_FILE)
    print("Final holdout predictions saved:", FORECAST_FILE)
    print("Rolling backtest details saved:", BACKTEST_FILE)

    print("\nMonthly observations:", len(monthly))
    print("Rolling windows evaluated:", scores["WindowStart"].nunique())
    print("Test months per window:", TEST_SIZE)

    print("\nRolling backtest summary (lower MAE is better):")
    print(
        summary.rename(columns={
            "mean": "MeanMAE",
            "median": "MedianMAE",
            "count": "Windows",
        }).round(2).to_string()
    )

    print("\nSelected approach:", selected_name)
    print("Forecast month:", next_month.strftime("%Y-%m"))
    print(
        "Experimental next-month sales estimate:",
        round(next_sales, 2),
    )

    print("\nFinal holdout MAE by model (lower is better):")
    for name, score in sorted(holdout_scores.items(), key=lambda item: item[1]):
        print(f"{name}: {score:,.2f}")

    print("\nFinal holdout results:")
    print(final_results.to_string(index=False))


if __name__ == "__main__":
    main()
