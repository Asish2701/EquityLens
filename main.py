from __future__ import annotations

import os
import json
from pathlib import Path
import logging
import traceback
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

# logger
logging.basicConfig()
logger = logging.getLogger("stock_future")
logger.setLevel(logging.INFO)

BASE_URL = "https://stock.indianapi.in"
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"

DEFAULT_MEASURE_CODE = "EPS"
DEFAULT_PERIOD_TYPE = "Annual"
DEFAULT_DATA_TYPE = "Actuals"
DEFAULT_AGE = "Current"

app = FastAPI(title="EquityLens")


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
    api_key = os.getenv("INDIANAPI_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="INDIANAPI_KEY is not configured")
    return api_key


def _request_indian_api(path: str, params: dict[str, str]) -> object:
    api_key = _ensure_api_key()
    url = f"{BASE_URL}{path}?{urlencode(params)}"
    request = Request(url, headers={"x-api-key": api_key})

    logger.info("Requesting upstream %s", url)
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            logger.info("Upstream response for %s: %s", path, (body[:100] + '...') if len(body) > 100 else body)
            return json.loads(body) if body else {}
    except HTTPError as error:
        try:
            detail_body = error.read().decode("utf-8") if error.fp else str(error)
        except Exception:
            detail_body = str(error)
        logger.error("HTTPError calling upstream %s: %s", url, detail_body)
        raise HTTPException(status_code=error.code, detail=f"Upstream HTTP {error.code}: {detail_body}") from error
    except URLError as error:
        logger.exception("URLError calling upstream %s", url)
        raise HTTPException(status_code=502, detail=f"Upstream URLError: {error}") from error
    except Exception as error:
        tb = traceback.format_exc()
        logger.error("Unexpected error calling upstream %s: %s\n%s", url, error, tb)
        raise HTTPException(status_code=500, detail="Unexpected upstream error") from error


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
