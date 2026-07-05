// ============================================================
// charts.js — every Chart.js instance lives here.
// Each builder destroys the previous instance for its slot,
// so callers can re-render freely on month change.
// ============================================================

import { C, RORDER, RCOLORS } from './config.js';
import { shortName, isFin } from './utils.js';

const charts = {};

function mount(key, canvas, cfg) {
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas, cfg);
  return charts[key];
}

// ---- shared style fragments ----
const ticks = (sz = 11) => ({ font: { size: sz }, color: C.text2 });
const tooltip = () => ({ backgroundColor: '#161b22', borderColor: '#30363d', borderWidth: 1 });
const legend = () => ({ labels: { font: { size: 11 }, color: C.text2, boxWidth: 10 } });

/** CSAT % line + volume bars across all months, current month highlighted. */
export function buildTrendChart(canvas, months, data, currentIdx) {
  const labels = months.map(m => m.label);
  const csat = months.map(m => data[m.key]?.csat ?? null);
  const vol = months.map(m => data[m.key]?.total ?? null);
  const pointColors = months.map((_, i) => (i === currentIdx ? C.red : C.green));
  const pointRadii = months.map((_, i) => (i === currentIdx ? 7 : 3));

  mount('trend', canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Volume', data: vol,
          backgroundColor: months.map((_, i) => i === currentIdx ? 'rgba(55,138,221,.35)' : 'rgba(55,138,221,.15)'),
          borderColor: months.map((_, i) => i === currentIdx ? 'rgba(55,138,221,.7)' : 'rgba(55,138,221,.3)'),
          borderWidth: 1, borderRadius: 3, yAxisID: 'y2', order: 2
        },
        {
          type: 'line', label: 'CSAT %', data: csat,
          borderColor: C.green, backgroundColor: 'rgba(63,185,80,0.05)',
          borderWidth: 2.5, pointRadius: pointRadii, pointBackgroundColor: pointColors,
          tension: 0.3, fill: true, yAxisID: 'y1', order: 1
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legend(),
        tooltip: {
          ...tooltip(),
          callbacks: {
            label: ctx => ctx.dataset.label === 'CSAT %'
              ? ` CSAT: ${ctx.parsed.y?.toFixed(1)}%`
              : ` Volume: ${ctx.parsed.y} rated`
          }
        }
      },
      scales: {
        y1: { type: 'linear', position: 'left', min: 85, max: 102, ticks: { callback: v => v + '%', ...ticks() }, grid: { color: 'rgba(48,54,61,.4)' } },
        y2: { type: 'linear', position: 'right', ticks: ticks(), grid: { display: false } },
        x: { ticks: { ...ticks(), maxRotation: 45 }, grid: { display: false } }
      }
    }
  });
}

/** Doughnut of rating distribution for a month. */
export function buildDonutChart(canvas, d) {
  const labels = RORDER.filter(r => (d.ratings[r] || 0) > 0);
  mount('donut', canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: labels.map(r => d.ratings[r]), backgroundColor: labels.map(r => RCOLORS[r]), borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, color: C.text2, boxWidth: 10, padding: 6 } },
        tooltip: tooltip()
      }
    }
  });
}

/** Stacked positive/negative volume per agent. */
export function buildAgentVolumeChart(canvas, d) {
  const labels = d.agents.map(a => shortName(a.name));
  const pos = d.agents.map(a => Math.round(a.total * a.csat / 100));
  const neg = d.agents.map(a => a.total - Math.round(a.total * a.csat / 100));
  mount('agent', canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Positive', data: pos, backgroundColor: C.accent, borderRadius: 4 },
        { label: 'Negative', data: neg, backgroundColor: 'rgba(248,81,73,.5)', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legend(), tooltip: tooltip() },
      scales: {
        x: { stacked: true, ticks: ticks(), grid: { display: false } },
        y: { stacked: true, ticks: ticks(), grid: { color: 'rgba(48,54,61,.4)' } }
      }
    }
  });
}

/** CSAT vs volume scatter, humans vs Fin AI. */
export function buildAgentScatterChart(canvas, d) {
  const toPoint = a => ({ x: a.total, y: a.csat, label: shortName(a.name) });
  const humans = d.agents.filter(a => !isFin(a.name)).map(toPoint);
  const fin = d.agents.filter(a => isFin(a.name)).map(toPoint);
  mount('scatter', canvas, {
    type: 'scatter',
    data: {
      datasets: [
        { label: 'Human Agents', data: humans, backgroundColor: 'rgba(55,138,221,.8)', pointRadius: 9, pointHoverRadius: 11 },
        { label: 'Fin AI', data: fin, backgroundColor: 'rgba(188,140,255,.85)', pointRadius: 9, pointHoverRadius: 11 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: legend(),
        tooltip: { ...tooltip(), callbacks: { label: ctx => ` ${ctx.raw.label}: ${ctx.raw.y}% CSAT · ${ctx.raw.x} rated` } }
      },
      scales: {
        x: { title: { display: true, text: 'Volume (rated convs)', font: { size: 11 }, color: C.text2 }, ticks: ticks(), grid: { color: 'rgba(48,54,61,.3)' } },
        y: { title: { display: true, text: 'CSAT %', font: { size: 11 }, color: C.text2 }, min: 40, max: 102, ticks: { callback: v => v + '%', ...ticks() }, grid: { color: 'rgba(48,54,61,.3)' } }
      }
    }
  });
}

/** Per-agent monthly trend inside the drill-down modal. */
export function buildModalTrendChart(canvas, months) {
  mount('modal', canvas, {
    type: 'line',
    data: {
      labels: months.map(m => m.label),
      datasets: [
        { label: 'CSAT %', data: months.map(m => m.csat), borderColor: C.green, borderWidth: 2, pointRadius: 4, tension: .3, yAxisID: 'y1' },
        { label: 'Volume', data: months.map(m => m.total), borderColor: C.accent, borderWidth: 2, pointRadius: 4, tension: .3, yAxisID: 'y2', borderDash: [4, 3] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legend(), tooltip: tooltip() },
      scales: {
        y1: { position: 'left', min: 40, max: 102, ticks: { callback: v => v + '%', ...ticks(9) }, grid: { color: 'rgba(48,54,61,.3)' } },
        y2: { position: 'right', ticks: ticks(9), grid: { display: false } },
        x: { ticks: ticks(9), grid: { display: false } }
      }
    }
  });
}

/** Stacked email/chat channel volume (ops tab). */
export function buildOpsChannelChart(canvas, opsData) {
  const m = opsData.metrics;
  mount('opsChannel', canvas, {
    type: 'bar',
    data: {
      labels: opsData.labels,
      datasets: [
        { label: 'Email', data: m.email, backgroundColor: 'rgba(227,179,65,.6)', borderRadius: 3, stack: 's' },
        { label: 'Chat', data: m.chat, backgroundColor: 'rgba(55,138,221,.7)', borderRadius: 3, stack: 's' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: legend(), tooltip: tooltip() },
      scales: {
        x: { stacked: true, ticks: { ...ticks(), maxRotation: 45 }, grid: { display: false } },
        y: { stacked: true, ticks: ticks(), grid: { color: 'rgba(48,54,61,.4)' } }
      }
    }
  });
}

/** First-response line + new cases bars (ops tab). */
export function buildOpsTrendChart(canvas, opsData) {
  const m = opsData.metrics;
  mount('opsTrend', canvas, {
    data: {
      labels: opsData.labels,
      datasets: [
        { type: 'bar', label: 'New Cases', data: m.newCases, backgroundColor: 'rgba(55,138,221,.18)', borderColor: 'rgba(55,138,221,.4)', borderWidth: 1, borderRadius: 3, yAxisID: 'y2', order: 2 },
        { type: 'line', label: 'First Response (min)', data: m.frt, borderColor: C.amber, backgroundColor: 'rgba(227,179,65,.06)', borderWidth: 2.5, pointRadius: 4, tension: .3, fill: true, yAxisID: 'y1', order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: legend(), tooltip: tooltip() },
      scales: {
        y1: { position: 'left', ticks: { callback: v => v + 'm', ...ticks() }, grid: { color: 'rgba(48,54,61,.4)' } },
        y2: { position: 'right', ticks: ticks(), grid: { display: false } },
        x: { ticks: { ...ticks(), maxRotation: 45 }, grid: { display: false } }
      }
    }
  });
}
