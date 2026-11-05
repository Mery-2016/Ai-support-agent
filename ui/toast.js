/** 短暫回饋訊息。成功說明完成的物件與動作，錯誤說明結果與下一步。 */
import { icon, escapeHtml } from './dom.js';

const ICONS = { success: 'icon-check-circle', error: 'icon-alert', info: 'icon-inbox' };

export function toast(message, tone = 'info') {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const node = document.createElement('div');
  node.className = `toast toast--${tone}`;
  node.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  node.innerHTML = `${icon(ICONS[tone] || ICONS.info)}<span>${escapeHtml(message)}</span>`;
  region.append(node);
  setTimeout(() => node.remove(), tone === 'error' ? 7000 : 4000);
}

export const toastSuccess = (message) => toast(message, 'success');
export const toastError = (message) => toast(message, 'error');
export const toastInfo = (message) => toast(message, 'info');
