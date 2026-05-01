from __future__ import annotations

import os
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_URL = "https://stock.indianapi.in"
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"

DEFAULT_MEASURE_CODE = "EPS"
DEFAULT_PERIOD_TYPE = "Annual"
DEFAULT_DATA_TYPE = "Actuals"
DEFAULT_AGE = "Current"

app = FastAPI(title="EquityLens")


def _ensure_api_key() -> str:
    api_key = os.getenv("INDIANAPI_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="INDIANAPI_KEY is not configured")
    return api_key


def _request_indian_api(path: str, params: dict[str, str]) -> object:
    api_key = _ensure_api_key()
    url = f"{BASE_URL}{path}?{urlencode(params)}"
    request = Request(url, headers={"x-api-key": api_key})

    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as error:
        detail = error.read().decode("utf-8") if error.fp else str(error)
        raise HTTPException(status_code=error.code, detail=detail) from error
    except URLError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@app.get("/api/forecast")
def get_stock_forecast(stock_id: str) -> object:
    params = {
        "stock_id": stock_id,
        "measure_code": DEFAULT_MEASURE_CODE,
        "period_type": DEFAULT_PERIOD_TYPE,
        "data_type": DEFAULT_DATA_TYPE,
        "age": DEFAULT_AGE,
    }
    return _request_indian_api("/stock_target_price", params)


assets_dir = FRONTEND_DIST / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{path:path}")
def serve_frontend(path: str) -> object:
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    return JSONResponse({"detail": "Frontend build not found"}, status_code=404)