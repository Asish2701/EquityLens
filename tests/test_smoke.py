import importlib
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from stock_future_analysis.features import build_features


def test_build_features_smoke():
    df = pd.DataFrame(
        {
            "date": pd.date_range("2020-01-01", periods=30, freq="D"),
            "open": range(30),
            "high": range(1, 31),
            "low": range(30),
            "close": range(30),
            "adj_close": range(30),
            "volume": range(100, 130),
        }
    )
    X, y, full = build_features(df, horizon_days=5)
    assert not X.empty
    assert len(X) == len(y)
    assert "target" in full.columns


def test_vercel_entrypoint_exports_app():
    module = importlib.import_module("api.index")
    assert hasattr(module, "app")
