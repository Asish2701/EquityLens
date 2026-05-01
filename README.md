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

## Notes

Predictions are experimental and for educational use only. This is not financial advice.
