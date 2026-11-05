/** DOM 與樣板小工具。所有使用者輸入預設經過跳脫，避免注入。 */

const RAW = Symbol('raw');

export function raw(value) {
  return { [RAW]: String(value ?? '') };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function part(value) {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(part).join('');
  if (typeof value === 'object' && RAW in value) return value[RAW];
  return escapeHtml(value);
}

/** 樣板字串：`h`Hello ${name}`` 會自動跳脫 name。用 raw() 插入已知安全的 HTML。 */
export function h(strings, ...values) {
  return strings.reduce((out, chunk, index) => out + chunk + (index < values.length ? part(values[index]) : ''), '');
}

/**
 * 圖示檔所在路徑（相對於頁面）。
 * 網站掛在子路徑、或像 starter 這樣頁面不在根目錄時，在啟動時呼叫一次 setIconBase()。
 */
let iconBase = 'assets/icons';

export function setIconBase(path) {
  iconBase = String(path || '').replace(/\/+$/, '');
}

/** 產生獨立 SVG 檔案圖示；裝飾用預設 aria-hidden。 */
export function icon(name, { label = '', className = '' } = {}) {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  const cls = className ? ` class="${escapeHtml(className)}"` : '';
  const safeName = /^icon-[a-z0-9-]+$/.test(name) ? name : 'icon-alert';
  return `<svg${cls} ${a11y} viewBox="0 0 24 24"><use href="${iconBase}/${safeName}.svg#${safeName}"></use></svg>`;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}
export function qsa(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

/** 事件委派：回傳解除註冊函式。 */
/** 取得姓名縮寫作為頭像文字。 */
/** 按鈕送出中狀態：固定寬度、避免重複提交。 */
export function setLoading(button, loading, loadingLabel = '處理中…') {
  if (!button) return;
  if (loading) {
    if (!button.dataset.idleHtml) {
      button.style.minWidth = `${button.offsetWidth}px`;
      button.dataset.idleHtml = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = `<span class="spinner spinner--sm" aria-hidden="true"></span><span>${escapeHtml(loadingLabel)}</span>`;
  } else {
    if (button.dataset.idleHtml) button.innerHTML = button.dataset.idleHtml;
    delete button.dataset.idleHtml;
    button.style.minWidth = '';
    button.disabled = false;
    button.classList.remove('is-loading');
  }
}

/** 將表單轉為物件，字串自動 trim。 */
export function formValues(form) {
  const data = {};
  for (const [key, value] of new FormData(form).entries()) {
    const next = typeof value === 'string' ? value.trim() : value;
    if (key in data) {
      data[key] = Array.isArray(data[key]) ? [...data[key], next] : [data[key], next];
    } else {
      data[key] = next;
    }
  }
  return data;
}

/** 在欄位下方顯示錯誤，並與 input 建立 aria 關聯。 */
export function setFieldError(form, name, message) {
  const input = form.elements[name];
  const field = input?.closest('.field') || form.querySelector(`[data-field="${name}"]`);
  if (!field) return;
  let box = field.querySelector('.field-error');
  if (!message) {
    box?.remove();
    if (input) {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
    return;
  }
  if (!box) {
    box = document.createElement('p');
    box.className = 'field-error';
    box.id = `err-${name}-${Math.random().toString(36).slice(2, 7)}`;
    field.append(box);
  }
  box.innerHTML = `${icon('icon-alert')}<span></span>`;
  box.querySelector('span').textContent = message;
  if (input) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', box.id);
  }
}

export function clearFieldErrors(form) {
  qsa('.field-error', form).forEach((node) => node.remove());
  qsa('[aria-invalid]', form).forEach((node) => {
    node.removeAttribute('aria-invalid');
    node.removeAttribute('aria-describedby');
  });
}

export function debounce(fn, wait = 220) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
