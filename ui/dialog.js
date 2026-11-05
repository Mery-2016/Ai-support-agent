/** Modal 對話框：焦點移入、Escape 關閉、關閉後焦點回到觸發元素。 */
import { icon, escapeHtml, qsa } from './dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let openCount = 0;

/**
 * @param {object} options
 * @param {string} options.title 對話框標題
 * @param {string} options.body 已組好的 HTML 內容
 * @param {string} [options.footer] 頁尾 HTML；預設只有關閉按鈕
 * @param {boolean} [options.wide]
 * @param {(dialog: HTMLElement, close: Function) => void} [options.onMount]
 * @param {() => void} [options.onClose] 任何方式關閉後都會呼叫
 */
export function openDialog({ title, body, footer = '', wide = false, onMount, onClose }) {
  const trigger = document.activeElement;
  const root = document.getElementById('dialog-root');
  const backdrop = document.createElement('div');
  const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <section class="dialog${wide ? ' dialog--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
      <header>
        <h2 id="${titleId}">${escapeHtml(title)}</h2>
        <button class="icon-button" type="button" data-dialog-close aria-label="關閉對話框">${icon('icon-close')}</button>
      </header>
      <div class="dialog-body">${body}</div>
      <footer>${footer || '<button class="button button--ghost" type="button" data-dialog-close>關閉</button>'}</footer>
    </section>`;

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    backdrop.remove();
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.body.style.removeProperty('overflow');
    document.removeEventListener('keydown', onKeydown, true);
    if (trigger instanceof HTMLElement && document.contains(trigger)) trigger.focus();
    onClose?.();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = qsa(FOCUSABLE, backdrop);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop || event.target.closest('[data-dialog-close]')) close();
  });
  document.addEventListener('keydown', onKeydown, true);
  root.append(backdrop);
  openCount += 1;
  document.body.style.overflow = 'hidden';

  const dialog = backdrop.querySelector('.dialog');
  onMount?.(dialog, close);
  // 優先聚焦內容區的第一個輸入欄位，其次才是關閉按鈕。
  const target = dialog.querySelector('[data-autofocus]')
    || dialog.querySelector('.dialog-body input:not([type="hidden"]):not([disabled]), .dialog-body select:not([disabled]), .dialog-body textarea:not([disabled])')
    || dialog.querySelector(FOCUSABLE);
  target?.focus();
  return { dialog, close };
}

/** 危險或不可復原操作的確認：文字需說明對象、影響與是否可復原。 */
export function confirmDialog({
  title,
  message,
  detail = '',
  confirmLabel = '確認',
  cancelLabel = '取消',
  tone = 'danger',
}) {
  return new Promise((resolve) => {
    let result = false;
    openDialog({
      title,
      body: `
        <div class="callout callout--${tone === 'danger' ? 'danger' : 'warning'}">
          ${icon('icon-alert')}
          <div><strong>${escapeHtml(message)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</div>
        </div>`,
      footer: `
        <button class="button button--ghost" type="button" data-cancel>${escapeHtml(cancelLabel)}</button>
        <button class="button button--${tone === 'danger' ? 'danger' : 'primary'}" type="button" data-confirm data-autofocus>${escapeHtml(confirmLabel)}</button>`,
      onMount(dialog, close) {
        dialog.querySelector('[data-cancel]').addEventListener('click', () => close());
        dialog.querySelector('[data-confirm]').addEventListener('click', () => {
          result = true;
          close();
        });
      },
      onClose: () => resolve(result),
    });
  });
}

/** 單一文字輸入的對話框（退回原因、完成說明等）。取消時回傳 null。 */
export function promptDialog({
  title,
  label,
  hint = '',
  placeholder = '',
  required = true,
  multiline = true,
  confirmLabel = '送出',
  value = '',
}) {
  return new Promise((resolve) => {
    let result = null;
    const inputId = `pd-${Math.random().toString(36).slice(2, 7)}`;
    const control = multiline
      ? `<textarea id="${inputId}" name="value" placeholder="${escapeHtml(placeholder)}" data-autofocus>${escapeHtml(value)}</textarea>`
      : `<input id="${inputId}" name="value" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" data-autofocus>`;
    openDialog({
      title,
      body: `
        <form class="stack" data-form novalidate>
          <div class="field">
            <label class="field-label" for="${inputId}">${escapeHtml(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
            ${control}
            ${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ''}
          </div>
        </form>`,
      footer: `
        <button class="button button--ghost" type="button" data-cancel>取消</button>
        <button class="button button--primary" type="button" data-submit>${escapeHtml(confirmLabel)}</button>`,
      onMount(dialog, close) {
        const form = dialog.querySelector('[data-form]');
        const field = form.elements.value;
        const submit = () => {
          const text = field.value.trim();
          if (required && !text) {
            field.setAttribute('aria-invalid', 'true');
            if (!form.querySelector('.field-error')) {
              const error = document.createElement('p');
              error.className = 'field-error';
              error.id = `${inputId}-error`;
              error.innerHTML = `${icon('icon-alert')}<span>這個欄位是必填，請輸入內容後再送出。</span>`;
              form.querySelector('.field').append(error);
              field.setAttribute('aria-describedby', error.id);
            }
            field.focus();
            return;
          }
          result = text;
          close();
        };
        dialog.querySelector('[data-submit]').addEventListener('click', submit);
        dialog.querySelector('[data-cancel]').addEventListener('click', () => close());
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          submit();
        });
      },
      onClose: () => resolve(result),
    });
  });
}
