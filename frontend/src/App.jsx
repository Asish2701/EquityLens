import { useMemo, useState } from "react";

const initialRuns = [
  {
    id: "TATASTEEL-initial",
    ticker: "TATASTEEL",
    generatedAt: "Not fetched yet",
    priceTarget: null,
    priceTargetSnapshots: [],
    recommendation: null,
    recommendationSnapshots: [],
    series: [165, 187, 210, 212],
    raw: null,
  },
];

const palette = {
  ink: "#0e1414",
  olive: "#8f8a3b",
  amber: "#f6c66f",
  teal: "#1f6f6c",
  cream: "#f5f0e6",
  rust: "#c06a34",
  mint: "#b7d9c3",
};

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "");
const AGE_ORDER = {
  NinetyDaysAgo: 1,
  SixtyDaysAgo: 2,
  ThirtyDaysAgo: 3,
  OneWeekAgo: 4,
  Current: 5,
};

const AGE_LABELS = {
  NinetyDaysAgo: "90D",
  SixtyDaysAgo: "60D",
  ThirtyDaysAgo: "30D",
  OneWeekAgo: "1W",
  Current: "Now",
};

function isNumber(value) {
  return typeof value === "number" && !Number.isNaN(value);
}

function clamp(value, min = 0, max = 100) {
  if (!isNumber(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  if (!isNumber(value)) {
    return "N/A";
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value, currency) {
  if (!isNumber(value)) {
    return "N/A";
  }
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch (err) {
      return formatNumber(value);
    }
  }
  return formatNumber(value);
}

function formatAge(age) {
  return AGE_LABELS[age] ?? age ?? "N/A";
}

function normalizeArray(value, nestedKey) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value[nestedKey])) {
    return value[nestedKey];
  }
  return [];
}

function normalizePayload(payload) {
  const priceTarget = payload?.priceTarget ?? payload?.price_target ?? payload?.data?.priceTarget ?? null;
  const priceTargetSnapshots = normalizeArray(
    payload?.priceTargetSnapshots ?? payload?.price_target_snapshots,
    "PriceTargetSnapshot"
  );
  const recommendation = payload?.recommendation ?? payload?.recommendationSummary ?? payload?.data?.recommendation ?? null;
  const recommendationSnapshots = normalizeArray(
    payload?.recommendationSnapshots ?? payload?.recommendation_snapshots,
    "RecommendationSnapshot"
  );

  return {
    priceTarget,
    priceTargetSnapshots,
    recommendation,
    recommendationSnapshots,
  };
}

function sortSnapshots(snapshots) {
  return [...snapshots].sort(
    (left, right) => (AGE_ORDER[left?.Age] ?? 99) - (AGE_ORDER[right?.Age] ?? 99)
  );
}

function buildSeriesFromSnapshots(snapshots, priceTarget) {
  const series = sortSnapshots(snapshots)
    .map((snap) => snap?.Mean ?? snap?.Median)
    .filter(isNumber);

  if (series.length) {
    return series;
  }

  if (priceTarget) {
    const fallback = [priceTarget.Low, priceTarget.Median, priceTarget.Mean, priceTarget.High].filter(isNumber);
    if (fallback.length) {
      return fallback;
    }
  }

  return [165, 187, 210, 212];
}

function getDeltaClass(prev, curr) {
  if (!isNumber(prev) || !isNumber(curr)) return "";
  if (curr > prev) return "positive";
  if (curr < prev) return "negative";
  return "";
}

function getDeltaValue(first, last) {
  if (!isNumber(first) || !isNumber(last)) {
    return null;
  }
  return last - first;
}

function getRangePercent(value, min, max) {
  if (!isNumber(value) || !isNumber(min) || !isNumber(max) || max === min) {
    return 50;
  }
  return clamp(((value - min) / (max - min)) * 100, 3, 97);
}

function buildChart(values, width = 520, height = 210, padding = 28) {
  const numeric = values.filter(isNumber);
  if (!numeric.length) {
    return { points: [], path: "", areaPath: "", min: 0, max: 0 };
  }

  const rawMin = Math.min(...numeric);
  const rawMax = Math.max(...numeric);
  const span = rawMax - rawMin || Math.max(rawMax * 0.08, 1);
  const min = rawMin - span * 0.12;
  const max = rawMax + span * 0.12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = numeric.map((value, index) => {
    const x = padding + (numeric.length === 1 ? innerWidth / 2 : (index / (numeric.length - 1)) * innerWidth);
    const y = padding + (1 - (value - min) / (max - min || 1)) * innerHeight;
    return { value, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const baseY = height - padding;
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x.toFixed(2)} ${baseY} L ${points[0].x.toFixed(2)} ${baseY} Z`
    : "";

  return { points, path, areaPath, min, max };
}

function buildBandPath(highValues, lowValues, width = 520, height = 210, padding = 28) {
  const values = [...highValues, ...lowValues].filter(isNumber);
  if (!values.length || highValues.length !== lowValues.length) {
    return "";
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.max(rawMax * 0.08, 1);
  const min = rawMin - span * 0.12;
  const max = rawMax + span * 0.12;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const pointFor = (value, index, count) => {
    const x = padding + (count === 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth);
    const y = padding + (1 - (value - min) / (max - min || 1)) * innerHeight;
    return { x, y };
  };

  const highPoints = highValues.map((value, index) => pointFor(value, index, highValues.length));
  const lowPoints = lowValues.map((value, index) => pointFor(value, index, lowValues.length)).reverse();
  const allPoints = [...highPoints, ...lowPoints];
  return allPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ") + " Z";
}

function getRecommendationLabel(mean) {
  if (!isNumber(mean)) return "Waiting";
  if (mean <= 2) return "Bullish";
  if (mean <= 3) return "Neutral";
  return "Cautious";
}

function getRecommendationStrength(mean) {
  if (!isNumber(mean)) return 0;
  return clamp(((5 - mean) / 4) * 100);
}

function MetricCard({ label, value, tone = "" }) {
  return (
    <div className={`metric-card ${tone}`}>
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}

function RangeVisual({ priceTarget }) {
  const low = priceTarget.Low;
  const mean = priceTarget.Mean;
  const median = priceTarget.Median;
  const high = priceTarget.High;

  if (![low, high].every(isNumber)) {
    return (
      <div className="visual-empty">
        <span>Fetch a ticker to map the target range.</span>
      </div>
    );
  }

  const meanLeft = getRangePercent(mean, low, high);
  const medianLeft = getRangePercent(median, low, high);

  return (
    <div className="range-visual">
      <div className="range-track">
        <span className="range-marker mean" style={{ left: `${meanLeft}%` }}>
          <strong>Mean</strong>
        </span>
        <span className="range-marker median" style={{ left: `${medianLeft}%` }}>
          <strong>Median</strong>
        </span>
      </div>
      <div className="range-scale">
        <span>{formatCurrency(low, priceTarget.CurrencyCode)}</span>
        <span>{formatCurrency(high, priceTarget.CurrencyCode)}</span>
      </div>
    </div>
  );
}

function PriceTrendChart({ snapshots, priceTarget }) {
  const chartRows = snapshots.length
    ? snapshots
    : [
        { Age: "Low", Mean: priceTarget.Low, High: priceTarget.Low, Low: priceTarget.Low },
        { Age: "Median", Mean: priceTarget.Median, High: priceTarget.Median, Low: priceTarget.Median },
        { Age: "Mean", Mean: priceTarget.Mean, High: priceTarget.Mean, Low: priceTarget.Mean },
        { Age: "High", Mean: priceTarget.High, High: priceTarget.High, Low: priceTarget.High },
      ].filter((row) => isNumber(row.Mean));

  const meanValues = chartRows.map((row) => row.Mean);
  const highValues = chartRows.map((row) => row.High).filter(isNumber);
  const lowValues = chartRows.map((row) => row.Low).filter(isNumber);
  const chart = buildChart(meanValues);
  const bandPath = buildBandPath(highValues, lowValues);

  if (!chart.points.length) {
    return (
      <div className="chart-empty">
        <span>Fetch a ticker to draw the price target trend.</span>
      </div>
    );
  }

  return (
    <div className="chart-shell price-chart-shell">
      <svg viewBox="0 0 520 210" role="img" aria-label="Mean target price trend">
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={palette.teal} stopOpacity="0.22" />
            <stop offset="100%" stopColor={palette.teal} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="28" y1="182" x2="492" y2="182" className="chart-axis" />
        <line x1="28" y1="28" x2="28" y2="182" className="chart-axis" />
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1="28" y1={28 + ratio * 154} x2="492" y2={28 + ratio * 154} className="chart-gridline" />
        ))}
        {bandPath ? <path d={bandPath} className="chart-band" /> : null}
        <path d={chart.areaPath} fill="url(#trendFill)" />
        <path d={chart.path} fill="none" className="chart-line" />
        {chart.points.map((point, index) => (
          <g key={`${point.x}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" className="chart-dot" />
            <text x={point.x} y="200" textAnchor="middle" className="chart-label">
              {formatAge(chartRows[index]?.Age)}
            </text>
          </g>
        ))}
        <text x="32" y="22" className="chart-value-label">
          {formatCurrency(chart.max, priceTarget.CurrencyCode)}
        </text>
        <text x="32" y="176" className="chart-value-label">
          {formatCurrency(chart.min, priceTarget.CurrencyCode)}
        </text>
      </svg>
      <div className="chart-caption">
        {snapshots.length ? "Mean target with high-low analyst band" : "Fallback view from current low, median, mean, and high values"}
      </div>
    </div>
  );
}

function RecommendationVisual({ recommendation, snapshots }) {
  const mean = recommendation.Mean;
  const strength = getRecommendationStrength(mean);
  const chartRows = snapshots.length ? snapshots : [recommendation].filter((row) => isNumber(row.Mean));
  const chart = buildChart(chartRows.map((row) => row.Mean), 420, 120, 20);

  return (
    <div className="recommendation-visual">
      <div className="recommendation-meter">
        <div>
          <p className="label">Recommendation signal</p>
          <p className="meter-title">{getRecommendationLabel(mean)}</p>
        </div>
        <strong>{formatNumber(mean)}</strong>
      </div>
      <div className="meter-track" aria-label="Recommendation strength">
        <span style={{ width: `${strength}%` }} />
      </div>
      <div className="meter-scale">
        <span>Stronger</span>
        <span>Weaker</span>
      </div>
      {chart.points.length > 1 ? (
        <svg className="mini-line" viewBox="0 0 420 120" role="img" aria-label="Recommendation trend">
          <path d={chart.areaPath} className="mini-area" />
          <path d={chart.path} className="mini-path" />
          {chart.points.map((point, index) => (
            <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4" className="mini-dot" />
          ))}
        </svg>
      ) : (
        <p className="panel-empty">Recommendation trend appears after snapshots are returned.</p>
      )}
    </div>
  );
}

function SnapshotBars({ snapshots, currency }) {
  if (!snapshots.length) {
    return <p className="panel-empty">No snapshot bars yet.</p>;
  }

  const maxEstimate = Math.max(...snapshots.map((snap) => snap.NumberOfEstimates).filter(isNumber), 1);

  return (
    <div className="snapshot-bars">
      {snapshots.map((snap, index) => {
        const height = clamp((snap.NumberOfEstimates / maxEstimate) * 100, 12, 100);
        return (
          <div className="snapshot-bar-item" key={`${snap.Age}-${index}`}>
            <div className="snapshot-bar-track">
              <span style={{ height: `${height}%` }} />
            </div>
            <strong>{formatAge(snap.Age)}</strong>
            <small>{formatCurrency(snap.Mean, currency ?? snap.CurrencyCode)}</small>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [runs, setRuns] = useState(initialRuns);
  const [activeRunId, setActiveRunId] = useState(initialRuns[0].id);
  const [form, setForm] = useState({ ticker: "TATASTEEL" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRun = useMemo(
    () => runs.find((run) => run.id === activeRunId) ?? runs[0],
    [runs, activeRunId]
  );

  const priceTarget = activeRun.priceTarget ?? {};
  const recommendation = activeRun.recommendation ?? {};

  const sortedPriceSnapshots = useMemo(
    () => sortSnapshots(activeRun.priceTargetSnapshots ?? []),
    [activeRun]
  );

  const sortedRecommendationSnapshots = useMemo(
    () => sortSnapshots(activeRun.recommendationSnapshots ?? []),
    [activeRun]
  );

  const sparkChart = useMemo(() => buildChart(activeRun.series ?? [], 260, 80, 10), [activeRun]);
  const firstSnapshotMean = sortedPriceSnapshots[0]?.Mean;
  const latestSnapshotMean = sortedPriceSnapshots[sortedPriceSnapshots.length - 1]?.Mean ?? priceTarget.Mean;
  const meanDelta = getDeltaValue(firstSnapshotMean, latestSnapshotMean);
  const meanRange = isNumber(priceTarget.High) && isNumber(priceTarget.Low) ? priceTarget.High - priceTarget.Low : null;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const ticker = form.ticker.trim().toUpperCase() || "TATASTEEL";
    if (!ticker || ticker.length === 0) {
      setError("Please enter a ticker symbol.");
      return;
    }

    const params = new URLSearchParams({ stock_id: ticker });

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/forecast?${params.toString()}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to fetch target price.");
      }
      const payload = await response.json();
      const normalized = normalizePayload(payload);
      const series = buildSeriesFromSnapshots(normalized.priceTargetSnapshots, normalized.priceTarget);

      const newRun = {
        id: `${ticker}-${new Date().toISOString()}`,
        ticker,
        generatedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        priceTarget: normalized.priceTarget,
        priceTargetSnapshots: normalized.priceTargetSnapshots,
        recommendation: normalized.recommendation,
        recommendationSnapshots: normalized.recommendationSnapshots,
        series,
        raw: payload,
      };

      setRuns((prev) => [newRun, ...prev]);
      setActiveRunId(newRun.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch target price.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="glow" />
      <header className="hero">
        <div>
          <p className="eyebrow">By Asish Sharma</p>
          <h1>
            Equity<span>Lens</span>
          </h1>
          <p className="subtitle">
            Live target price and analyst recommendations from IndianAPI, wired through a local FastAPI proxy.
          </p>
        </div>
        <div className="hero-card">
          <div className="hero-card-top">
            <div className="hero-chip">{activeRun.ticker}</div>
            <span>{getRecommendationLabel(recommendation.Mean)}</span>
          </div>
          <h2 className={getDeltaClass(firstSnapshotMean, latestSnapshotMean)}>
            {formatCurrency(priceTarget.Mean, priceTarget.CurrencyCode)}
          </h2>
          <p>Target price mean</p>
          {sparkChart.points.length > 1 ? (
            <svg className="hero-sparkline" viewBox="0 0 260 80" aria-label="Compact target price sparkline">
              <path d={sparkChart.areaPath} className="hero-spark-area" />
              <path d={sparkChart.path} className="hero-spark-path" />
            </svg>
          ) : null}
          <div className="hero-row">
            <span>High</span>
            <strong>{formatCurrency(priceTarget.High, priceTarget.CurrencyCode)}</strong>
          </div>
          <div className="hero-row">
            <span>Low</span>
            <strong>{formatCurrency(priceTarget.Low, priceTarget.CurrencyCode)}</strong>
          </div>
          <div className="hero-row">
            <span>Analysts</span>
            <strong>{formatNumber(priceTarget.NumberOfEstimates)}</strong>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel panel-form">
          <h3>Fetch Target Price</h3>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Stock ticker
              <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="TATASTEEL" />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Fetching..." : "Get Target Price"}
            </button>
          </form>
          {error ? <p className="panel-error">{error}</p> : null}
          <p className="panel-note">Only the ticker is required. The backend fetches all target price data.</p>
        </section>

        <section className="panel panel-results">
          <div className="panel-head">
            <h3>Price Target Summary</h3>
            <span>{activeRun.generatedAt}</span>
          </div>
          <div className="metrics-strip">
            <MetricCard label="Mean target" value={formatCurrency(priceTarget.Mean, priceTarget.CurrencyCode)} tone="teal" />
            <MetricCard label="Target spread" value={formatCurrency(meanRange, priceTarget.CurrencyCode)} tone="amber" />
            <MetricCard label="Snapshots delta" value={formatCurrency(meanDelta, priceTarget.CurrencyCode)} tone={getDeltaClass(firstSnapshotMean, latestSnapshotMean)} />
            <MetricCard label="Estimates" value={formatNumber(priceTarget.NumberOfEstimates)} />
          </div>
          <RangeVisual priceTarget={priceTarget} />

          <h4 className="panel-title">Price Target</h4>
          <div className="result-grid">
            <div>
              <p className="label">Ticker</p>
              <p className="value">{activeRun.ticker}</p>
            </div>
            <div>
              <p className="label">Currency</p>
              <p className="value">{priceTarget.CurrencyCode ?? "N/A"}</p>
            </div>
            <div>
              <p className="label">Mean</p>
              <p className="value">{formatCurrency(priceTarget.Mean, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">Median</p>
              <p className="value">{formatCurrency(priceTarget.Median, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">High</p>
              <p className="value">{formatCurrency(priceTarget.High, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">Low</p>
              <p className="value">{formatCurrency(priceTarget.Low, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">Unverified Mean</p>
              <p className="value">{formatCurrency(priceTarget.UnverifiedMean, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">Preliminary Mean</p>
              <p className="value">{formatCurrency(priceTarget.PreliminaryMean, priceTarget.CurrencyCode)}</p>
            </div>
            <div>
              <p className="label">Std Dev</p>
              <p className="value">{formatNumber(priceTarget.StandardDeviation)}</p>
            </div>
          </div>
        </section>

        <section className="panel panel-chart">
          <div className="panel-head">
            <h3>Target Price Trend</h3>
            <span>{sortedPriceSnapshots.length ? `${sortedPriceSnapshots.length} snapshots` : "Current range"}</span>
          </div>
          <PriceTrendChart snapshots={sortedPriceSnapshots} priceTarget={priceTarget} />
        </section>

        <section className="panel panel-recommendation">
          <div className="panel-head">
            <h3>Recommendation View</h3>
            <span>{formatNumber(recommendation.NumberOfRecommendations)} analysts</span>
          </div>
          <RecommendationVisual recommendation={recommendation} snapshots={sortedRecommendationSnapshots} />
        </section>

        <section className="panel panel-bars">
          <div className="panel-head">
            <h3>Estimate Depth</h3>
            <span>Mean by snapshot</span>
          </div>
          <SnapshotBars snapshots={sortedPriceSnapshots} currency={priceTarget.CurrencyCode} />
        </section>

        <section className="panel panel-target-snapshots">
          <div className="panel-head">
            <h3>Price Target Snapshots</h3>
            <span>{sortedPriceSnapshots.length} entries</span>
          </div>
          {sortedPriceSnapshots.length ? (
            <div className="data-table">
              <div className="table-row six table-head">
                <span>Age</span>
                <span>Mean</span>
                <span>Median</span>
                <span>High</span>
                <span>Low</span>
                <span>Estimates</span>
              </div>
              {sortedPriceSnapshots.map((snap, index) => {
                const prev = index > 0 ? sortedPriceSnapshots[index - 1]?.Mean : priceTarget.Mean;
                const cls = getDeltaClass(prev, snap.Mean);
                return (
                  <div className="table-row six" key={`${snap.Age}-${index}`}>
                    <span>{formatAge(snap.Age)}</span>
                    <span className={cls}>{formatCurrency(snap.Mean, snap.CurrencyCode)}</span>
                    <span>{formatCurrency(snap.Median, snap.CurrencyCode)}</span>
                    <span>{formatCurrency(snap.High, snap.CurrencyCode)}</span>
                    <span>{formatCurrency(snap.Low, snap.CurrencyCode)}</span>
                    <span>{formatNumber(snap.NumberOfEstimates)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="panel-empty">No price target snapshots yet.</p>
          )}
        </section>

        <section className="panel panel-recommendation-snapshots">
          <div className="panel-head">
            <h3>Recommendation Snapshots</h3>
            <span>{sortedRecommendationSnapshots.length} entries</span>
          </div>
          {sortedRecommendationSnapshots.length ? (
            <div className="data-table">
              <div className="table-row five table-head">
                <span>Age</span>
                <span>Mean</span>
                <span>High</span>
                <span>Low</span>
                <span>Analysts</span>
              </div>
              {sortedRecommendationSnapshots.map((snap, index) => {
                const prev = index > 0 ? sortedRecommendationSnapshots[index - 1]?.Mean : recommendation.Mean;
                const cls = getDeltaClass(prev, snap.Mean);
                return (
                  <div className="table-row five" key={`${snap.Age}-${index}`}>
                    <span>{formatAge(snap.Age)}</span>
                    <span className={cls}>{formatNumber(snap.Mean)}</span>
                    <span>{formatNumber(snap.High)}</span>
                    <span>{formatNumber(snap.Low)}</span>
                    <span>{formatNumber(snap.NumberOfRecommendations)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="panel-empty">No recommendation snapshots yet.</p>
          )}
        </section>

        <section className="panel panel-history">
          <div className="panel-head">
            <h3>Recent Runs</h3>
            <span>{runs.length} total</span>
          </div>
          <div className="history-list">
            {runs.map((run) => (
              <button
                type="button"
                key={run.id}
                className={`history-item ${run.id === activeRun.id ? "active" : ""}`}
                onClick={() => setActiveRunId(run.id)}
              >
                <div>
                  <p className="history-title">{run.ticker}</p>
                  <p className="history-sub">{run.generatedAt}</p>
                </div>
                <span>{formatCurrency(run.priceTarget?.Mean, run.priceTarget?.CurrencyCode)}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
