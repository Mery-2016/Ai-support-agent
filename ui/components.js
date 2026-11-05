/**
 * 與領域無關的樣板片段。回傳 HTML 字串，由頁面組裝。
 *
 * 這是 Team 8725 App 系列的共用元件層，四個 App 逐字元相同。
 * 需要 badge 顯示產品自己的狀態（任務狀態、工單狀態…）時，
 * 請在產品層自建 `ui/<domain>Components.js`，不要改這個檔案。
 */
import { icon, escapeHtml } from './dom.js';

export function tag(label, iconName) {
  return `<span class="tag">${iconName ? icon(iconName) : ''}${escapeHtml(label)}</span>`;
}

export function emptyState({ title, description = '', action = '', iconName = 'icon-inbox', inline = false }) {
  return `
    <div class="empty${inline ? ' empty--inline' : ''}">
      ${icon(iconName)}
      <strong>${escapeHtml(title)}</strong>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      ${action}
    </div>`;
}

export function skeletonList(rows = 4) {
  return `<div class="skeleton-list">${'<div class="skeleton skeleton-row"></div>'.repeat(rows)}</div>`;
}

export function progressBlock(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return `
    <div class="progress">
      <div class="progress-track">
        <div class="progress-bar${percent === 100 ? ' is-done' : ''}" style="width:${percent}%"></div>
      </div>
      <p class="progress-meta">完成 ${done} / ${total}，進度 ${percent}%</p>
    </div>`;
}

/** 產生 select 欄位。options: [value, label][] */
export function selectField({ id, name, label, options, value = '', required = false, hint = '', disabled = false }) {
  const items = options
    .map(([optValue, optLabel]) => `<option value="${escapeHtml(optValue)}"${String(optValue) === String(value) ? ' selected' : ''}>${escapeHtml(optLabel)}</option>`)
    .join('');
  return `
    <div class="field" data-field="${escapeHtml(name)}">
      <label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
      <div class="select-wrap">
        <select id="${escapeHtml(id)}" name="${escapeHtml(name)}"${required ? ' required' : ''}${disabled ? ' disabled' : ''}>${items}</select>
        ${icon('icon-chevron-down')}
      </div>
      ${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ''}
    </div>`;
}

export function textField({
  id, name, label, value = '', type = 'text', required = false, hint = '', placeholder = '', autocomplete = '',
}) {
  return `
    <div class="field" data-field="${escapeHtml(name)}">
      <label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
      <input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}"
        ${required ? ' required' : ''}${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}${autocomplete ? ` autocomplete="${escapeHtml(autocomplete)}"` : ''}>
      ${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ''}
    </div>`;
}

export function textareaField({ id, name, label, value = '', required = false, hint = '', placeholder = '', rows = 4 }) {
  return `
    <div class="field" data-field="${escapeHtml(name)}">
      <label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
      <textarea id="${escapeHtml(id)}" name="${escapeHtml(name)}" rows="${rows}"${required ? ' required' : ''}${placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''}>${escapeHtml(value)}</textarea>
      ${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ''}
    </div>`;
}

export function statCard({ label, value, note = '', tone = '', href = '', iconName = '' }) {
  const cls = `stat${tone ? ` stat--${tone}` : ''}`;
  const inner = `
    <span class="stat-label">${iconName ? icon(iconName) : ''}${escapeHtml(label)}</span>
    <span class="stat-value">${escapeHtml(String(value))}</span>
    ${note ? `<span class="stat-note">${escapeHtml(note)}</span>` : ''}`;
  return href ? `<a class="${cls}" href="${escapeHtml(href)}">${inner}</a>` : `<div class="${cls}">${inner}</div>`;
}

export function callout(message, tone = 'info', iconName = 'icon-alert') {
  return `<div class="callout callout--${tone}">${icon(iconName)}<div>${escapeHtml(message)}</div></div>`;
}

export function breadcrumbs(items) {
  const parts = items
    .map((item, index) => {
      const isLast = index === items.length - 1;
      const node = isLast || !item.href
        ? `<span${isLast ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</span>`
        : `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`;
      return index === 0 ? node : `<span aria-hidden="true">/</span>${node}`;
    })
    .join('');
  return `<nav class="breadcrumbs" aria-label="麵包屑">${parts}</nav>`;
}
