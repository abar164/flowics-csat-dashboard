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

/** Run cb once Chart.js (CDN) is available. */
export function whenChart(cb) {
  if (window.Chart) cb();
  else setTimeout(() => whenChart(cb), 60);
}
