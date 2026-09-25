from __future__ import annotations

import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE_URL = "https://stock.indianapi.in"

app = FastAPI(title="EquityLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

logger = logging.getLogger("equitylens")
logger.setLevel(logging.INFO)


def _get_api_key() -> str:
    key = os.getenv("INDIANAPI_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="INDIANAPI_KEY is not configured")
    return key


def _request_indian_api(path: str, params: dict[str, str]) -> object:
    url = f"{BASE_URL}{path}?{urlencode(params)}"
    request = Request(url, headers={"x-api-key": _get_api_key()})

    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as error:
        try:
            detail = error.read().decode("utf-8") if error.fp else str(error)
        except Exception:
            detail = str(error)
        raise HTTPException(
            status_code=error.code,
            detail=f"IndianAPI HTTP {error.code}: {detail}",
        ) from error
    except URLError as error:
        logger.exception("IndianAPI connection failed")
        raise HTTPException(status_code=502, detail=f"IndianAPI connection failed: {error}") from error
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=502, detail="IndianAPI returned invalid JSON") from error


@app.get("/api")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "EquityLens API"}


@app.get("/api/forecast")
def get_stock_forecast(stock_id: str) -> object:
    return _request_indian_api(
        "/stock_target_price",
        {
            "stock_id": stock_id,
            "measure_code": "EPS",
            "period_type": "Annual",
            "data_type": "Actuals",
            "age": "Current",
        },
    )
