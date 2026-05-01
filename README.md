# Stock Future analysis and prediction

A lightweight Python project to fetch market data, engineer features, and predict next-week close prices.

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Install the package in editable mode:

```
pip install -e .
```

## Usage

Fetch data:

```
python -m stock_future_analysis fetch --ticker AAPL --start 2015-01-01
```

Train and evaluate:

```
python -m stock_future_analysis train --ticker AAPL --start 2015-01-01
```

Train, evaluate, and forecast the next-week close:

```
python -m stock_future_analysis run --ticker AAPL --start 2015-01-01
```

## Live API (IndianAPI)

The frontend can fetch live forecast data through a local FastAPI proxy that keeps your API key
server-side.

1. Create a .env file in the project root:

```
INDIANAPI_KEY=your_key_here
```

2. Install backend dependencies (included in requirements.txt):

```
pip install -r requirements.txt
```

3. Run the API server:

```
python -m uvicorn stock_future_analysis.api:app --reload --port 8000
```

The API exposes:

```
GET /api/forecast?stock_id=TATASTEEL
```

Outputs are saved to:
- data/raw/ for downloaded CSVs
- models/ for trained models
- reports/ for metrics and charts

## Deployment

The app can run as a single Vercel deployment with the React frontend and a Python `/api/forecast` function on the same domain. For deployment, set these environment variables:

- `INDIANAPI_KEY` for the Python proxy function.
- `FRONTEND_ORIGINS` or `CORS_ORIGINS` if you also run the local FastAPI app.
- `VITE_API_BASE_URL` only if you want the frontend to point to a separate backend URL.

Typical flow for Vercel:

1. Import the repository into Vercel.
2. Keep the project root at the repository root.
3. Set `INDIANAPI_KEY` in the Vercel project settings.
4. Leave `VITE_API_BASE_URL` unset to use the same-origin `/api/forecast` function, or set it to an external backend URL if you deploy the API elsewhere.
5. Vercel will run `cd frontend && npm install`, `cd frontend && npm run build`, and publish `frontend/dist`.

### Vercel

This repository includes a root [vercel.json](vercel.json) and a Python function at [api/forecast.py](api/forecast.py) so the frontend and forecast API can be deployed together.

## Notes

Predictions are experimental and for educational use only. This is not financial advice.
