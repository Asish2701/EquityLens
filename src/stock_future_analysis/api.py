from __future__ import annotations

import os
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

BASE_URL = "https://stock.indianapi.in"
API_KEY = os.getenv("INDIANAPI_KEY")

DEFAULT_MEASURE_CODE = "EPS"
DEFAULT_PERIOD_TYPE = "Annual"
DEFAULT_DATA_TYPE = "Actuals"
DEFAULT_AGE = "Current"

app = FastAPI(title="Stock Future API")


def _parse_origins(value: str | None) -> list[str]:
    if not value:
        return [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]
    return [origin.strip() for origin in value.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_parse_origins(os.getenv("FRONTEND_ORIGINS") or os.getenv("CORS_ORIGINS")),
    allow_methods=["GET", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)


def _ensure_api_key() -> str:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="INDIANAPI_KEY is not configured")
    return API_KEY


def _request_indian_api(path: str, params: dict[str, str]) -> Any:
    api_key = _ensure_api_key()
    url = f"{BASE_URL}{path}"
    response = requests.get(url, params=params, headers={"x-api-key": api_key}, timeout=20)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.get("/api/forecast")
def get_stock_forecast(stock_id: str) -> Any:
    """Proxy to IndianAPI stock_target_price endpoint."""
    params = {"stock_id": stock_id}
    return _request_indian_api("/stock_target_price", params)
