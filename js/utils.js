// ============================================================
// utils.js — pure helper functions. No DOM access, no state.
// ============================================================

import { C, GOALS, FIN_NAMES, ME_NAMES, NEUTRAL_R, NEGATIVE_R } from './config.js';

export const isFin = n => FIN_NAMES.includes(n.toLowerCase().trim());
export const isMe  = n => ME_NAMES.includes(n.toLowerCase().trim());

export const shortName = n => {
  if (isFin(n)) return 'Fin AI';
  const p = n.split(' ');
  return p[0] + (p[1] ? ' ' + p[1][0] + '.' : '');
};

export const firstName = n => (isFin(n) ? 'Fin AI' : n.split(' ')[0]);

/** CSAT value → semantic colour. At goal is good, near goal needs a look. */
export const csatColor = v =>
  (v >= GOALS.csat ? C.ok : v >= GOALS.csat - 10 ? C.warn : C.bad);

/** Escape a string for safe insertion into HTML. */
export const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Count positive / neutral / negative ratings for a month. */
export function tally(d) {
  const r = d.ratings, g = k => r[k] || 0;
  return {
    pos: g('Amazing') + g('Great'),
    neu: g('Neutral') + g('Ok'),
    neg: g('Bad') + g('Terrible')
  };
}

/** Split detractor list into true negatives vs neutrals. */
export function splitDetractors(d) {
  const det = d.detractors || [];
  return {
    bad: det.filter(r => NEGATIVE_R.has(r.rating)),
    neu: det.filter(r => NEUTRAL_R.has(r.rating))
  };
}

export function fmtMinutes(m) {
  if (m == null) return '—';
  const mn = Math.floor(m), s = Math.round((m - mn) * 60);
  return mn + ':' + s.toString().padStart(2, '0');
}

export function fmtHours(h) {
  if (h == null) return '—';
  const hr = Math.floor(h), mn = Math.round((h - hr) * 60);
  return hr + 'h ' + mn + 'm';
}

/**
 * Month-over-month delta as a coloured span. The arrow carries the
 * direction; the colour says better (green) or worse (red).
 */
export function delta(curr, prev, suffix = '%', lowerIsBetter = false, dec = 1, label = 'vs prev') {
  if (curr == null || prev == null) return '';
  const d = curr - prev;
  const flat = Math.abs(d) < 0.001;
  const good = lowerIsBetter ? d <= 0 : d >= 0;
  const color = flat ? C.flat : good ? C.ok : C.bad;
  const arrow = flat ? '→' : d > 0 ? '↑' : '↓';
  return '<span class="delta" style="color:' + color + '">' + arrow + ' ' +
    Math.abs(d).toFixed(dec) + suffix + ' ' + label + '</span>';
}

/** One-line read of the month, for the hero card. */
export function monthVerdict(d, t) {
  const quality = d.csat >= 99 ? 'Excellent' : d.csat >= GOALS.csat ? 'Strong' : 'Below-target';
  const parts = [];
  if (t.neu) parts.push(t.neu + ' neutral rating' + (t.neu > 1 ? 's' : ''));
  if (t.neg) parts.push(t.neg + ' negative rating' + (t.neg > 1 ? 's' : ''));
  if (!parts.length) return quality + ' satisfaction with no neutral or negative ratings.';
  return quality + ' satisfaction with ' + parts.join(' and ') + '.';
}

/** A duration difference in minutes as m:ss — 0.47 min reads as 0:28. */
export const fmtMinSec = m => {
  const s = Math.round(m * 60);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

/** A duration difference in hours, compact — 37m, or 1h 5m past the hour. */
export const fmtHoursShort = h => {
  const mn = Math.round(h * 60);
  return mn < 60 ? mn + 'm' : Math.floor(mn / 60) + 'h ' + (mn % 60) + 'm';
};

/**
 * A delta whose magnitude runs through a formatter, so a time metric can
 * read as +0:28 instead of +0.47m.
 *
 * `neutral` drops the green/red entirely. Direction only earns a colour
 * when direction has a performance meaning: response and resolution time
 * do, demand and workload volume do not — more cases arriving is not a
 * win or a loss, it is just more work.
 */
export function deltaAs(curr, prev, fmt, { lowerIsBetter = false, neutral = false, dim = false, label = 'vs prev' } = {}) {
  if (curr == null || prev == null) return '';
  const d = curr - prev;
  const flat = Math.abs(d) < 1e-9;
  const color = dim ? C.text3
    : neutral ? C.text2
    : flat ? C.flat
    : (lowerIsBetter ? d < 0 : d > 0) ? C.ok : C.bad;
  const arrow = flat ? '→' : d > 0 ? '↑' : '↓';
  return `<span class="delta" style="color:${color}">${arrow} ${fmt(Math.abs(d))} ${label}</span>`;
}

/** ISO date → "Aug 31". */
export function fmtDay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Everything the Backlog Health section shows, derived from the raw
 * snapshots — nothing is read pre-calculated.
 *
 * Backlog is a stock, not a flow: the month's figure is the LAST
 * snapshot, never a sum of days. Days with no snapshot are absent from
 * the data and stay absent here, so they never dilute the average or
 * fake a low point. Returns null when the month has no backlog data at
 * all, which is how the section knows to stay hidden.
 */
export function backlogView(backlog, monthKey, monthLabel, prevMonthKey, prevMonthLabel) {
  const m = backlog[monthKey];
  if (!m || !m.daily || !m.daily.length) return null;

  const daily = [...m.daily].sort((a, b) => a.date.localeCompare(b.date));
  const ending = daily[daily.length - 1];

  const pm = prevMonthKey ? backlog[prevMonthKey] : null;
  const pDaily = pm && pm.daily && pm.daily.length
    ? [...pm.daily].sort((a, b) => a.date.localeCompare(b.date))
    : null;
  const prevEnding = pDaily ? pDaily[pDaily.length - 1] : null;

  const totals = daily.map(d => d.total);
  const avg = Math.round(totals.reduce((s, n) => s + n, 0) / totals.length);
  const peak = totals.reduce((a, b) => Math.max(a, b), 0);
  const peakDay = daily.find(d => d.total === peak);

  // Composition comes from the latest date that actually carries category
  // rows — which can lag the latest daily snapshot.
  const catDates = Object.keys(m.categories || {}).sort();
  const catDate = catDates.length ? catDates[catDates.length - 1] : null;
  const rows = catDate ? m.categories[catDate] : [];
  const catTotal = rows.reduce((s, r) => s + r[1], 0);
  const categories = rows
    .map(([name, total, open, snoozed]) => ({
      name, total, open, snoozed,
      pct: catTotal ? total / catTotal * 100 : 0
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const [y, mo] = monthKey.split('-').map(Number);
  const fullMonth = k => k
    ? new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    : null;

  return {
    monthKey, monthLabel, prevMonthLabel,
    prevMonthFull: fullMonth(prevMonthKey),
    daily, ending, prevEnding,
    avg, peak, peakDay,
    snapshots: daily.length,
    // A single snapshot is a valid ending backlog but not a trend: one
    // point has no average or peak worth reading, so the section shows
    // the KPIs and suppresses everything that implies a shape.
    hasTrend: daily.length >= 2,
    calendarDays: new Date(y, mo, 0).getDate(),
    catDate, catTotal, categories
  };
}

/** Run cb once Chart.js (CDN) is available. */
export function whenChart(cb) {
  if (window.Chart) cb();
  else setTimeout(() => whenChart(cb), 60);
}
