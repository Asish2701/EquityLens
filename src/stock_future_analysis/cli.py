from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd

from .config import Defaults
from .data import fetch_price_history, load_raw_data, save_raw_data
from .features import build_features
from .model import evaluate_model, train_model


def _paths(ticker: str) -> dict[str, Path]:
    safe_ticker = ticker.replace("/", "_").upper()
    return {
        "raw": Path("data") / "raw" / f"{safe_ticker}.csv",
        "model": Path("models") / f"{safe_ticker}_rf.pkl",
        "metrics": Path("reports") / f"{safe_ticker}_metrics.json",
        "plot": Path("reports") / f"{safe_ticker}_pred.png",
    }


def _split_time_ordered(X: pd.DataFrame, y: pd.Series, test_size: float):
    split_idx = int(len(X) * (1 - test_size))
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]


def fetch_command(args: argparse.Namespace) -> None:
    df = fetch_price_history(args.ticker, args.start, args.end)
    paths = _paths(args.ticker)
    save_raw_data(df, paths["raw"])
    print(f"Saved raw data to {paths['raw']}")


def train_command(args: argparse.Namespace) -> None:
    paths = _paths(args.ticker)
    if paths["raw"].exists() and not args.refresh:
        df = load_raw_data(paths["raw"])
    else:
        df = fetch_price_history(args.ticker, args.start, args.end)
        save_raw_data(df, paths["raw"])

    X, y, full_df = build_features(df, args.horizon_days)
    X_train, X_test, y_train, y_test = _split_time_ordered(X, y, args.test_size)

    model = train_model(X_train, y_train, args.random_state)
    metrics = evaluate_model(model, X_test, y_test)

    paths["model"].parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, paths["model"])

    paths["metrics"].parent.mkdir(parents=True, exist_ok=True)
    with paths["metrics"].open("w", encoding="utf-8") as handle:
        json.dump(metrics.__dict__, handle, indent=2)

    preds = model.predict(X_test)
    plt.figure(figsize=(10, 5))
    plt.plot(full_df.loc[y_test.index, "date"], y_test.values, label="Actual")
    plt.plot(full_df.loc[y_test.index, "date"], preds, label="Predicted")
    plt.title(f"{args.ticker} Next-week Close Prediction")
    plt.xlabel("Date")
    plt.ylabel("Price")
    plt.legend()
    plt.tight_layout()
    plt.savefig(paths["plot"], dpi=150)
    plt.close()

    print(f"Model saved to {paths['model']}")
    print(f"Metrics saved to {paths['metrics']}")
    print(f"Plot saved to {paths['plot']}")


def run_command(args: argparse.Namespace) -> None:
    train_command(args)
    paths = _paths(args.ticker)
    df = load_raw_data(paths["raw"])
    X, y, full_df = build_features(df, args.horizon_days)
    model = joblib.load(paths["model"])

    last_features = X.tail(1)
    forecast = model.predict(last_features)[0]
    last_date = full_df.loc[last_features.index[0], "date"]
    print(
        f"Forecasted close for {args.ticker} on {last_date + pd.Timedelta(days=args.horizon_days)}: {forecast:.2f}"
    )


def build_parser() -> argparse.ArgumentParser:
    defaults = Defaults()
    parser = argparse.ArgumentParser(
        description="Stock Future analysis and prediction",
    )

    parser.add_argument("--ticker", default=defaults.ticker, help="Ticker symbol")
    parser.add_argument("--start", default=defaults.start, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", default=defaults.end, help="End date YYYY-MM-DD")
    parser.add_argument("--horizon-days", type=int, default=defaults.horizon_days)
    parser.add_argument("--test-size", type=float, default=defaults.test_size)
    parser.add_argument("--random-state", type=int, default=defaults.random_state)
    parser.add_argument("--refresh", action="store_true", help="Re-download data")

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("fetch", help="Download data to CSV")
    subparsers.add_parser("train", help="Train and evaluate a model")
    subparsers.add_parser("run", help="Train and forecast next-week close")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "fetch":
        fetch_command(args)
    elif args.command == "train":
        train_command(args)
    elif args.command == "run":
        run_command(args)


if __name__ == "__main__":
    main()
