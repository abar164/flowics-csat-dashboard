// ============================================================
// app.js — state + orchestration.
// Wires data (data.js) through components (components.js) and
// charts (charts.js) into the DOM. One delegated click handler
// and one delegated change handler cover every interaction.
// ============================================================

import { C, GOALS, RORDER, RCOLORS } from './config.js';
import { MONTHS, DATA, OPS_DATA, BACKLOG } from './data.js';
import {
  isFin, tally, splitDetractors, csatColor, fmtMinutes, fmtHours,
  delta, deltaAs, fmtMinSec, fmtHoursShort, monthVerdict, whenChart, esc, fmtDay, backlogView
} from './utils.js';
import * as ui from './components.js';
import * as charts from './charts.js';

// ---------------- state ----------------
const state = {
  monthIdx: MONTHS.length - 1,
  tab: 'csat',
  remarksPage: 0,
  remarksPerPage: 4,
  remarksAgent: 'all',
  backlog: null
};

const el = id => document.getElementById(id);
const currentMonth = () => MONTHS[state.monthIdx];
const currentData = () => DATA[currentMonth().key];
const prevData = () => (state.monthIdx > 0 ? DATA[MONTHS[state.monthIdx - 1].key] : null);

// ---------------- init ----------------
function init() {
  const sel = el('monthSelect');
  MONTHS.forEach(m => {
    const o = document.createElement('option');
    o.value = m.key;
    o.textContent = m.label;
    sel.appendChild(o);
  });
  sel.value = currentMonth().key;

  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);

  el('footerTs').textContent = 'Source: Intercom CSAT export · ' +
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  renderAll();
  whenChart(renderCharts);
}

function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const act = t.dataset.act;
  if (act === 'prev') return step(-1);
  if (act === 'next') return step(1);
  if (act === 'tab-csat') return switchTab('csat');
  if (act === 'tab-ops') return switchTab('ops');
  if (act === 'rprev') return turnPage(-1);
  if (act === 'rnext') return turnPage(1);
}

function onChange(e) {
  const id = e.target.id;
  if (id === 'monthSelect') return selectMonth(e.target.value);
  if (id === 'remarksAgent') { state.remarksAgent = e.target.value; state.remarksPage = 0; return renderRemarks(currentData()); }
}

function resetRemarks() {
  state.remarksPage = 0;
  state.remarksAgent = 'all';
}

function step(dir) {
  const n = state.monthIdx + dir;
  if (n < 0 || n >= MONTHS.length) return;
  state.monthIdx = n;
  resetRemarks();
  renderAll();
  whenChart(renderCharts);
}

function selectMonth(key) {
  state.monthIdx = MONTHS.findIndex(m => m.key === key);
  resetRemarks();
  renderAll();
  whenChart(renderCharts);
}

function switchTab(tab) {
  state.tab = tab;
  el('tabCsatBtn').classList.toggle('tab--active', tab === 'csat');
  el('tabOpsBtn').classList.toggle('tab--active', tab === 'ops');
  el('csatPanel').style.display = tab === 'csat' ? 'flex' : 'none';
  el('opsPanel').style.display = tab === 'ops' ? 'flex' : 'none';
  whenChart(renderCharts);
}

// ---------------- render orchestration ----------------
function renderAll() {
  const isLast = state.monthIdx === MONTHS.length - 1;
  el('monthSelect').value = currentMonth().key;
  el('liveBadge').classList.toggle('live--on', isLast);
  el('wipNote').classList.toggle('note--on', isLast);

  renderCsat();
  renderOps();
}

function renderCharts() {
  if (state.tab === 'csat') {
    charts.buildTrendChart(el('trendChart'), MONTHS, DATA, state.monthIdx);
  } else {
    charts.buildOpsTrendChart(el('opsTrendChart'), OPS_DATA);
    if (state.backlog && state.backlog.hasTrend) charts.buildBacklogChart(el('backlogChart'), state.backlog);
  }
}

// ---------------- 1. how are we doing ----------------
function renderHero(d, prev) {
  const t = tally(d);
  const negRate = d.total > 0 ? t.neg / d.total * 100 : 0;

  // first response comes from the ops sheet, which can lag the CSAT export
  const opsIdx = OPS_DATA.months.indexOf(currentMonth().key);
  const useOps = opsIdx !== -1 ? opsIdx : OPS_DATA.months.length - 1;
  const frt = OPS_DATA.metrics.frt[useOps];
  const pFrt = useOps > 0 ? OPS_DATA.metrics.frt[useOps - 1] : null;
  const rr = OPS_DATA.metrics.responseRate[useOps];

  el('csatKicker').textContent = 'CSAT · ' + d.label;
  el('csatBig').textContent = d.csat + '%';
  el('csatBig').style.color = csatColor(d.csat);
  el('csatMeta').innerHTML =
    (prev ? delta(d.csat, prev.csat, ' pts', false, 1, 'vs ' + prev.label.split(' ')[0]) : '') +
    `<span>Goal ${GOALS.csat}%</span>`;
  el('csatVerdict').textContent = monthVerdict(d, t);

  el('csatFacts').innerHTML =
    ui.fact({
      label: 'Conversations rated',
      value: d.total,
      sub: `${t.pos} positive · ${t.neu} neutral · ${t.neg} negative`
    }) +
    ui.fact({
      label: 'Average rating',
      value: d.avg,
      sub: `out of 5.0 · goal ${GOALS.avgRating}`,
      color: d.avg >= GOALS.avgRating ? C.ok : C.warn
    }) +
    ui.fact({
      label: 'Negative rate',
      value: negRate.toFixed(1) + '%',
      sub: t.neg ? `${t.neg} detractor${t.neg > 1 ? 's' : ''}` : `no detractors · goal ≤${GOALS.negRate}%`,
      color: negRate === 0 ? C.ok : negRate <= GOALS.negRate ? C.warn : C.bad
    }) +
    ui.fact({
      label: 'First response',
      value: frt != null ? fmtMinutes(frt) : '—',
      sub: opsIdx === -1
        ? `${OPS_DATA.labels[useOps]} · ops sheet lags`
        : (pFrt != null
            ? deltaAs(frt, pFrt, fmtMinSec, {
                lowerIsBetter: true,
                label: 'vs ' + OPS_DATA.labels[useOps - 1].split(' ')[0]
              })
            : 'minutes · avg')
    }) +
    ui.fact({
      label: 'Response rate',
      value: rr != null ? rr + '%' : '—',
      sub: 'surveys answered'
    });
}

// ---------------- 2. who is driving the results ----------------
function renderAgents(d) {
  const agents = [...d.agents].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...agents.map(a => a.total));
  el('agentBars').innerHTML = ui.agentHead() + agents.map(a => ui.agentBar(a, max)).join('');

  // top performer
  const qualified = d.agents.filter(a => !isFin(a.name) && a.total >= GOALS.topAgentMinRated);
  const byVol = d.agents.filter(a => !isFin(a.name)).sort((a, b) => b.total - a.total)[0];
  const top = [...qualified].sort((a, b) => b.csat - a.csat || b.total - a.total)[0] || byVol;
  el('topPanel').innerHTML = top ? `
    <div class="panel__head">
      <h2 class="panel__title">Top performer</h2>
      <span class="panel__note">Min. ${GOALS.topAgentMinRated} ratings</span>
    </div>
    <div class="top__name">${esc(top.name)}</div>
    <div class="top__sub">${(top.total / d.total * 100).toFixed(0)}% of rated volume</div>
    <div class="stats">
      ${ui.stat('Rated', top.total)}
      ${ui.stat('Avg', top.avg)}
      ${ui.stat('CSAT', `<span style="color:${csatColor(top.csat)}">${top.csat}%</span>`)}
    </div>` : '';

  // Fin AI earns its own panel only once it carries real volume
  const fin = d.agents.find(a => isFin(a.name));
  const share = fin && d.total > 0 ? fin.total / d.total * 100 : 0;
  const show = fin && share >= GOALS.finPanelShare;
  el('finPanel').style.display = show ? '' : 'none';
  if (show) {
    el('finPanel').innerHTML = `
      <div class="panel__head">
        <h2 class="panel__title">Fin AI</h2>
        <span class="tag" style="background:rgba(145,132,217,.18);color:var(--accent-300)">${share.toFixed(1)}% of volume</span>
      </div>
      <div class="stats">
        ${ui.stat('Rated', fin.total)}
        ${ui.stat('Avg', fin.avg)}
        ${ui.stat('CSAT', `<span style="color:${csatColor(fin.csat)}">${fin.csat}%</span>`)}
      </div>`;
  }
}

// ---------------- 3. rating mix ----------------
function renderMix(d) {
  const rmax = Math.max(1, ...Object.values(d.ratings));
  el('mixNote').textContent = `${d.total} ratings`;
  el('ratingBars').innerHTML = RORDER
    .filter(r => (d.ratings[r] || 0) > 0)
    .map(r => ui.distributionBar(r, d.ratings[r], rmax, RCOLORS[r]))
    .join('');
}

// ---------------- 4. attention needed ----------------
function renderAttention(d) {
  const sd = splitDetractors(d);
  const items = [...sd.bad, ...sd.neu];
  const bits = [];
  if (sd.bad.length) bits.push(`${sd.bad.length} detractor${sd.bad.length > 1 ? 's' : ''}`);
  if (sd.neu.length) bits.push(`${sd.neu.length} neutral`);
  el('attnNote').textContent = bits.join(' · ');

  el('attnList').innerHTML = items.length
    ? items.map(ui.attentionItem).join('')
    : `<div class="attn attn--clear">No issues requiring attention this month.</div>`;
}

// ---------------- 5. customer remarks ----------------
function remarkAgents(d) {
  return [...new Set((d.remarks || []).map(r => r.agent))].sort();
}

function renderRemarks(d) {
  const all = d.remarks || [];
  const list = state.remarksAgent === 'all' ? all : all.filter(r => r.agent === state.remarksAgent);
  const per = state.remarksPerPage;
  const totalPages = Math.max(1, Math.ceil(list.length / per));
  if (state.remarksPage > totalPages - 1) state.remarksPage = totalPages - 1;
  const start = state.remarksPage * per;
  const page = list.slice(start, start + per);

  el('remarksNote').textContent =
    `${all.length} customer remark${all.length === 1 ? '' : 's'} · ${per} per page`;

  el('remarksToolbar').innerHTML =
    ui.select('remarksAgent', 'Agent', [
      { value: 'all', label: `All agents (${all.length})` },
      ...remarkAgents(d).map(a => ({
        value: a,
        label: `${a} (${all.filter(r => r.agent === a).length})`
      }))
    ], state.remarksAgent) +
    `<span class="toolbar__count">${list.length} shown</span>`;

  el('remarksList').innerHTML = page.length
    ? page.map(ui.remarkItem).join('')
    : '<p class="remarks-empty">No remarks for this filter.</p>';

  el('remarksPager').innerHTML = totalPages > 1 ? ui.pager(state.remarksPage, totalPages) : '';
}

function turnPage(dir) {
  state.remarksPage = Math.max(0, state.remarksPage + dir);
  renderRemarks(currentData());
}

// ---------------- satisfaction tab ----------------
function renderCsat() {
  const d = currentData();
  renderHero(d, prevData());
  renderAgents(d);
  renderMix(d);
  renderAttention(d);
  renderRemarks(d);
}

// ---------------- operations tab ----------------
function renderOps() {
  const mk = currentMonth().key;
  const idx = OPS_DATA.months.indexOf(mk);
  const note = el('opsNote');
  note.classList.toggle('note--on', idx === -1);
  if (idx === -1) {
    note.textContent = `Operations data for ${DATA[mk].label} is not in the sheet yet — it updates with a slight lag. Showing the most recent available month.`;
  }

  const i = idx !== -1 ? idx : OPS_DATA.months.length - 1;
  const p = i - 1, m = OPS_DATA.metrics;
  const vs = p >= 0 ? 'vs ' + OPS_DATA.labels[p].split(' ')[0] : 'vs prev';
  const get = (k, j) => (j >= 0 ? m[k][j] : null);
  const dd = (k, su = '', lo = false, dec = 1) => delta(get(k, i), get(k, p), su, lo, dec);

  const nc = get('newCases', i), pnc = get('newCases', p);
  el('opsKicker').textContent = 'Case volume · ' + OPS_DATA.labels[i];
  el('opsBig').textContent = nc ?? '—';
  // Demand, not performance: the hero delta stays neutral so it agrees
  // with the New cases tile a few rows below it.
  el('opsMeta').innerHTML = (nc != null && pnc != null)
    ? deltaAs(nc / pnc * 100, 100, n => n.toFixed(0) + '%', { neutral: true, label: vs }) +
      `<span>${pnc} → ${nc}</span>`
    : '';

  // Backlog follows the SELECTED month, not the ops sheet's lagged index.
  const bl = backlogView(
    BACKLOG, mk, DATA[mk]?.label ?? mk,
    state.monthIdx > 0 ? MONTHS[state.monthIdx - 1].key : null,
    state.monthIdx > 0 ? MONTHS[state.monthIdx - 1].label : null
  );
  state.backlog = bl;
  renderBacklog(bl);

  const bullets = [];
  const frt = get('frt', i), pfrt = get('frt', p);
  const res = get('resTime', i), pres = get('resTime', p);
  if (frt != null && pfrt != null) {
    const dir = frt < pfrt ? 'improved to' : frt > pfrt ? 'increased to' : 'held at';
    const rs = (res != null && pres != null)
      ? ` Resolution time ${res < pres ? 'improved' : res > pres ? 'grew' : 'held'} to ${fmtHours(res)}.` : '';
    bullets.push(`First response time ${dir} ${fmtMinutes(frt)} (was ${fmtMinutes(pfrt)}).${rs}`);
  }
  const kb = get('kbViews', i), pkb = get('kbViews', p);
  if (kb != null && pkb != null) {
    bullets.push(`Knowledge Base views ${kb >= pkb ? 'grew' : 'dropped'} to ${kb.toLocaleString()} (was ${pkb.toLocaleString()}).`);
  }
  const cc = get('closedConv', i), pcc = get('closedConv', p);
  if (cc != null && pcc != null) {
    bullets.push(`${cc} conversations closed, ${Math.abs(cc - pcc)} ${cc >= pcc ? 'more' : 'fewer'} than last month.`);
  }

  // Workload is activity, not performance — the bullet states the move and
  // its composition, and draws no conclusion from it. It only earns a line
  // when the shift is large enough to change how the month felt.
  const wlNow = get('workload', i), wlPrev = get('workload', p);
  if (wlNow != null && wlPrev != null) {
    const dw = wlNow - wlPrev, aw = Math.abs(dw);
    const pw = wlPrev ? aw / wlPrev * 100 : 0;
    if (aw >= GOALS.workloadMoveAbs && pw >= GOALS.workloadMovePct) {
      const roNow = get('reopened', i);
      const pKey = OPS_DATA.months[p];
      const pFull = new Date(+pKey.slice(0, 4), +pKey.slice(5, 7) - 1, 1)
        .toLocaleDateString('en-US', { month: 'long' });
      bullets.splice(1, 0,
        `Total support workload ${dw > 0 ? 'increased' : 'decreased'} to ${wlNow}, ` +
        `${dw > 0 ? 'up' : 'down'} ${aw} from ${pFull}` +
        (roNow != null && nc != null
          ? `, driven by ${nc} new cases and ${roNow} reopened conversations.` : '.'));
    }
  }

  const blBullet = backlogBullet(bl);
  if (blBullet) bullets.unshift(blBullet);

  el('opsBullets').innerHTML = bullets.length
    ? bullets.slice(0, 4).map(b => `<li><span>${b}</span></li>`).join('')
    : `<li><span>${OPS_DATA.labels[i]} is the earliest month on record — nothing to compare it against yet.</span></li>`;

  const pct = k => (get(k, i) != null ? get(k, i) + '%' : '—');

  // The sheet's resRate column is pre-rounded to one decimal (1.1), so the
  // ratio is computed from the raw counts instead: closed ÷ new. 1.08 means
  // we closed 1.08 cases for every one that came in. Reopens deliberately
  // stay out of it — the question is whether the queue is draining.
  const ratio = (cc != null && nc) ? cc / nc : null;
  const ro = get('reopened', i), pro = get('reopened', p);
  const wl = get('workload', i), pwl = get('workload', p);
  const rr = get('reopenRate', i);
  const whole = n => n.toFixed(0);

  el('opsTiles').innerHTML =
    // Demand: neutral. More cases arriving is not a win or a loss.
    ui.tile('New cases', nc ?? '—',
      deltaAs(nc, pnc, whole, { neutral: true, label: vs })) +
    ui.tile('Closed', cc ?? '—',
      deltaAs(cc, pcc, whole, { label: vs }),
      ratio != null ? `${ratio.toFixed(2)}× vs new` : '') +
    // The share explains what 53 means; the monthly change is secondary,
    // so it sits under it and drops a step in weight.
    ui.tile('Reopened', ro ?? '—',
      deltaAs(ro, pro, whole, { dim: true, label: vs }),
      rr != null ? `${rr.toFixed(1)}% of new cases` : '',
      'Reopen activity rate. Reopens may include follow-ups or new issues reported through an existing live chat conversation — not failed resolutions.',
      true) +
    ui.tile('Total workload', wl ?? '—',
      deltaAs(wl, pwl, whole, { neutral: true, label: vs }), '',
      'New incoming cases + reopened conversations. Activity, not unique conversations.') +
    // Speed: direction has a clear meaning, so it keeps the colour.
    ui.tile('First response', fmtMinutes(frt),
      deltaAs(frt, pfrt, fmtMinSec, { lowerIsBetter: true, label: vs })) +
    ui.tile('Resolution time', fmtHours(res),
      deltaAs(res, pres, fmtHoursShort, { lowerIsBetter: true, label: vs }));

  el('chanShare').textContent = get('chatPct', i) != null
    ? `Chat share ${get('chatPct', i)}%` : '';

  const totals = m.chat.map((c, j) => c + m.email[j]);
  const cmax = Math.max(...totals) * 1.08;
  el('chanChart').innerHTML =
    `<div class="chan">${OPS_DATA.labels.map((l, j) =>
      ui.channelBar(l, m.chat[j], m.email[j], cmax, j === i)).join('')}</div>` +
    `<div class="chan__labels">${OPS_DATA.labels.map(l =>
      `<span class="chan__label">${l.split(' ')[0]}</span>`).join('')}</div>`;

  el('qaLines').innerHTML =
    ui.statLine('Surveys sent', get('surveysSent', i) ?? '—', dd('surveysSent', '', false, 0)) +
    ui.statLine('Conversations rated', get('convRated', i) ?? '—', dd('convRated', '', false, 0)) +
    ui.statLine('Response rate', pct('responseRate'), dd('responseRate', ' pts')) +
    ui.statLine('CSAT score', pct('csatScore'), dd('csatScore', ' pts'));

  el('selfLines').innerHTML =
    ui.statLine('Knowledge Base views', get('kbViews', i)?.toLocaleString() ?? '—', dd('kbViews', '', false, 0)) +
    ui.statLine('Active users', get('activeUsers', i)?.toLocaleString() ?? '—', dd('activeUsers', '', false, 0));
}

// ---------------- backlog health ----------------
/** Percentage in prose: 40% rather than 40.0%, one decimal when it earns it. */
const pctText = n => (Math.abs(n - Math.round(n)) < 0.05 ? Math.round(n) : n.toFixed(1)) + '%';

/**
 * Backlog earns a "What moved" line only when the shift is material:
 * a big enough absolute move, or a big enough percentage move that also
 * clears an absolute floor. Without the floor, 10 → 12 would read as a
 * 20% swing and crowd out something that matters.
 */
function backlogBullet(bl) {
  if (!bl || !bl.prevEnding) return null;
  const now = bl.ending.total, was = bl.prevEnding.total;
  const d = now - was, abs = Math.abs(d);
  const pct = was ? abs / was * 100 : 0;
  const material = abs >= GOALS.backlogMoveAbs ||
    (pct >= GOALS.backlogMovePct && abs >= GOALS.backlogMovePctFloor);
  if (!material) return null;

  const prev = bl.prevMonthFull || (bl.prevMonthLabel || '').split(' ')[0];
  let s = `Backlog ${d < 0 ? 'decreased' : 'increased'} to ${now} cases, ` +
    `${d < 0 ? 'down' : 'up'} ${abs} from ${prev}`;

  // Name the concentration only when one category really dominates.
  const top = bl.categories[0];
  if (top && top.pct >= 30) {
    s += `, with ${esc(top.name)} accounting for ${pctText(top.pct)} of the remaining backlog`;
  }
  return s + '.';
}

function renderBacklog(bl) {
  const sec = el('backlogSection');
  sec.style.display = bl ? '' : 'none';
  if (!bl) return;

  const e = bl.ending, pe = bl.prevEnding;
  const share = n => (e.total ? (n / e.total * 100).toFixed(1) + '% of backlog' : '—');

  // Lower is better here — the inverse of every other tile on this tab.
  el('backlogTiles').innerHTML =
    ui.tile('Backlog', e.total,
      pe ? delta(e.total, pe.total, '', true, 0, 'vs ' + (bl.prevMonthLabel || '').split(' ')[0]) : '',
      pe ? '' : 'no prior month on file') +
    ui.tile('Open', e.open, '', share(e.open)) +
    ui.tile('Snoozed', e.snoozed, '', share(e.snoozed));

  el('backlogAsOf').textContent = 'Ending snapshot · ' + fmtDay(e.date);
  el('backlogTrendNote').textContent = `Daily snapshots · ${bl.monthLabel}`;

  // One snapshot is a valid month-end figure but not a trend: an average
  // and a peak over a single day would read as analysis it isn't. The
  // missing-day logic is untouched — those days stay absent, never zero.
  const n = bl.snapshots;
  el('backlogMicro').style.display = bl.hasTrend ? '' : 'none';
  el('backlogChartbox').style.display = bl.hasTrend ? '' : 'none';
  el('backlogTrendEmpty').style.display = bl.hasTrend ? 'none' : '';

  if (bl.hasTrend) {
    el('backlogMicro').innerHTML =
      ui.micro('Avg. daily backlog', bl.avg, `across ${n} snapshots`) +
      ui.micro('Peak backlog', bl.peak, bl.peakDay ? fmtDay(bl.peakDay.date) : '');
    el('backlogCoverage').textContent = `Based on ${n} daily snapshots.`;
  } else {
    charts.destroyChart('backlog');
    el('backlogMicro').innerHTML = '';
    el('backlogTrendEmpty').textContent =
      'Daily backlog trend unavailable — only one snapshot is available for this month.';
    el('backlogCoverage').textContent = '';
  }

  el('backlogCatNote').textContent = bl.catDate
    ? `Snapshot of ${fmtDay(bl.catDate)} · ${bl.catTotal} cases`
    : 'No category snapshot';

  const max = bl.categories.reduce((m, c) => Math.max(m, c.total), 1);
  el('backlogCats').innerHTML = bl.categories.length
    ? ui.backlogCategoryHead() + bl.categories.map(c => ui.backlogCategoryBar(c, max)).join('')
    : `<p class="remarks-empty">No category snapshot for this month.</p>`;
}

// ---------------- go ----------------
init();
