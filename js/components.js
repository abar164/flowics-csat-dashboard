// ============================================================
// components.js — reusable UI components.
// Every function returns an HTML string; no state, no listeners.
// Interactivity is handled via data-act attributes + event
// delegation in app.js.
// ============================================================

import { C, BADGE, RCOLORS, GOALS } from './config.js';
import { esc, initials, isFin, isMe, csatColor } from './utils.js';

/** Colored rating pill (Amazing / Great / Bad / …). */
export function ratingBadge(rating) {
  const b = BADGE[rating] || BADGE.Ok;
  return `<span class="badge" style="background:${b.bg};color:${b.fg};">${esc(rating)}</span>`;
}

/** Alert pill in the executive summary (ok / warn / bad). */
export function alertPill({ lvl, text }) {
  return `<span class="pill pill--${lvl}"><span class="pill__dot"></span>${text}</span>`;
}

/** Goal pass/fail pill under a KPI. */
export function goalPill(ok, txt) {
  return `<span class="goal-pill ${ok ? 'goal-pill--ok' : 'goal-pill--warn'}">${ok ? '✓' : '!'} Goal ${txt}</span>`;
}

/** Large KPI card (top row). */
export function kpiCard({ label, val, color, delta, sub, pill }) {
  return `<div class="card kpi">
    <div class="kpi__label">${label}</div>
    <div class="kpi__value" ${color ? `style="color:${color}"` : ''}>${val}</div>
    ${delta ? `<div class="kpi__delta">${delta}</div>` : ''}
    ${sub ? `<div class="kpi__sub">${sub}</div>` : ''}
    ${pill || ''}
  </div>`;
}

/** Compact ops metric card. */
export function opsCard(label, val, delta) {
  return `<div class="card ops-card">
    <div class="ops-card__label">${label}</div>
    <div class="ops-card__value">${val}</div>
    ${delta ? `<div class="ops-card__delta">${delta}</div>` : ''}
  </div>`;
}

/** Section divider heading (ops tab). */
export function sectionHeading(title) {
  return `<div class="section-heading">${title}</div>`;
}

/** Horizontal distribution bar row (rating distribution). */
export function distributionBar(label, count, maxCount, color) {
  const pct = (count / maxCount * 100).toFixed(0);
  return `<div class="dist-row">
    <span class="dist-row__label">${esc(label)}</span>
    <div class="dist-row__track"><div class="dist-row__fill" style="width:${pct}%;background:${color};"></div></div>
    <span class="dist-row__count">${count}</span>
  </div>`;
}

/** Clickable agent row (agent performance list). */
export function agentRow(agent, maxTotal) {
  const pct = (agent.total / maxTotal * 100).toFixed(0);
  const fin = isFin(agent.name), me = isMe(agent.name);
  const kind = fin ? 'fin' : me ? 'me' : 'human';
  return `<div class="agent-row" data-act="agent" data-agent="${esc(agent.name)}">
    <div class="avatar avatar--${kind}">${initials(agent.name)}</div>
    <span class="agent-row__name">${esc(agent.name)}</span>
    <span class="agent-row__total">${agent.total}</span>
    <div class="agent-row__track"><div class="agent-row__fill agent-row__fill--${kind}" style="width:${pct}%;"></div></div>
    <span class="agent-row__csat" style="color:${csatColor(agent.csat)};">${agent.csat}%</span>
  </div>`;
}

/** Key/value stat row (Fin AI panel). */
export function statRow(label, value, color) {
  return `<div class="stat-row">
    <label class="stat-row__label">${label}</label>
    <span class="stat-row__value" style="color:${color || C.purple};">${value}</span>
  </div>`;
}

/** Mini centered stat (Fin AI low-volume view). */
export function miniStat(label, value, color) {
  return `<div class="mini-stat">
    <label class="mini-stat__label">${label}</label>
    <div class="mini-stat__value" style="color:${color};">${value}</div>
  </div>`;
}

/** Table of detractor/neutral conversations. */
export function conversationTable(rows) {
  const th = t => `<th class="dtable__th">${t}</th>`;
  const body = rows.map(r => `<tr>
    <td class="dtable__td dtable__td--nowrap">${ratingBadge(r.rating)}</td>
    <td class="dtable__td"><strong>${esc(r.customer || '—')}</strong></td>
    <td class="dtable__td dtable__td--muted">${esc(r.company || '—')}</td>
    <td class="dtable__td dtable__td--muted">${esc(r.agent.split(' ')[0])}</td>
  </tr>`).join('');
  return `<table class="dtable">
    <thead><tr>${th('Rating')}${th('Customer')}${th('Company')}${th('Agent')}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/** Panel wrapper with uppercase heading. Variants tint the border/heading. */
export function panel({ title, body, variant = '', extraHeader = '' }) {
  return `<div class="card panel ${variant ? `panel--${variant}` : ''}">
    <div class="panel__heading">${title}${extraHeader}</div>
    ${body}
  </div>`;
}

/** Best / worst feedback highlight card. */
export function highlightCard(kind, label, remark) {
  const cut = s => s.slice(0, 140) + (s.length > 140 ? '…' : '');
  return `<div class="highlight highlight--${kind}">
    <div class="highlight__label">${label}</div>
    <div class="highlight__quote">"${esc(cut(remark.remark))}"</div>
    <div class="highlight__meta">${esc(remark.agent.split(' ')[0])}${remark.customer ? ' · ' + esc(remark.customer) : ''} · ${esc(remark.company)}</div>
  </div>`;
}

/** Single customer remark entry. */
export function remarkItem(r) {
  return `<div class="remark">
    <div class="remark__meta">
      ${ratingBadge(r.rating)}
      <span class="remark__agent">${esc(r.agent.split(' ')[0])}</span>
      ${r.customer ? `<span class="remark__customer">· ${esc(r.customer)}</span>` : ''}
      <span class="remark__company">· ${esc(r.company)}</span>
    </div>
    <div class="remark__text">"${esc(r.remark)}"</div>
  </div>`;
}

/** Prev / Next pagination footer. */
export function paginator(page, totalPages, start, end, total) {
  const btn = (dir, label, disabled) =>
    `<button data-act="rnav" data-dir="${dir}" class="pager-btn" ${disabled ? 'disabled' : ''}>${label}</button>`;
  return `<div class="pager">
    ${btn(-1, '‹ Prev', page === 0)}
    <span class="pager__info">${start + 1}–${end} of ${total}</span>
    ${btn(1, 'Next ›', page >= totalPages - 1)}
  </div>`;
}

/** Filter chip (remarks filter). */
export function filterChip({ key, label }, active) {
  return `<button data-act="rfilter" data-filter="${key}" class="chip chip--${key} ${active ? 'chip--active' : ''}">${label}</button>`;
}

/** KPI cell inside the agent drill-down modal. */
export function modalKpi(label, value, color) {
  return `<div class="modal-kpi">
    <label class="modal-kpi__label">${label}</label>
    <div class="modal-kpi__value" style="color:${color || C.text};">${value}</div>
  </div>`;
}
