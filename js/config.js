// ============================================================
// config.js — design tokens, goals, and rating taxonomy.
// Change a color or goal here and it propagates everywhere.
// ============================================================

export const C = {
  bg: '#0d1117', surface: '#161b22', surface2: '#21262d', border: '#30363d',
  accent: '#378ADD', green: '#3fb950', red: '#f85149', redDark: '#a5342c',
  amber: '#e3b341', purple: '#bc8cff',
  text: '#e6edf3', text2: '#9aa4ae', text3: '#768390'
};

export const GOALS = {
  csat: 95,            // % target
  negRate: 5,          // max % negative
  avgRating: 4.5,      // out of 5
  finCsatDropAlert: 15 // pts month-over-month drop that triggers alert
};

export const POSITIVE_R = new Set(['Amazing', 'Great']);
export const NEUTRAL_R  = new Set(['Neutral', 'Ok']);
export const NEGATIVE_R = new Set(['Bad', 'Terrible']);

export const RORDER = ['Amazing', 'Great', 'Neutral', 'Ok', 'Bad', 'Terrible'];

export const RCOLORS = {
  Amazing: '#3fb950', Great: '#378ADD', Neutral: '#e3b341',
  Ok: '#768390', Bad: '#f85149', Terrible: '#a5342c'
};

export const BADGE = {
  Amazing:  { bg: 'rgba(63,185,80,.15)',   fg: '#3fb950' },
  Great:    { bg: 'rgba(55,138,221,.15)',  fg: '#378ADD' },
  Neutral:  { bg: 'rgba(227,179,65,.15)',  fg: '#e3b341' },
  Ok:       { bg: 'rgba(118,131,144,.18)', fg: '#9aa4ae' },
  Bad:      { bg: 'rgba(248,81,73,.15)',   fg: '#f85149' },
  Terrible: { bg: 'rgba(165,52,44,.28)',   fg: '#e08b84' }
};

export const ME_NAMES  = ['andres barraza', 'andrés barraza'];
export const FIN_NAMES = ['fin ai agent'];
