// ============================================================
// components.js — reusable UI components.
// Every function returns an HTML string; no state, no listeners.
// Interactivity is handled via data-act attributes + event
// delegation in app.js.
// ============================================================

import { BADGE, NEGATIVE_R } from './config.js';
import { esc, isFin, firstName, csatColor } from './utils.js';

/** Small rating label. */
export function ratingBadge(rating) {
  const b = BADGE[rating] || BADGE.Ok;
  return `<span class="tag" style="background:${b.bg};color:${b.fg}">${esc(rating)}</span>`;
}

/** One supporting figure in the hero row. */
export function fact({ label, value, sub, color }) {
  return `<div>
    <div class="fact__label">${label}</div>
    <div class="fact__value"${color ? ` style="color:${color}"` : ''}>${value}</div>
    ${sub ? `<div class="fact__sub">${sub}</div>` : ''}
  </div>`;
}

/**
 * Compact metric tile (ops grid). `sub` is a quieter second line under
 * the delta — a ratio or a share that gives the figure context without
 * earning a tile of its own; `subFirst` promotes it above the delta when
 * the context explains the figure better than its monthly change does.
 * `info` attaches a help affordance to the
 * label rather than parking a methodology note on the page.
 */
export function tile(label, value, deltaHtml, subHtml, info, subFirst) {
  const sub = subHtml ? `<span class="tile__sub">${subHtml}</span>` : '';
  return `<div class="tile">
    <div class="tile__label"${info ? ` title="${esc(info)}"` : ''}>${label}${
      info ? `<span class="tile__hint" aria-hidden="true">i</span>` : ''}</div>
    <div class="tile__value">${value}</div>
    ${subFirst ? sub + (deltaHtml || '') : (deltaHtml || '') + sub}
  </div>`;
}

/** Label + figure, side by side (Top performer). */
export function stat(label, value) {
  return `<div><span class="stat__label">${label}</span><span class="stat__value">${value}</span></div>`;
}

/** Label + figure + delta on one line (QA, Self serve). */
export function statLine(label, value, deltaHtml) {
  return `<div class="statline">
    <span class="statline__label">${label}</span>
    <span class="statline__right">
      <span class="statline__value">${value}</span>
      ${deltaHtml || ''}
    </span>
  </div>`;
}

/**
 * One agent row. Bar LENGTH is rated volume, so 34 ratings never looks
 * like 1; the CSAT % sits to the right as its own, separate measure.
 */
export function agentBar(agent, max) {
  const w = (agent.total / max * 100).toFixed(1) + '%';
  return `<div class="abar">
    <span class="abar__name" title="${esc(agent.name)}">${esc(agent.name)}</span>
    <span class="abar__track">
      <span class="abar__fill${isFin(agent.name) ? ' abar__fill--fin' : ''}" style="width:${w}"></span>
    </span>
    <span class="abar__csat" style="color:${csatColor(agent.csat)}">${agent.csat}%</span>
    <span class="abar__avg">${agent.avg}</span>
    <span class="abar__n">${agent.total}</span>
  </div>`;
}

/** Column labels above the agent rows. */
export function agentHead() {
  return `<div class="abar abar--head">
    <span>Agent</span>
    <span>Rated volume</span>
    <span class="abar__csat">CSAT</span>
    <span class="abar__avg">Avg</span>
    <span class="abar__n">Rated</span>
  </div>`;
}

/** Rating distribution row. */
export function distributionBar(label, count, maxCount, color) {
  const pct = (count / maxCount * 100).toFixed(0);
  return `<div class="dist__row">
    <span class="dist__label">${esc(label)}</span>
    <span class="dist__track"><span class="dist__fill" style="width:${pct}%;background:${color}"></span></span>
    <span class="dist__count">${count}</span>
  </div>`;
}

/** One month of the channel bar chart. */
export function channelBar(label, chat, email, max, current) {
  const h = n => (n / max * 100).toFixed(1) + '%';
  return `<div class="chan__col${current ? ' chan__col--current' : ''}">
    <span class="chan__val">${chat + email}</span>
    <span class="chan__chat" style="height:${h(chat)}"></span>
    <span class="chan__email" style="height:${h(email)}"></span>
  </div>`;
}

/**
 * One "Attention needed" item. The customer's own words lead when they
 * left any; otherwise the rating and the account carry the row.
 */
export function attentionItem(r) {
  const kind = NEGATIVE_R.has(r.rating) ? 'bad' : 'warn';
  const text = (r.remark || '').trim();
  return `<div class="attn attn--${kind}">
    <div class="attn__head">
      ${ratingBadge(r.rating)}
      <span class="attn__who">${esc(r.customer || '—')}</span>
      <span class="attn__co">${esc(r.company || '')}</span>
      <span class="attn__agent">${esc(firstName(r.agent))}</span>
    </div>
    ${text
      ? `<div class="attn__quote">“${esc(text)}”</div>`
      : `<div class="attn__none">No comment left with this rating.</div>`}
  </div>`;
}

/**
 * Single customer remark — the quote leads, the attribution follows.
 * The agent's name is given weight on purpose: this section doubles as
 * company-wide recognition.
 */
export function remarkItem(r) {
  return `<div class="remark">
    <div class="remark__quote">“${esc(r.remark)}”</div>
    <div class="remark__meta">
      ${ratingBadge(r.rating)}
      ${r.customer ? `<span>${esc(r.customer)}</span><span>·</span>` : ''}
      <span>${esc(r.company)}</span>
      ${r.date ? `<span>·</span><span>${esc(r.date)}</span>` : ''}
      <span class="remark__agent">${esc(r.agent)}</span>
    </div>
  </div>`;
}

/** Prev / page / Next footer for the remarks list. */
export function pager(page, totalPages) {
  return `<div class="pager">
    <button class="btn" data-act="rprev"${page === 0 ? ' disabled' : ''}>‹ Previous</button>
    <span class="pager__info">Page ${page + 1} of ${totalPages}</span>
    <button class="btn" data-act="rnext"${page >= totalPages - 1 ? ' disabled' : ''}>Next ›</button>
  </div>`;
}

/** Labelled <select>, used by the remarks toolbar. */
export function select(id, label, options, value) {
  return `<label class="pick">
    <span class="pick__label">${label}</span>
    <select id="${id}" class="pick__select">
      ${options.map(o =>
        `<option value="${esc(o.value)}"${String(o.value) === String(value) ? ' selected' : ''}>${esc(o.label)}</option>`
      ).join('')}
    </select>
  </label>`;
}

/**
 * One backlog category row. Bar length is unresolved cases, split into
 * open (accent) and snoozed (deep accent) so the stack still reads as
 * one quantity rather than two competing series.
 */
export function backlogCategoryBar(c, max) {
  const w = n => (n / max * 100).toFixed(1) + '%';
  return `<div class="bcat">
    <span class="bcat__name" title="${esc(c.name)}">${esc(c.name)}</span>
    <span class="bcat__track">
      <span class="bcat__open" style="width:${w(c.open)}"></span>
      <span class="bcat__snoozed" style="width:${w(c.snoozed)}"></span>
    </span>
    <span class="bcat__n">${c.total}</span>
    <span class="bcat__pct">${c.pct.toFixed(1)}%</span>
    <span class="bcat__split">${c.open} open · ${c.snoozed} snoozed</span>
  </div>`;
}

/** Column labels above the category rows. */
export function backlogCategoryHead() {
  return `<div class="bcat bcat--head">
    <span>Category</span>
    <span>Backlog</span>
    <span class="bcat__n">Total</span>
    <span class="bcat__pct">Share</span>
    <span class="bcat__split">Open · snoozed</span>
  </div>`;
}

/** Small secondary figure under a panel title (avg / peak backlog). */
export function micro(label, value, sub) {
  return `<div class="micro__item">
    <span class="micro__label">${label}</span>
    <span class="micro__value">${value}</span>
    ${sub ? `<span class="micro__sub">${sub}</span>` : ''}
  </div>`;
}

/** Table of detractor / neutral conversations. */
export function conversationTable(rows) {
  const body = rows.map(r => `<tr>
    <td class="nowrap">${ratingBadge(r.rating)}</td>
    <td>${esc(r.customer || '—')}</td>
    <td class="muted">${esc(r.company || '—')}</td>
    <td class="muted">${esc(firstName(r.agent))}</td>
  </tr>`).join('');
  return `<table class="table">
    <thead><tr><th>Rating</th><th>Customer</th><th>Company</th><th>Agent</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}
