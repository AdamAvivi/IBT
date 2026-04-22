const startOfTracker = new Date("2026-01-01T00:00:00");
const today = new Date();
const endOfTracker = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const dayMs = 24 * 60 * 60 * 1000;
const apiBase = "https://fxapi.app/api";
const historyCache = new Map();
let renderToken = 0;
let latestHistory = null;
let chartMode = "change";
let graphHidden = new Set();

const colors = [
  "#0f6651",
  "#315f9f",
  "#a43f34",
  "#a87311",
  "#6a4c93",
  "#2f7d95",
  "#7b5b2e",
  "#4b7f24",
  "#9d3f76",
  "#5f6e76",
  "#ba5a31",
  "#276b7a",
  "#111827"
];

const currencies = [
  { code: "ARS", name: "Argentine Peso" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "UK Pound" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "RUB", name: "Russian Rouble" },
  { code: "ZAR", name: "South African Rand" },
  { code: "THB", name: "Thai Baht" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "BTC", name: "Bitcoin" }
].map((currency, index) => ({ ...currency, color: colors[index] }));

const defaultSelected = new Set(["EUR", "GBP", "JPY", "MXN"]);

const el = {
  usdAmount: document.getElementById("usdAmount"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  selectAll: document.getElementById("selectAll"),
  clearAll: document.getElementById("clearAll"),
  reset: document.getElementById("reset"),
  currencyList: document.getElementById("currencyList"),
  selectedCount: document.getElementById("selectedCount"),
  rangeTitle: document.getElementById("rangeTitle"),
  chart: document.getElementById("chart"),
  bestMove: document.getElementById("bestMove"),
  worstMove: document.getElementById("worstMove"),
  pointCount: document.getElementById("pointCount"),
  historyHead: document.getElementById("historyHead"),
  historyBody: document.getElementById("historyBody"),
  downloadCsv: document.getElementById("downloadCsv"),
  valueMode: document.getElementById("valueMode"),
  changeMode: document.getElementById("changeMode")
};

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function clampDate(date) {
  if (date < startOfTracker) return new Date(startOfTracker);
  if (date > endOfTracker) return new Date(endOfTracker);
  return date;
}

function formatValue(value, code) {
  if (!Number.isFinite(value)) return "-";
  if (code === "BTC") return value.toFixed(6);
  if (value >= 10000) return Math.round(value).toLocaleString("en-US");
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function changeClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "change-flat";
  return value > 0 ? "change-up" : "change-down";
}

function sampleDates(start, end) {
  const dates = [];
  let cursor = clampDate(start);
  const last = clampDate(end);

  if (cursor > last) {
    return sampleDates(last, cursor);
  }

  while (cursor <= last) {
    dates.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * dayMs);
  }

  const lastKey = dateKey(last);
  if (dates.length === 0 || dateKey(dates[dates.length - 1]) !== lastKey) {
    dates.push(new Date(last));
  }

  return dates;
}

function selectedCurrencies() {
  return currencies.filter((currency) => {
    const checkbox = document.querySelector(`[data-currency="${currency.code}"]`);
    return checkbox && checkbox.checked;
  });
}

function buildCurrencyList() {
  currencies.forEach((currency) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const name = document.createElement("span");
    const swatch = document.createElement("span");

    label.className = "currency-option";
    checkbox.type = "checkbox";
    checkbox.dataset.currency = currency.code;
    checkbox.checked = defaultSelected.has(currency.code);
    checkbox.addEventListener("change", () => {
      graphHidden.delete(currency.code);
      render();
    });

    name.className = "currency-name";
    name.innerHTML = `${currency.name}<span class="currency-code">${currency.code}</span>`;

    swatch.className = "currency-swatch";
    swatch.style.background = currency.color;

    label.append(checkbox, name, swatch);
    el.currencyList.append(label);
  });
}

function syncDateBounds() {
  const maxDate = dateKey(endOfTracker);
  el.startDate.max = maxDate;
  el.endDate.max = maxDate;

  if (parseDate(el.startDate.value) > endOfTracker) {
    el.startDate.value = maxDate;
  }

  if (parseDate(el.endDate.value) > endOfTracker) {
    el.endDate.value = maxDate;
  }
}

function normalizeRates(payload) {
  if (Array.isArray(payload.rates)) {
    return payload.rates
      .map((entry) => ({ date: entry.date, rate: Number(entry.rate) }))
      .filter((entry) => entry.date && Number.isFinite(entry.rate));
  }

  if (payload.rates && typeof payload.rates === "object") {
    return Object.entries(payload.rates)
      .map(([date, rate]) => ({ date, rate: Number(typeof rate === "object" ? rate.rate : rate) }))
      .filter((entry) => entry.date && Number.isFinite(entry.rate));
  }

  return [];
}

async function fetchCurrencyHistory(currency, start, end) {
  const from = dateKey(start);
  const to = dateKey(end);
  const cacheKey = `${currency.code}:${from}:${to}`;

  if (historyCache.has(cacheKey)) {
    return historyCache.get(cacheKey);
  }

  const url = `${apiBase}/history/USD/${currency.code}.json?from=${from}&to=${to}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${currency.code}: fxapi returned ${response.status}`);
  }

  const payload = await response.json();
  const rates = normalizeRates(payload).sort((a, b) => a.date.localeCompare(b.date));

  if (rates.length === 0) {
    throw new Error(`${currency.code}: no rates returned`);
  }

  historyCache.set(cacheKey, rates);
  return rates;
}

function rateForDate(rates, date) {
  const target = dateKey(date);
  let fallback = null;

  for (const entry of rates) {
    if (entry.date === target) return entry.rate;
    if (entry.date < target) fallback = entry;
    if (entry.date > target) return fallback ? fallback.rate : entry.rate;
  }

  return fallback?.rate;
}

function readControls() {
  const usdAmount = Math.max(1, Number(el.usdAmount.value) || 100);
  let start = clampDate(parseDate(el.startDate.value));
  let end = clampDate(parseDate(el.endDate.value));

  if (start > end) {
    [start, end] = [end, start];
  }

  return {
    usdAmount,
    start,
    end,
    dates: sampleDates(start, end),
    selected: selectedCurrencies()
  };
}

async function buildHistory() {
  const controls = readControls();

  if (controls.selected.length === 0) {
    return { ...controls, series: [], errors: [] };
  }

  const results = await Promise.allSettled(
    controls.selected.map(async (currency) => {
      const rates = await fetchCurrencyHistory(currency, controls.start, controls.end);
      const points = controls.dates.map((date) => ({
        date,
        value: controls.usdAmount * rateForDate(rates, date)
      }));

      return { currency, points };
    })
  );

  return {
    ...controls,
    series: results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
    errors: results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason.message)
  };
}

function renderChart(history) {
  const visibleSeries = history.series.filter(({ currency }) => !graphHidden.has(currency.code));

  if (history.series.length === 0) {
    const message = history.selected.length === 0 ? "Select at least one currency." : "No fxapi data returned for the selected currencies.";
    el.chart.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  if (visibleSeries.length === 0) {
    el.chart.innerHTML = `<div class="empty-state">All selected currencies are hidden in the graph. Click the key to show one.</div>`;
    return;
  }

  const width = 920;
  const height = 460;
  const padding = { top: 32, right: 150, bottom: 58, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const chartSeries = visibleSeries.map(({ currency, points }) => {
    const first = points[0]?.value || 1;
    return {
      currency,
      points: points.map((point) => ({
        date: point.date,
        value: chartMode === "change" ? ((point.value - first) / first) * 100 : point.value
      }))
    };
  });
  const allValues = chartSeries.flatMap((entry) => entry.points.map((point) => point.value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const span = max - min || 1;
  const yMin = min - span * 0.12;
  const yMax = max + span * 0.08;
  const dateStart = history.dates[0].getTime();
  const dateEnd = history.dates[history.dates.length - 1].getTime();
  const dateSpan = dateEnd - dateStart || 1;

  const xForDate = (date) => padding.left + ((date.getTime() - dateStart) / dateSpan) * plotWidth;
  const yForValue = (value) => padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = padding.top + ratio * plotHeight;
    const value = yMax - ratio * (yMax - yMin);
    return `
      <line class="grid-line" x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}"></line>
      <text class="tick-label" x="12" y="${y + 4}">${chartMode === "change" ? formatPercent(value) : formatValue(value, visibleSeries[0].currency.code)}</text>
    `;
  }).join("");

  const dateLabels = history.dates.map((date) => {
    const x = xForDate(date);
    return `<text class="tick-label" x="${x}" y="${height - 20}" text-anchor="middle">${formatDate(date)}</text>`;
  }).join("");

  const lines = chartSeries.map(({ currency, points }) => {
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${xForDate(point.date).toFixed(2)} ${yForValue(point.value).toFixed(2)}`).join(" ");
    const circles = points.map((point) => `<circle class="series-point" cx="${xForDate(point.date).toFixed(2)}" cy="${yForValue(point.value).toFixed(2)}" r="4" fill="${currency.color}"></circle>`).join("");
    return `<path class="series-line" d="${path}" stroke="${currency.color}"></path>${circles}`;
  }).join("");

  const legend = history.series.map(({ currency }, index) => {
    const y = padding.top + index * 22;
    const hidden = graphHidden.has(currency.code);
    return `
      <g class="legend-item ${hidden ? "legend-hidden" : ""}" data-code="${currency.code}" tabindex="0" role="button" aria-label="Toggle ${currency.code}">
        <circle cx="${width - 126}" cy="${y - 4}" r="5" fill="${currency.color}"></circle>
        <text class="tick-label" x="${width - 114}" y="${y}">${currency.code}</text>
      </g>
    `;
  }).join("");

  el.chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      ${grid}
      <line class="grid-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}"></line>
      <line class="grid-line" x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}"></line>
      ${lines}
      ${dateLabels}
      ${legend}
      <text class="axis-label" x="${padding.left + plotWidth / 2}" y="${height - 4}" text-anchor="middle">Weekly date points</text>
      <text class="axis-label" x="18" y="${padding.top - 12}">${chartMode === "change" ? "Change from start" : `Currency units per $${history.usdAmount}`}</text>
    </svg>
  `;

  el.chart.querySelectorAll(".legend-item").forEach((item) => {
    item.addEventListener("click", () => toggleGraphCurrency(item.dataset.code));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleGraphCurrency(item.dataset.code);
      }
    });
  });
}

function historyRows(history) {
  return history.series.flatMap(({ currency, points }) => {
    const first = points[0]?.value || 0;
    return points.map((point, index) => {
      const previous = points[index - 1]?.value;
      const weeklyChange = previous ? ((point.value - previous) / previous) * 100 : NaN;
      const totalChange = first ? ((point.value - first) / first) * 100 : NaN;
      return {
        date: point.date,
        currency,
        value: point.value,
        weeklyChange,
        totalChange
      };
    });
  });
}

function renderTable(history) {
  el.historyHead.innerHTML = `
    <tr>
      <th>Currency</th>
      ${history.dates.map((date, index) => `<th class="week-cell">${index === 0 ? "$100" : `Wk ${index + 1}`}<br><span class="label">${formatDate(date)}</span></th>`).join("")}
    </tr>
  `;

  if (history.series.length === 0) {
    el.historyBody.innerHTML = `<tr><td colspan="${history.dates.length + 1}">Select at least one currency with available fxapi data.</td></tr>`;
    return;
  }

  el.historyBody.innerHTML = history.series.map(({ currency, points }) => `
    <tr>
      <td><strong>${currency.name}</strong><br><span class="label">${currency.code}</span></td>
      ${points.map((point, index) => {
        const previous = points[index - 1]?.value;
        const weeklyChange = previous ? ((point.value - previous) / previous) * 100 : NaN;
        return `
          <td class="week-cell">
            <span class="week-value">${formatValue(point.value, currency.code)}</span>
            <span class="week-change ${changeClass(weeklyChange)}">${index === 0 ? "Start" : formatPercent(weeklyChange)}</span>
          </td>
        `;
      }).join("")}
    </tr>
  `).join("");
}

function renderSummary(history) {
  const moves = historyRows(history).filter((row) => Number.isFinite(row.weeklyChange));
  const best = moves.reduce((current, row) => row.weeklyChange > current.weeklyChange ? row : current, moves[0]);
  const worst = moves.reduce((current, row) => row.weeklyChange < current.weeklyChange ? row : current, moves[0]);

  el.selectedCount.textContent = `${history.selected.length} selected`;
  el.rangeTitle.textContent = `${formatDate(history.start)} to ${formatDate(history.end)}`;
  el.pointCount.textContent = `${history.dates.length} weekly point${history.dates.length === 1 ? "" : "s"}`;
  el.bestMove.textContent = best ? `${best.currency.code} ${formatPercent(best.weeklyChange)} on ${formatDate(best.date)}` : "-";
  el.worstMove.textContent = worst ? `${worst.currency.code} ${formatPercent(worst.weeklyChange)} on ${formatDate(worst.date)}` : "-";

  if (history.errors.length) {
    el.pointCount.textContent += `; ${history.errors.length} fxapi error${history.errors.length === 1 ? "" : "s"}`;
  }
}

function syncGraphHidden(history) {
  const selectedCodes = new Set(history.series.map(({ currency }) => currency.code));
  graphHidden = new Set([...graphHidden].filter((code) => selectedCodes.has(code)));
}

function toggleGraphCurrency(code) {
  if (graphHidden.has(code)) {
    graphHidden.delete(code);
  } else {
    graphHidden.add(code);
  }
  if (latestHistory) renderChart(latestHistory);
}

function renderChartModeButtons() {
  [el.valueMode, el.changeMode].forEach((button) => {
    const active = button.dataset.mode === chartMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderLoading() {
  const controls = readControls();
  latestHistory = null;
  el.selectedCount.textContent = `${controls.selected.length} selected`;
  el.rangeTitle.textContent = `${formatDate(controls.start)} to ${formatDate(controls.end)}`;
  el.pointCount.textContent = "Loading fxapi data";
  el.bestMove.textContent = "-";
  el.worstMove.textContent = "-";
  el.chart.innerHTML = `<div class="empty-state">Loading fxapi history...</div>`;
  el.historyHead.innerHTML = "";
  el.historyBody.innerHTML = `<tr><td>Loading fxapi history...</td></tr>`;
}

async function render() {
  const token = ++renderToken;
  renderLoading();

  try {
    const history = await buildHistory();
    if (token !== renderToken) return;
    latestHistory = history;
    syncGraphHidden(history);
    renderSummary(history);
    renderChartModeButtons();
    renderChart(history);
    renderTable(history);
  } catch (error) {
    if (token !== renderToken) return;
    el.chart.innerHTML = `<div class="empty-state">Could not load fxapi data: ${error.message}</div>`;
    el.historyBody.innerHTML = `<tr><td>Could not load fxapi data: ${error.message}</td></tr>`;
  }
}

function setSelection(codes) {
  currencies.forEach((currency) => {
    const checkbox = document.querySelector(`[data-currency="${currency.code}"]`);
    checkbox.checked = codes.has(currency.code);
  });
}

function downloadCsv() {
  const history = latestHistory;
  if (!history) return;

  const header = ["currency", "code", ...history.dates.map((date, index) => `${index === 0 ? "$100" : `wk_${index + 1}`}_${dateKey(date)}`)];
  const csvRows = history.series.map(({ currency, points }) => [
    currency.name,
    currency.code,
    ...points.map((point) => formatValue(point.value, currency.code))
  ]);
  const csv = [header, ...csvRows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "currency-history.csv";
  link.click();
  URL.revokeObjectURL(url);
}

buildCurrencyList();
syncDateBounds();

[el.usdAmount, el.startDate, el.endDate].forEach((input) => {
  input.addEventListener("input", render);
});

el.selectAll.addEventListener("click", () => {
  setSelection(new Set(currencies.map((currency) => currency.code)));
  render();
});

el.clearAll.addEventListener("click", () => {
  setSelection(new Set());
  render();
});

el.reset.addEventListener("click", () => {
  el.usdAmount.value = "100";
  el.startDate.value = "2026-01-01";
  el.endDate.value = "2026-04-02";
  setSelection(defaultSelected);
  render();
});

el.downloadCsv.addEventListener("click", downloadCsv);

[el.valueMode, el.changeMode].forEach((button) => {
  button.addEventListener("click", () => {
    chartMode = button.dataset.mode;
    renderChartModeButtons();
    if (latestHistory) renderChart(latestHistory);
  });
});

render();
