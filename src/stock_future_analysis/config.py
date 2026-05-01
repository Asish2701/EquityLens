from dataclasses import dataclass


@dataclass(frozen=True)
class Defaults:
    ticker: str = "AAPL"
    start: str = "2015-01-01"
    end: str | None = None
    horizon_days: int = 5
    test_size: float = 0.2
    random_state: int = 42
