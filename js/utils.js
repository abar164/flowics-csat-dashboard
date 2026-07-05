// ============================================================
// utils.js — pure helper functions. No DOM access, no state.
// ============================================================

import { C, FIN_NAMES, ME_NAMES, NEUTRAL_R, NEGATIVE_R } from './config.js';

export const isFin = n => FIN_NAMES.includes(n.toLowerCase().trim());
export const isMe  = n => ME_NAMES.includes(n.toLowerCase().trim());

export const initials = n =>
  isFin(n) ? 'AI' : n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export const shortName = n => {
  if (isFin(n)) return 'Fin AI';
  const p = n.split(' ');
  return p[0] + (p[1] ? ' ' + p[1][0] + '.' : '');
};

export const csatColor = v => (v >= 98 ? C.green : v >= 90 ? C.amber : C.red);

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
  return `${mn}:${s.toString().padStart(2, '0')}`;
}

export function fmtHours(h) {
  if (h == null) return '—';
  const hr = Math.floor(h), mn = Math.round((h - hr) * 60);
  return `${hr}h ${mn}m`;
}

/** Month-over-month delta as colored HTML span. */
export function delta(curr, prev, suffix = '%', lowerIsBetter = false, dec = 1) {
  if (curr == null || prev == null) return '';
  const d = curr - prev;
  const good = lowerIsBetter ? d <= 0 : d >= 0;
  const color = Math.abs(d) < 0.001 ? C.text3 : good ? C.green : C.red;
  const sign = d > 0 ? '+' : '';
  return `<span style="color:${color}">${sign}${d.toFixed(dec)}${suffix} vs prev</span>`;
}

/** Run cb once Chart.js (CDN) is available. */
export function whenChart(cb) {
  if (window.Chart) cb();
  else setTimeout(() => whenChart(cb), 60);
}
