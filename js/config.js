// ============================================================
// config.js — design tokens, goals, and rating taxonomy.
// Palette: purple is the brand and the default data colour.
// Semantic colours (ok / warn / bad) are used sparingly and only
// where the colour carries meaning. Mirror any change in
// css/styles.css (:root) — Chart.js needs the values in JS.
// ============================================================

export const C = {
  bg: '#161826', surface: '#232532', surface2: '#2b2d3b', border: '#3f424d',

  // the single brand accent + its ramp (100 = lightest, 900 = darkest)
  accent: '#9184d9',
  accent300: '#d2cefd', accent400: '#b5abfc', accent700: '#5d5294', accent900: '#2b2741',

  // neutrals
  n200: '#e4e7f5', n300: '#cfd3e5', n400: '#b2b6ca', n600: '#75798c', n700: '#595d6c', n800: '#3f424d',

  text: '#e9e9ed',
  text2: 'rgba(233,233,237,.62)',
  text3: 'rgba(233,233,237,.45)',

  // semantic — meaning only, never decoration
  ok: '#6ee7a8',      // clearly good: at or above goal, zero detractors
  warn: '#e0b95f',    // neutral / needs a look
  bad: '#f08c86',     // detractors, missed goals
  flat: 'rgba(233,233,237,.45)'
};

export const GOALS = {
  csat: 95,             // % target
  negRate: 5,           // max % negative
  avgRating: 4.5,       // out of 5
  finCsatDropAlert: 15, // pts month-over-month drop that triggers alert
  finPanelShare: 15,    // % of rated volume Fin AI must reach to earn its own panel
  topAgentMinRated: 5,  // min ratings to qualify as top performer

  // Backlog only earns a "What moved" bullet when the shift is material.
  // The percentage gate carries an absolute floor so 10 → 12 (+20%) does
  // not read as a leadership signal.
  backlogMoveAbs: 5,
  backlogMovePct: 15,
  backlogMovePctFloor: 3,

  // Workload is activity, so it only earns narration on a real swing.
  workloadMoveAbs: 20,
  workloadMovePct: 10
};

export const REMARKS_PER_PAGE = [6, 10, 20];

export const POSITIVE_R = new Set(['Amazing', 'Great']);
export const NEUTRAL_R  = new Set(['Neutral', 'Ok']);
export const NEGATIVE_R = new Set(['Bad', 'Terrible']);

export const RORDER = ['Amazing', 'Great', 'Neutral', 'Ok', 'Bad', 'Terrible'];

// Positives in the brand purple, neutrals amber, negatives red.
export const RCOLORS = {
  Amazing: '#9184d9', Great: '#5d5294', Neutral: '#e0b95f',
  Ok: '#b08e42', Bad: '#f08c86', Terrible: '#c76860'
};

export const BADGE = {
  Amazing:  { bg: 'rgba(145,132,217,.18)', fg: '#d2cefd' },
  Great:    { bg: 'rgba(145,132,217,.10)', fg: '#b5abfc' },
  Neutral:  { bg: 'rgba(224,185,95,.14)',  fg: '#e0b95f' },
  Ok:       { bg: 'rgba(224,185,95,.10)',  fg: '#e0b95f' },
  Bad:      { bg: 'rgba(240,140,134,.14)', fg: '#f08c86' },
  Terrible: { bg: 'rgba(240,140,134,.20)', fg: '#f08c86' }
};

export const ME_NAMES  = ['andres barraza', 'andrés barraza'];
export const FIN_NAMES = ['fin ai agent'];
