// ============================================================
// charts.js — the two Chart.js instances that earn a canvas.
// Everything else (agent bars, rating mix, channel volume) is
// plain CSS in components.js — faster and easier to style.
// Each builder destroys the previous instance for its slot.
// ============================================================

import { C } from './config.js';

const charts = {};

/**
 * The canvas is sized from its container. If the stylesheet has not been
 * applied yet the container measures 0 and Chart.js sizes the canvas to
 * 0×0 — and its own resize detection may never fire — so poll briefly
 * until the container has a real height, then size the chart once.
 */
function settle(chart, canvas, tries = 0) {
  const box = canvas.parentElement;
  if (!chart || !box) return;
  if (box.clientHeight > 0 && box.clientWidth > 0) {
    chart.resize();
    if (canvas.height > 0) return;
  }
  if (tries < 40) setTimeout(() => settle(chart, canvas, tries + 1), 25);
}

function mount(key, canvas, cfg) {
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas, cfg);
  settle(charts[key], canvas);
  return charts[key];
}

const resizeAll = () => Object.values(charts).forEach(c => c && c.resize());
window.addEventListener('resize', resizeAll);
window.addEventListener('load', resizeAll);

// ---- shared style fragments ----
const ticks = () => ({ font: { size: 11, family: 'Inter' }, color: C.text3 });
const grid = () => ({ color: 'rgba(233,233,237,.07)', drawTicks: false });
const tooltip = () => ({
  backgroundColor: C.surface,
  borderColor: C.border,
  borderWidth: 1,
  titleColor: C.text,
  bodyColor: C.text2,
  padding: 10,
  displayColors: false,
  titleFont: { family: 'Inter', size: 12, weight: '500' },
  bodyFont: { family: 'Inter', size: 12 }
});
const legend = () => ({
  labels: {
    font: { size: 11, family: 'Inter' },
    color: C.text2,
    boxWidth: 10,
    boxHeight: 10,
    usePointStyle: false
  }
});

/** CSAT % line over volume bars, current month highlighted. */
export function buildTrendChart(canvas, months, data, currentIdx) {
  const labels = months.map(m => m.label.replace(' 20', " '"));
  const full = months.map(m => m.label);
  const csat = months.map(m => data[m.key]?.csat ?? null);
  const vol = months.map(m => data[m.key]?.total ?? null);

  mount('trend', canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Rated volume', data: vol,
          backgroundColor: months.map((_, i) =>
            i === currentIdx ? 'rgba(233,233,237,.16)' : 'rgba(233,233,237,.07)'),
          borderWidth: 0, borderRadius: 2, barPercentage: .55, yAxisID: 'y2', order: 2
        },
        {
          type: 'line', label: 'CSAT %', data: csat,
          borderColor: C.accent, borderWidth: 2.25, tension: .3, fill: false,
          pointRadius: months.map((_, i) => (i === currentIdx ? 5 : 2.5)),
          pointBackgroundColor: C.bg,
          pointBorderColor: C.accent,
          pointBorderWidth: 1.5,
          yAxisID: 'y1', order: 1
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legend(),
        tooltip: {
          ...tooltip(),
          callbacks: {
            title: items => full[items[0].dataIndex],
            label: ctx => ctx.dataset.label === 'CSAT %'
              ? ` CSAT ${ctx.parsed.y?.toFixed(1)}%`
              : ` ${ctx.parsed.y} rated conversations`
          }
        }
      },
      scales: {
        y1: { position: 'left', min: 85, max: 100, ticks: { callback: v => v + '%', ...ticks() }, grid: grid(), border: { display: false } },
        y2: { position: 'right', min: 0, ticks: ticks(), grid: { display: false }, border: { display: false } },
        x: { ticks: ticks(), grid: { display: false }, border: { color: 'rgba(233,233,237,.16)' } }
      }
    }
  });
}

/** First response time (minutes) across the 13 months. */
export function buildOpsTrendChart(canvas, opsData) {
  mount('opsTrend', canvas, {
    type: 'line',
    data: {
      labels: opsData.labels.map(l => l.replace(' 20', " '")),
      datasets: [{
        label: 'First response (min)',
        data: opsData.metrics.frt,
        borderColor: C.accent, borderWidth: 1.75, tension: .3, fill: false,
        pointRadius: 3.5, pointBackgroundColor: C.bg, pointBorderColor: C.accent, pointBorderWidth: 1.5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltip(), callbacks: { label: ctx => ' ' + ctx.parsed.y + ' min' } }
      },
      scales: {
        y: { min: 0, ticks: { callback: v => v + 'm', ...ticks() }, grid: grid(), border: { display: false } },
        x: { ticks: ticks(), grid: { display: false }, border: { color: 'rgba(233,233,237,.16)' } }
      }
    }
  });
}
