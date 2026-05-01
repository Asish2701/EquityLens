from __future__ import annotations

import numpy as np
import pandas as pd


def build_features(df: pd.DataFrame, horizon_days: int) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    df = df.sort_values("date").copy()
    numeric_cols = ["open", "high", "low", "close", "adj_close", "volume"]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["return_1d"] = df["close"].pct_change()
    safe_close = df["close"].clip(lower=1e-9)
    df["log_return_1d"] = np.log(safe_close).diff()
    df["ma_5"] = df["close"].rolling(5).mean()
    df["ma_10"] = df["close"].rolling(10).mean()
    df["ma_20"] = df["close"].rolling(20).mean()
    df["vol_5"] = df["close"].rolling(5).std()
    df["vol_10"] = df["close"].rolling(10).std()
    df["volume_change"] = df["volume"].pct_change()

    df["target"] = df["close"].shift(-horizon_days)

    df = df.dropna().reset_index(drop=True)

    feature_cols = [
        "open",
        "high",
        "low",
        "close",
        "adj_close",
        "volume",
        "return_1d",
        "log_return_1d",
        "ma_5",
        "ma_10",
        "ma_20",
        "vol_5",
        "vol_10",
        "volume_change",
    ]

    X = df[feature_cols]
    y = df["target"]
    return X, y, df
