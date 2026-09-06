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

/** Tear down a slot so a hidden chart never lingers behind a new month. */
export function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
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

/**
 * Daily backlog: total, open and snoozed across the selected month.
 *
 * The x axis is every calendar day of the month, not just the days that
 * have data, so days the snapshot was never calculated show as a break
 * in the line (spanGaps stays off) instead of quietly closing up.
 */
export function buildBacklogChart(canvas, view) {
  const [y, mo] = view.monthKey.split('-').map(Number);
  const byDate = Object.fromEntries(view.daily.map(d => [d.date, d]));
  const labels = [], full = [], total = [], open = [], snoozed = [];

  for (let i = 1; i <= view.calendarDays; i++) {
    const key = `${y}-${String(mo).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const d = byDate[key];
    labels.push(String(i));
    full.push(view.monthLabel.split(' ')[0] + ' ' + i);
    total.push(d ? d.total : null);
    open.push(d ? d.open : null);
    snoozed.push(d ? d.snoozed : null);
  }

  // With only a handful of snapshots the line has nothing to draw, so the
  // points have to carry the reading themselves. The same is true of any
  // single day stranded between two gaps — Aug 24 is the month's peak and
  // has no neighbours to draw a segment to, so it gets a point on every
  // series rather than vanishing from the secondary ones.
  const sparse = view.snapshots <= 3;
  const isolated = i =>
    total[i] != null && (i === 0 || total[i - 1] == null) && (i === total.length - 1 || total[i + 1] == null);
  const radii = (base) => total.map((v, i) => (v == null ? 0 : isolated(i) ? Math.max(base, 2.75) : base));

  const line = (label, data, color, width, base, dash) => ({
    label, data,
    borderColor: color, borderWidth: width, borderDash: dash || [],
    tension: .3, fill: false, spanGaps: false,
    pointRadius: radii(base), pointHoverRadius: base + 2, pointHitRadius: 12,
    pointBackgroundColor: C.bg, pointBorderColor: color, pointBorderWidth: 1.5
  });

  mount('backlog', canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        // Total keeps the hierarchy through weight and saturation, so the two
        // components can sit at a readable lightness without competing:
        // open in the light accent step, snoozed neutral and dashed — a
        // paused state reading as a broken line.
        line('Total', total, C.accent, 2.5, sparse ? 4 : 2.5),
        line('Open', open, C.accent400, 1.5, sparse ? 3 : 0),
        line('Snoozed', snoozed, C.n300, 1.25, sparse ? 3 : 0, [4, 3])
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legend(),
        tooltip: {
          ...tooltip(),
          displayColors: true,
          callbacks: {
            title: items => full[items[0].dataIndex],
            label: ctx => ` ${ctx.dataset.label} ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        y: {
          min: 0,
          ticks: { precision: 0, maxTicksLimit: 6, ...ticks() },
          grid: grid(), border: { display: false }
        },
        x: {
          ticks: { autoSkip: true, maxTicksLimit: 11, maxRotation: 0, ...ticks() },
          grid: { display: false }, border: { color: 'rgba(233,233,237,.16)' }
        }
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
