from __future__ import annotations

from pathlib import Path

import pandas as pd
import yfinance as yf


def fetch_price_history(ticker: str, start: str, end: str | None) -> pd.DataFrame:
    data = yf.download(ticker, start=start, end=end, auto_adjust=False, progress=False)
    if data.empty:
        raise ValueError(f"No data returned for {ticker}")

    data = data.reset_index().rename(
        columns={
            "Date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Adj Close": "adj_close",
            "Volume": "volume",
        }
    )
    return data


def save_raw_data(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def load_raw_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Missing data file: {path}")
    return pd.read_csv(path, parse_dates=["date"])
