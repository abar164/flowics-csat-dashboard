// ============================================================
// app.js — state + orchestration.
// Wires data (data.js) through components (components.js) and
// charts (charts.js) into the DOM. One event-delegation
// listener handles all interactions via data-act attributes.
// ============================================================

import { C, GOALS, RORDER, RCOLORS, POSITIVE_R, NEGATIVE_R } from './config.js';
import { MONTHS, DATA, OPS_DATA } from './data.js';
import {
  isFin, tally, splitDetractors, csatColor, fmtMinutes, fmtHours,
  delta, whenChart, esc
} from './utils.js';
import * as ui from './components.js';
import * as charts from './charts.js';

// ---------------- state ----------------
const state = {
  monthIdx: MONTHS.length - 1,
  remarksPage: 0,
  remarksFilter: 'all',
  tab: 'csat'
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
  sel.addEventListener('change', e => selectMonth(e.target.value));

  document.body.addEventListener('click', onClick);

  el('footerTs').textContent = 'Source: Intercom CSAT Export · ' +
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  renderAll();
  whenChart(renderCharts);
}

// ---------------- interactions ----------------
function onClick(e) {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'prev') return step(-1);
  if (act === 'next') return step(1);
  if (act === 'tab-csat') return switchTab('csat');
  if (act === 'tab-ops') return switchTab('ops');
  if (act === 'rfilter') return setRemarksFilter(t.dataset.filter);
  if (act === 'rnav') return changeRemarksPage(parseInt(t.dataset.dir, 10));
  if (act === 'agent') return openAgentModal(t.dataset.agent);
  if (act === 'modal-close') return closeModal();
  if (act === 'modal-bg' && e.target === t) return closeModal();
}

function step(dir) {
  const n = state.monthIdx + dir;
  if (n < 0 || n >= MONTHS.length) return;
  state.monthIdx = n;
  state.remarksPage = 0;
  state.remarksFilter = 'all';
  el('monthSelect').value = MONTHS[n].key;
  renderAll();
  renderCharts();
}

function selectMonth(key) {
  state.monthIdx = MONTHS.findIndex(m => m.key === key);
  state.remarksPage = 0;
  state.remarksFilter = 'all';
  renderAll();
  renderCharts();
}

function switchTab(tab) {
  state.tab = tab;
  el('tabCsatBtn').classList.toggle('tab--active', tab === 'csat');
  el('tabOpsBtn').classList.toggle('tab--active', tab === 'ops');
  el('csatPanel').style.display = tab === 'csat' ? 'block' : 'none';
  el('opsPanel').style.display = tab === 'ops' ? 'block' : 'none';
  if (tab === 'ops') {
    renderOps();
    whenChart(renderOpsCharts);
  }
}

// ---------------- render orchestration ----------------
function renderAll() {
  const d = currentData(), prev = prevData();
  const isLast = state.monthIdx === MONTHS.length - 1;

  el('liveBadge').style.display = isLast ? 'inline-block' : 'none';
  el('liveDot').style.display = isLast ? 'block' : 'none';
  el('wipBanner').style.display = isLast ? 'flex' : 'none';
  el('headerSub').textContent = `${d.label} · ${d.total} conversations rated`;
  el('monthSelect').value = currentMonth().key;

  renderExecSummary(d, prev);
  renderKpis(d, prev, currentMonth().key);
  renderRatingBars(d);
  renderAgentList(d);
  renderFin(d);
  renderDetractors(d);
  renderHighlights(d);
  renderRemarksFilter(d);
  renderRemarks(d);

  if (state.tab === 'ops') {
    renderOps();
    whenChart(renderOpsCharts);
  }
}

function renderCharts() {
  const d = currentData();
  charts.buildTrendChart(el('trendChart'), MONTHS, DATA, state.monthIdx);
  charts.buildDonutChart(el('donutChart'), d);
  charts.buildAgentVolumeChart(el('agentChart'), d);
  charts.buildAgentScatterChart(el('agentScatterChart'), d);
}

// ---------------- CSAT sections ----------------
function computeAlerts(d, prev) {
  const t = tally(d), sd = splitDetractors(d);
  const alerts = [];

  if (sd.bad.length) {
    const cos = [...new Set(sd.bad.map(r => r.company))].filter(Boolean);
    alerts.push({ lvl: 'bad', text: `${sd.bad.length} detractor${sd.bad.length > 1 ? 's' : ''}${cos.length ? ' · ' + cos.slice(0, 2).join(', ') : ''}` });
  }
  if (t.neu > 0) alerts.push({ lvl: 'warn', text: `${t.neu} neutral rating${t.neu > 1 ? 's' : ''} (not counted as negative)` });
  if (d.csat < GOALS.csat) alerts.push({ lvl: 'warn', text: `Below ${GOALS.csat}% CSAT target` });

  const finA = d.agents.find(a => isFin(a.name));
  const prevFin = prev?.agents.find(a => isFin(a.name));
  if (finA && prevFin && (prevFin.csat - finA.csat) >= GOALS.finCsatDropAlert)
    alerts.push({ lvl: 'warn', text: `Fin AI dropped ${(prevFin.csat - finA.csat).toFixed(0)}pts` });

  const weak = d.agents.find(a => !isFin(a.name) && a.total >= 3 && a.csat < 85);
  if (weak) alerts.push({ lvl: 'warn', text: `${weak.name.split(' ')[0]} below target` });

  if (!alerts.length) alerts.push({ lvl: 'ok', text: 'No critical issues this month' });
  return alerts;
}

function renderExecSummary(d, prev) {
  const finA = d.agents.find(a => isFin(a.name));
  const qualified = d.agents.filter(a => !isFin(a.name) && a.total >= 5);
  const topByVol = d.agents.filter(a => !isFin(a.name)).sort((a, b) => b.total - a.total)[0];
  const top = qualified.sort((a, b) => b.csat - a.csat || b.total - a.total)[0] || topByVol;

  let deltaHtml = '';
  if (prev) {
    const diff = d.csat - prev.csat;
    const sign = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const col = diff > 0 ? C.green : diff < 0 ? C.red : C.text3;
    deltaHtml = `<span class="exec-summary__delta" style="color:${col};">${sign} ${Math.abs(diff).toFixed(1)} vs ${prev.label}</span>`;
  }

  const finLine = (finA && d.fin > 0)
    ? `<div class="exec-summary__fin">Fin AI at <strong>${finA.csat}%</strong> CSAT · ${finA.total} rated</div>` : '';

  const topHtml = top ? `<div class="top-agent">
      <span class="top-agent__tag">TOP</span>
      <div>
        <div class="top-agent__name">${esc(top.name)}</div>
        <div class="top-agent__stats">${top.total} ratings · ${top.csat}% CSAT · ${top.avg}/5 avg</div>
      </div>
    </div>` : '';

  el('execSummary').innerHTML = `
    <div class="exec-summary__head">
      <span class="exec-summary__title">Executive Summary</span>
      <span class="exec-summary__month">${d.label}</span>
    </div>
    <div class="exec-summary__score-row">
      <span class="exec-summary__score" style="color:${csatColor(d.csat)};">${d.csat}% CSAT</span>
      ${deltaHtml}
    </div>
    ${finLine}
    ${topHtml}
    <div class="exec-summary__pills">${computeAlerts(d, prev).slice(0, 4).map(ui.alertPill).join('')}</div>`;
}

function renderKpis(d, prev, monthKey) {
  const t = tally(d);
  const negRate = d.total > 0 ? t.neg / d.total * 100 : 0;

  // First-response time comes from the ops sheet, which lags the CSAT export.
  const opsIdx = OPS_DATA.months.indexOf(monthKey);
  const useOps = opsIdx !== -1 ? opsIdx : OPS_DATA.months.length - 1;
  const frt = OPS_DATA.metrics.frt[useOps];
  const pFrt = useOps - 1 >= 0 ? OPS_DATA.metrics.frt[useOps - 1] : null;
  const frtLag = opsIdx === -1;

  el('kpiRow').innerHTML =
    ui.kpiCard({
      label: 'CSAT Score', val: d.csat + '%', color: csatColor(d.csat),
      delta: delta(d.csat, prev?.csat),
      pill: ui.goalPill(d.csat >= GOALS.csat, GOALS.csat + '%')
    }) +
    ui.kpiCard({
      label: 'Total Rated', val: d.total,
      sub: `${t.pos} positive · ${t.neu} neutral · ${t.neg} negative`
    }) +
    ui.kpiCard({
      label: 'Negative Rate', val: negRate.toFixed(1) + '%', color: negRate > 0 ? C.red : C.text,
      sub: `${t.neg} detractor${t.neg !== 1 ? 's' : ''} (Bad/Terrible)`,
      pill: ui.goalPill(negRate <= GOALS.negRate, '≤' + GOALS.negRate + '%')
    }) +
    ui.kpiCard({
      label: 'Avg Rating', val: d.avg, sub: 'out of 5.0',
      pill: ui.goalPill(d.avg >= GOALS.avgRating, GOALS.avgRating + '/5')
    }) +
    ui.kpiCard({
      label: 'First Response', val: frt != null ? fmtMinutes(frt) : '—', color: '#2dd4bf',
      delta: delta(frt, pFrt, 'm', true),
      sub: frtLag ? `<span class="kpi__lag">${OPS_DATA.labels[useOps]} · ops lag</span>` : 'minutes · avg'
    });
}

function renderRatingBars(d) {
  const max = Math.max(1, ...Object.values(d.ratings));
  el('ratingBars').innerHTML = RORDER
    .filter(r => (d.ratings[r] || 0) > 0)
    .map(r => ui.distributionBar(r, d.ratings[r], max, RCOLORS[r]))
    .join('');
}

function renderAgentList(d) {
  const max = Math.max(1, ...d.agents.map(a => a.total));
  el('agentList').innerHTML = d.agents.map(a => ui.agentRow(a, max)).join('');
}

function renderFin(d) {
  const finA = d.agents.find(a => isFin(a.name));
  const humans = d.agents.filter(a => !isFin(a.name));
  const humanAvg = humans.length ? (humans.reduce((s, a) => s + a.csat, 0) / humans.length).toFixed(1) : null;
  const share = finA && d.total > 0 ? finA.total / d.total * 100 : 0;
  const low = !finA || share < 5;

  el('finMetrics').innerHTML = low
    ? `<div class="fin-low-note">${finA ? `Low volume this month (${share.toFixed(1)}% of total).` : 'No Fin AI ratings this month.'}</div>
       <div class="mini-stats">
         ${ui.miniStat('Rated', finA?.total ?? 0, C.purple)}
         ${ui.miniStat('CSAT', (finA?.csat ?? '—') + '%', finA ? csatColor(finA.csat) : C.text3)}
         ${ui.miniStat('Avg', (finA?.avg ?? '—') + '/5', C.purple)}
       </div>`
    : ui.statRow('Conversations rated', finA.total) +
      ui.statRow('Share of volume', share.toFixed(1) + '%', C.text2) +
      ui.statRow('CSAT Score', finA.csat + '%', csatColor(finA.csat)) +
      ui.statRow('Avg rating', finA.avg + ' / 5') +
      ui.statRow('vs Human agents avg', humanAvg ? humanAvg + '%' : '—', C.text2);
}

function renderDetractors(d) {
  const sd = splitDetractors(d);
  const sec = el('detractorsSection');
  if (!sd.bad.length && !sd.neu.length) { sec.innerHTML = ''; return; }

  let html = '';
  if (sd.bad.length) {
    html += `<div class="card panel detractor-card">
      <div class="panel__heading">Detractors — ${sd.bad.length} conversation${sd.bad.length > 1 ? 's' : ''}</div>
      ${ui.conversationTable(sd.bad)}
    </div>`;
  }
  if (sd.neu.length) {
    html += `<div class="card panel neutral-card">
      <div class="panel__heading">Neutral ratings — ${sd.neu.length}</div>
      <div class="neutral-card__note">Not counted as negative — shown for context.</div>
      ${ui.conversationTable(sd.neu)}
    </div>`;
  }
  sec.innerHTML = html;
}

function renderHighlights(d) {
  const best = d.remarks.find(r => POSITIVE_R.has(r.rating) && r.remark.length > 20);
  const worst = d.remarks.find(r => NEGATIVE_R.has(r.rating));
  let html = '';
  if (best) html += ui.highlightCard('best', 'Best Feedback', best);
  if (worst) html += ui.highlightCard('worst', 'Top Complaint', worst);
  el('highlightRemarks').innerHTML = html;
  el('highlightRemarks').style.display = html ? 'grid' : 'none';
}

// ---------------- remarks (filter + pagination) ----------------
function getFilteredRemarks(d) {
  if (state.remarksFilter === 'amazing') return d.remarks.filter(r => r.rating === 'Amazing');
  if (state.remarksFilter === 'bad') return d.remarks.filter(r => NEGATIVE_R.has(r.rating));
  return d.remarks;
}

function renderRemarksFilter(d) {
  const hasNeg = d.remarks.some(r => NEGATIVE_R.has(r.rating));
  const filters = [{ key: 'all', label: 'All' }, { key: 'amazing', label: 'Amazing' }];
  if (hasNeg) filters.push({ key: 'bad', label: 'Negative' });
  el('remarksFilter').innerHTML = filters
    .map(f => ui.filterChip(f, state.remarksFilter === f.key))
    .join('');
}

function setRemarksFilter(f) {
  state.remarksFilter = f;
  state.remarksPage = 0;
  renderRemarksFilter(currentData());
  renderRemarks(currentData());
}

function changeRemarksPage(dir) {
  const d = currentData();
  const totalPages = Math.ceil(getFilteredRemarks(d).length / 3);
  state.remarksPage = Math.max(0, Math.min(state.remarksPage + dir, totalPages - 1));
  renderRemarks(d);
}

function renderRemarks(d) {
  const list = getFilteredRemarks(d), total = list.length;
  if (!total) {
    el('remarksList').innerHTML = '<p class="remarks-empty">No remarks for this filter.</p>';
    return;
  }
  const per = 3;
  const totalPages = Math.ceil(total / per);
  const start = state.remarksPage * per;
  const end = Math.min(start + per, total);

  let html = list.slice(start, end).map(ui.remarkItem).join('');
  if (totalPages > 1) html += ui.paginator(state.remarksPage, totalPages, start, end, total);
  el('remarksList').innerHTML = html;
}

// ---------------- agent drill-down modal ----------------
function openAgentModal(name) {
  const all = MONTHS.map(m => ({ ...m, d: DATA[m.key] }));
  const months = all
    .map(m => { const a = m.d.agents.find(a => a.name === name); return a ? { label: m.label, ...a } : null; })
    .filter(Boolean);
  if (!months.length) return;

  const totalRated = months.reduce((s, m) => s + m.total, 0);
  const avgCsat = (months.reduce((s, m) => s + m.csat, 0) / months.length).toFixed(1);
  const avgRating = (months.reduce((s, m) => s + m.avg, 0) / months.length).toFixed(2);
  const companies = [...new Set(all.flatMap(m => m.d.remarks.filter(r => r.agent === name).map(r => r.company)))]
    .filter(Boolean).slice(0, 12);

  el('modalTitle').textContent = name;
  el('modalBody').innerHTML = `
    <div class="modal-kpis">
      ${ui.modalKpi('Total Rated', totalRated)}
      ${ui.modalKpi('Avg CSAT', avgCsat + '%', csatColor(parseFloat(avgCsat)))}
      ${ui.modalKpi('Avg Rating', avgRating + '/5')}
    </div>
    <div class="modal-section">
      <h4 class="modal-section__title">Monthly Trend</h4>
      <div class="chart-box--modal"><canvas id="modalTrendChart"></canvas></div>
    </div>
    <div>
      <h4 class="modal-section__title">Customers Served (${companies.length} unique companies)</h4>
      <div>${companies.map(c => `<span class="company-tag">${esc(c)}</span>`).join('')}</div>
    </div>`;
  el('modalOverlay').classList.add('modal-overlay--open');

  whenChart(() => charts.buildModalTrendChart(el('modalTrendChart'), months));
}

function closeModal() {
  el('modalOverlay').classList.remove('modal-overlay--open');
}

// ---------------- ops tab ----------------
function renderOps() {
  const mk = currentMonth().key;
  const idx = OPS_DATA.months.indexOf(mk);
  const banner = el('opsPendingBanner');
  if (idx === -1) {
    banner.style.display = 'block';
    banner.textContent = `Operations data for ${DATA[mk].label} is not in the Excel yet — this sheet updates with a slight lag. Showing the most recent available month below.`;
  } else {
    banner.style.display = 'none';
  }

  const useIdx = idx !== -1 ? idx : OPS_DATA.months.length - 1;
  const p = useIdx - 1, m = OPS_DATA.metrics, label = OPS_DATA.labels[useIdx];
  const get = (k, i) => (i >= 0 ? m[k][i] : null);

  // ---- narrative summary ----
  const bullets = [];
  const nc = get('newCases', useIdx), pnc = get('newCases', p);
  if (nc != null && pnc != null) {
    const diff = nc - pnc, pct = Math.abs(diff / pnc * 100).toFixed(0);
    bullets.push(diff > 0
      ? `Case volume increased ${pct}% vs prior month (${pnc} → ${nc} cases).`
      : diff < 0
        ? `Case volume decreased ${pct}% vs prior month (${pnc} → ${nc} cases).`
        : `Case volume held steady at ${nc} cases.`);
  }
  const frt = get('frt', useIdx), pfrt = get('frt', p), res = get('resTime', useIdx), pres = get('resTime', p);
  if (frt != null && pfrt != null) {
    const fd = frt - pfrt;
    const dir = fd < 0 ? `improved to ${fmtMinutes(frt)}` : fd > 0 ? `increased to ${fmtMinutes(frt)}` : `held at ${fmtMinutes(frt)}`;
    const rs = res != null && pres != null
      ? ` Resolution time ${res < pres ? 'improved' : res > pres ? 'grew' : 'held'} to ${fmtHours(res)}.` : '';
    bullets.push(`First response time ${dir} (was ${fmtMinutes(pfrt)}).${rs}`);
  }
  const rr = get('responseRate', useIdx), prr = get('responseRate', p);
  const kb = get('kbViews', useIdx), pkb = get('kbViews', p);
  if (rr != null && prr != null && Math.abs(rr - prr) >= 2) {
    bullets.push(`Survey response rate ${rr > prr ? 'rose' : 'fell'} to ${rr}% (was ${prr}%).`);
  } else if (kb != null && pkb != null) {
    bullets.push(`Knowledge Base views ${kb >= pkb ? 'grew' : 'dropped'} to ${kb.toLocaleString()} (was ${pkb.toLocaleString()}).`);
  }

  el('opsExecSummary').innerHTML = bullets.length ? `<div class="card ops-summary">
    <div class="ops-summary__title">Operations Summary · ${label}</div>
    <div class="ops-summary__bullets">${bullets.map(b =>
      `<div class="ops-summary__bullet"><span class="ops-summary__bullet-mark">▸</span><span>${b}</span></div>`).join('')}</div>
  </div>` : '';

  // ---- metric cards ----
  const dd = (k, su = '', lo = false, dec = 1) => delta(get(k, useIdx), get(k, p), su, lo, dec);
  const pctv = k => (get(k, useIdx) != null ? get(k, useIdx) + '%' : '—');
  const numv = k => get(k, useIdx) ?? '—';

  el('opsBody').innerHTML =
    ui.sectionHeading('Speed') +
    `<div class="gr2">
      ${ui.opsCard('First Response Time', fmtMinutes(get('frt', useIdx)), dd('frt', 'm', true))}
      ${ui.opsCard('Resolution Time', fmtHours(get('resTime', useIdx)), dd('resTime', 'h', true))}
    </div>` +
    ui.sectionHeading('Operations') +
    `<div class="grid-4">
      ${ui.opsCard('New Incoming Cases', numv('newCases'), dd('newCases', '', false, 0))}
      ${ui.opsCard('Closed Conversations', numv('closedConv'), dd('closedConv', '', false, 0))}
      ${ui.opsCard('Resolution Rate', pctv('resRate'), dd('resRate', '%'))}
      ${ui.opsCard('Chat Volume %', pctv('chatPct'), dd('chatPct', '%'))}
    </div>` +
    `<div class="chart-box--channel"><canvas id="opsChannelChart"></canvas></div>` +
    ui.sectionHeading('QA') +
    `<div class="grid-4">
      ${ui.opsCard('Surveys Sent', numv('surveysSent'), dd('surveysSent', '', false, 0))}
      ${ui.opsCard('Conversations Rated', numv('convRated'), dd('convRated', '', false, 0))}
      ${ui.opsCard('Survey Response Rate', pctv('responseRate'), dd('responseRate', '%'))}
      ${ui.opsCard('CSAT Score', pctv('csatScore'), dd('csatScore', '%'))}
    </div>` +
    ui.sectionHeading('Self Serve & Users') +
    `<div class="gr2">
      ${ui.opsCard('Knowledge Base Views', get('kbViews', useIdx)?.toLocaleString() ?? '—', dd('kbViews', '', false, 0))}
      ${ui.opsCard('Active Users', get('activeUsers', useIdx)?.toLocaleString() ?? '—', dd('activeUsers', '', false, 0))}
    </div>`;

  whenChart(renderOpsCharts);
}

function renderOpsCharts() {
  const ch = el('opsChannelChart');
  if (ch) charts.buildOpsChannelChart(ch, OPS_DATA);
  const tr = el('opsTrendChart');
  if (tr) charts.buildOpsTrendChart(tr, OPS_DATA);
}

// ---------------- go ----------------
init();
