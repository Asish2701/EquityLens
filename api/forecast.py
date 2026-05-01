from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

import requests

BASE_URL = "https://stock.indianapi.in"
DEFAULT_MEASURE_CODE = "EPS"
DEFAULT_PERIOD_TYPE = "Annual"
DEFAULT_DATA_TYPE = "Actuals"
DEFAULT_AGE = "Current"


def _ensure_api_key() -> str:
    api_key = os.getenv("INDIANAPI_KEY")
    if not api_key:
        raise ValueError("INDIANAPI_KEY is not configured")
    return api_key


def _request_indian_api(path: str, params: dict[str, str]) -> object:
    api_key = _ensure_api_key()
    url = f"{BASE_URL}{path}"
    response = requests.get(url, params=params, headers={"x-api-key": api_key}, timeout=20)
    response.raise_for_status()
    return response.json()


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/forecast":
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "Not found"}).encode("utf-8"))
            return

        stock_id = parse_qs(parsed.query).get("stock_id", [""])[0].strip()
        if not stock_id:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "stock_id is required"}).encode("utf-8"))
            return

        try:
            payload = _request_indian_api(
                "/stock_target_price",
                {
                    "stock_id": stock_id,
                    "measure_code": DEFAULT_MEASURE_CODE,
                    "period_type": DEFAULT_PERIOD_TYPE,
                    "data_type": DEFAULT_DATA_TYPE,
                    "age": DEFAULT_AGE,
                },
            )
        except ValueError as error:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": str(error)}).encode("utf-8"))
            return
        except requests.HTTPError as error:
            status = error.response.status_code if error.response is not None else 502
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            message = error.response.text if error.response is not None else str(error)
            self.wfile.write(json.dumps({"detail": message}).encode("utf-8"))
            return
        except requests.RequestException as error:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": str(error)}).encode("utf-8"))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))