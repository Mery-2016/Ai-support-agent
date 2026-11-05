/**
 * 元件展示頁 + 新 App 外殼範本。
 *
 * 這個檔案示範三件事：
 *   1. 共用 UI 模組（../ui/）怎麼引用與使用。
 *   2. 側邊欄收合與行動版漢堡選單的完整行為（直接複製到新 App）。
 *   3. base.css 提供的每一個元件實際長什麼樣子。
 *
 * 新 App 只要照 docs/08-new-app.md 把 ../ui/ 四個檔案複製進 src/，
 * 把下面「§1 外殼」那一段搬進 app.js，剩下的展示內容刪掉即可。
 */
import { icon, qs, qsa, setIconBase, setLoading } from '../ui/dom.js';
import {
  breadcrumbs, callout, emptyState, progressBlock, selectField,
  skeletonList, statCard, tag, textField, textareaField,
} from '../ui/components.js';
import { confirmDialog, openDialog, promptDialog } from '../ui/dialog.js';
import { toastError, toastInfo, toastSuccess } from '../ui/toast.js';

// 這個頁面不在網站根目錄，所以要告訴 icon() 圖示放在哪裡。
// 正式的 App 圖示在 assets/icons/（預設值），不需要呼叫這一行。
setIconBase('../assets/icons');

/* ============================================================
   §1 外殼：導覽、收合、行動版漢堡
   —— 這一段直接複製到新 App 的 app.js
   ============================================================ */

const shellEl = qs('#app-shell');
const railEl = qs('#rail');

const NAV_MAIN = [
  { href: '#/', label: '首頁', iconName: 'icon-home' },
  { href: '#/items', label: '項目', iconName: 'icon-box', count: 3 },
  { href: '#/reports', label: '報表', iconName: 'icon-clipboard' },
];

const NAV_MANAGE = [
  { href: '#/users', label: '成員管理', iconName: 'icon-shield' },
  { href: '#/activity', label: '操作紀錄', iconName: 'icon-history' },
];

function renderNav() {
  const current = location.hash || '#/';
  const link = (item) => {
    const active = current === item.href;
    return `
      <a class="nav-link${active ? ' is-active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''} title="${item.label}">
        ${icon(item.iconName)}<span>${item.label}</span>
        ${item.count ? `<span class="nav-count num">${item.count}</span>` : ''}
      </a>`;
  };

  qs('#nav-group').innerHTML = `
    ${NAV_MAIN.map(link).join('')}
    <p class="nav-section">管理</p>
    ${NAV_MANAGE.map(link).join('')}`;

  // 登入由 Cloudflare Access 管理，帳號區只顯示身分，不提供登出。
  qs('#rail-foot').innerHTML = `
    <div class="rail-user">
      <span class="rail-user-copy">
        <strong>王小明</strong>
        <small>管理員</small>
      </span>
    </div>`;
}

const SIDEBAR_KEY = 'frc8725.starter.sidebarCollapsed';
const sidebarMedia = window.matchMedia('(max-width: 768px)');

function applySidebar(collapsed) {
  const toggle = qs('[data-sidebar-toggle]');
  shellEl.classList.toggle('is-collapsed', collapsed);
  toggle?.setAttribute('aria-expanded', String(!collapsed));
  const label = collapsed ? '展開側邊欄' : '收合側邊欄';
  toggle?.setAttribute('aria-label', label);
  if (toggle) toggle.title = label;
}

function initSidebar() {
  qs('[data-sidebar-toggle]')?.addEventListener('click', () => {
    const collapsed = !shellEl.classList.contains('is-collapsed');
    applySidebar(collapsed);
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0'); } catch { /* 儲存空間不可用 */ }
  });

  const sync = () => {
    let stored = false;
    try { stored = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch { stored = false; }
    // ≤768px 一律不套用收合狀態，否則手機會看到一個奇怪的窄條。
    applySidebar(sidebarMedia.matches ? false : stored);
  };
  sidebarMedia.addEventListener('change', sync);
  sync();

  const navToggle = qs('[data-nav-toggle]');
  const setNavOpen = (open) => {
    railEl.classList.toggle('is-open', open);
    navToggle?.setAttribute('aria-expanded', String(open));
    navToggle?.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
  };
  navToggle?.addEventListener('click', () => setNavOpen(!railEl.classList.contains('is-open')));
  railEl.addEventListener('click', (event) => {
    if (event.target.closest('a')) setNavOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && railEl.classList.contains('is-open')) {
      setNavOpen(false);
      navToggle?.focus();
    }
  });
}

/* ============================================================
   §2 以下是元件展示，新 App 請整段刪除
   ============================================================ */

const ROLE_OPTIONS = [['member', '成員'], ['keeper', '管理人'], ['admin', '管理員']];

function section(title, note, body) {
  return `
    <section class="section">
      <div class="section-head">
        <h2>${title}</h2>
        ${note ? `<p>${note}</p>` : ''}
      </div>
      ${body}
    </section>`;
}

function buildPage() {
  return `
    ${breadcrumbs([{ label: '設計系統', href: '#/' }, { label: '元件展示' }])}

    <header class="page-head">
      <div>
        <h1>元件展示</h1>
        <p>base.css 提供的全部元件。每一頁都要有標題與一句說明，這是共用規範的一部分。</p>
      </div>
      <div class="page-head-actions">
        <button class="button button--ghost" type="button" data-demo="boot">${icon('icon-refresh')}看啟動畫面</button>
        <button class="button button--primary" type="button" data-demo="dialog">${icon('icon-plus')}新增項目</button>
      </div>
    </header>

    ${section('統計卡', '.stat + .grid--stats', `
      <div class="grid grid--stats">
        ${statCard({ label: '全部項目', value: 128, iconName: 'icon-box' })}
        ${statCard({ label: '待處理', value: 12, tone: 'warning', note: '需要今天處理', iconName: 'icon-inbox' })}
        ${statCard({ label: '已逾期', value: 3, tone: 'danger', iconName: 'icon-alert' })}
        ${statCard({ label: '已完成', value: 113, tone: 'success', href: '#/items', iconName: 'icon-check-circle' })}
      </div>`)}

    ${section('按鈕', '.button 的六種變體與尺寸', `
      <div class="card">
        <div class="stack">
          <div class="button-group">
            <button class="button button--primary" type="button">主要動作</button>
            <button class="button" type="button">次要動作</button>
            <button class="button button--ghost" type="button">Ghost</button>
            <button class="button button--quiet" type="button">Quiet</button>
            <button class="button button--success" type="button">${icon('icon-check')}成功</button>
            <button class="button button--danger" type="button">${icon('icon-trash')}危險</button>
            <button class="button" type="button" disabled>停用</button>
          </div>
          <div class="button-group">
            <button class="button button--sm button--primary" type="button">小按鈕</button>
            <button class="button button--sm" type="button">小按鈕</button>
            <button class="icon-button" type="button" aria-label="編輯" title="編輯">${icon('icon-edit')}</button>
            <button class="icon-button icon-button--danger" type="button" aria-label="刪除" title="刪除">${icon('icon-trash')}</button>
            <button class="button" type="button" data-demo="loading">按我看載入中</button>
          </div>
          <div class="segmented" role="group" aria-label="檢視">
            <button type="button" aria-pressed="true">列表</button>
            <button type="button" aria-pressed="false">看板</button>
            <button type="button" aria-pressed="false">時間軸</button>
          </div>
        </div>
      </div>`)}

    ${section('篩選列', '.toolbar / .chip / .result-bar', `
      <div class="toolbar">
        <div class="field toolbar-search">
          <label class="visually-hidden" for="demo-search">搜尋名稱或標籤</label>
          ${icon('icon-search')}
          <input id="demo-search" type="search" placeholder="搜尋名稱或標籤" autocomplete="off">
        </div>
        <div class="quick-filters">
          <button class="chip" type="button" aria-pressed="true">${icon('icon-inbox')}待處理</button>
          <button class="chip" type="button" aria-pressed="false">${icon('icon-flag')}高優先</button>
          <button class="chip" type="button" aria-pressed="false">${icon('icon-alert')}已逾期</button>
        </div>
        <div class="filter-grid">
          ${selectField({ id: 'f-role', name: 'role', label: '角色', options: [['', '全部'], ...ROLE_OPTIONS] })}
          ${selectField({ id: 'f-sort', name: 'sort', label: '排序', options: [['new', '最新'], ['old', '最舊']] })}
        </div>
      </div>
      <div class="result-bar">
        <span aria-live="polite">共 3 筆</span>
        <span class="row">${tag('已篩選', 'icon-search')}</span>
      </div>`)}

    ${section('表格', '.table-wrap + table.data；窄螢幕自動橫捲', `
      <div class="card card--flush">
        <div class="table-wrap">
          <table class="data">
            <caption class="visually-hidden">成員清單</caption>
            <thead>
              <tr>
                <th scope="col">姓名</th>
                <th scope="col">電子郵件</th>
                <th scope="col">角色</th>
                <th scope="col">標籤</th>
                <th scope="col" class="num">數量</th>
                <th scope="col"><span class="visually-hidden">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>王小明<span class="muted">（你）</span></td>
                <td class="muted">ming@example.com</td>
                <td><span class="badge badge--primary">${icon('icon-shield')}管理員</span></td>
                <td>${tag('機械組')}</td>
                <td class="num">42</td>
                <td class="actions">
                  <button class="button button--ghost button--sm" type="button">${icon('icon-edit')}編輯</button>
                </td>
              </tr>
              <tr>
                <td>陳小華</td>
                <td class="muted">hua@example.com</td>
                <td><span class="badge badge--neutral">${icon('icon-user')}成員</span></td>
                <td>${tag('程式組')}</td>
                <td class="num">7</td>
                <td class="actions">
                  <button class="button button--ghost button--sm" type="button">${icon('icon-edit')}編輯</button>
                </td>
              </tr>
              <tr>
                <td>林小美</td>
                <td class="muted">mei@example.com</td>
                <td><span class="badge badge--info">${icon('icon-users')}管理人</span></td>
                <td><span class="muted">未指派</span></td>
                <td class="num">18</td>
                <td class="actions">
                  <button class="button button--ghost button--sm" type="button">${icon('icon-edit')}編輯</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`)}

    ${section('徽章、標籤與提示', '.badge 是狀態，.tag 是分類，.callout 是就地提示', `
      <div class="card stack">
        <div class="row">
          <span class="badge badge--neutral">${icon('icon-inbox')}待處理</span>
          <span class="badge badge--info">${icon('icon-refresh')}進行中</span>
          <span class="badge badge--primary">${icon('icon-shield')}管理員</span>
          <span class="badge badge--success">${icon('icon-check-circle')}已完成</span>
          <span class="badge badge--warning">${icon('icon-clipboard')}等待審核</span>
          <span class="badge badge--danger">${icon('icon-alert')}已逾期</span>
        </div>
        <div class="row">
          ${tag('機械組')}${tag('程式組', 'icon-box')}
          <span class="tag tag--team" style="--team-color: var(--color-info)">以色彩標記的分類</span>
        </div>
        ${progressBlock(7, 10)}
        ${callout('這是一般說明。需要持續顯示的提醒用 callout，不要用會消失的 toast。', 'info')}
        ${callout('這個操作無法復原，請先確認資料。', 'warning', 'icon-alert')}
        ${callout('資料同步失敗，請檢查網路後重新整理。', 'danger', 'icon-alert')}
      </div>`)}

    ${section('表單', '輸入框不用 class；底色比卡片深是刻意的', `
      <div class="card">
        <form class="form" novalidate onsubmit="return false">
          <fieldset class="fieldset">
            <legend>基本資料</legend>
            <div class="grid grid--2">
              ${textField({ id: 'f-name', name: 'name', label: '名稱', required: true, placeholder: '例如：底盤支架' })}
              ${textField({ id: 'f-code', name: 'code', label: '編號', hint: '團隊的編號格式，例如 8725-CLB-004' })}
            </div>
            <div class="grid grid--2">
              ${selectField({ id: 'f-role2', name: 'role', label: '角色', required: true, options: ROLE_OPTIONS, hint: '管理員可以調整其他人的角色。' })}
              ${textField({ id: 'f-date', name: 'date', label: '截止日期', type: 'date', required: true })}
            </div>
            ${textareaField({ id: 'f-note', name: 'note', label: '備註', placeholder: '公差、外觀要求或其他不可忽略的資訊', rows: 3 })}
            <fieldset class="field">
              <legend class="field-label">通知</legend>
              <div class="check-grid">
                <label class="checkbox"><input type="checkbox" checked> 有人指派我</label>
                <label class="checkbox"><input type="checkbox"> 狀態變更</label>
                <label class="checkbox"><input type="checkbox"> 每日摘要</label>
              </div>
            </fieldset>
            <div class="field">
              <label class="field-label" for="f-bad">有錯誤的欄位</label>
              <input id="f-bad" type="text" value="不合法的值" aria-invalid="true" aria-describedby="f-bad-error">
              <p class="field-error" id="f-bad-error">${icon('icon-alert')}<span>這個欄位只能填數字。</span></p>
            </div>
          </fieldset>
          <div class="form-actions">
            <button class="button button--ghost" type="reset">取消</button>
            <button class="button button--primary" type="submit">儲存變更</button>
          </div>
        </form>
      </div>`)}

    ${section('疊層與回饋', 'dialog / confirm / prompt / toast', `
      <div class="card">
        <div class="button-group">
          <button class="button" type="button" data-demo="dialog">開啟對話框</button>
          <button class="button button--danger" type="button" data-demo="confirm">危險操作確認</button>
          <button class="button" type="button" data-demo="prompt">輸入對話框</button>
          <button class="button button--success" type="button" data-demo="toast-success">成功 toast</button>
          <button class="button button--danger" type="button" data-demo="toast-error">錯誤 toast</button>
          <button class="button" type="button" data-demo="toast-info">一般 toast</button>
        </div>
      </div>`)}

    ${section('載入與空狀態', '列表載入中一律用骨架屏，不要用置中 spinner', `
      <div class="grid grid--2">
        <div class="card card--flush">
          <div class="card-head"><h2>載入中</h2></div>
          <div class="card-body">${skeletonList(3)}</div>
        </div>
        <div class="card card--flush">
          <div class="card-head"><h2>空清單</h2></div>
          ${emptyState({
            title: '還沒有任何項目',
            description: '建立第一筆項目後就會顯示在這裡，包含負責人、狀態與截止日期。',
            iconName: 'icon-box',
            action: '<button class="button button--primary" type="button" data-demo="dialog">建立第一筆項目</button>',
          })}
        </div>
      </div>`)}

    ${section('屬性清單與 spinner', '.prop-list / .spinner', `
      <div class="grid grid--2">
        <div class="card">
          <h2>項目資訊</h2>
          <dl class="prop-list">
            <div class="prop"><dt>編號</dt><dd class="mono">8725-CLB-004</dd></div>
            <div class="prop"><dt>負責人</dt><dd>王小明</dd></div>
            <div class="prop"><dt>建立時間</dt><dd class="num">2026-08-05 14:32</dd></div>
            <div class="prop"><dt>很長的網址</dt><dd>https://example.com/a/very/long/path/that/must/wrap/instead/of/overflowing</dd></div>
          </dl>
        </div>
        <div class="card">
          <h2>Spinner</h2>
          <div class="row">
            <span class="spinner" aria-hidden="true"></span>
            <span class="spinner spinner--sm" aria-hidden="true"></span>
            <span class="muted">只用於啟動畫面與按鈕內。</span>
          </div>
        </div>
      </div>`)}`;
}

/* ---------------------------- 展示的互動 ---------------------------- */

function demoDialog() {
  openDialog({
    title: '新增項目',
    wide: true,
    body: `
      <form class="stack" data-form novalidate>
        ${textField({ id: 'd-name', name: 'name', label: '名稱', required: true })}
        ${selectField({ id: 'd-role', name: 'role', label: '角色', required: true, options: ROLE_OPTIONS })}
        ${textareaField({ id: 'd-note', name: 'note', label: '備註', rows: 3 })}
      </form>`,
    footer: `
      <button class="button button--ghost" type="button" data-dialog-close>取消</button>
      <button class="button button--primary" type="button" data-save>儲存</button>`,
    onMount(dialog, close) {
      dialog.querySelector('[data-save]').addEventListener('click', () => {
        toastSuccess('已建立項目「示範項目」。');
        close();
      });
    },
  });
}

async function demoConfirm() {
  const ok = await confirmDialog({
    title: '刪除項目',
    message: '確定要刪除項目「底盤支架」嗎？',
    detail: '刪除後無法復原，但既有的操作紀錄仍會保留。',
    confirmLabel: '刪除項目',
    tone: 'danger',
  });
  if (ok) toastSuccess('已刪除項目「底盤支架」。');
  else toastInfo('已取消，沒有任何變更。');
}

async function demoPrompt() {
  const reason = await promptDialog({
    title: '退回原因',
    label: '請說明退回的原因',
    hint: '原因會寫入項目備註，讓建立者知道要修正什麼。',
    placeholder: '例如：孔位尺寸與圖面不符',
    confirmLabel: '退回',
  });
  if (reason) toastSuccess(`已退回，原因：${reason}`);
}

function demoBoot() {
  qs('#boot-view').hidden = false;
  qs('#app-shell').hidden = true;
  setTimeout(() => {
    qs('#boot-view').hidden = true;
    qs('#app-shell').hidden = false;
    toastInfo('這就是四個 App 共用的啟動畫面。');
  }, 1800);
}

function bindDemos() {
  const actions = {
    dialog: demoDialog,
    confirm: demoConfirm,
    prompt: demoPrompt,
    boot: demoBoot,
    'toast-success': () => toastSuccess('已更新「王小明」的成員設定。'),
    'toast-error': () => toastError('更新失敗，請稍後重試；若持續發生請聯絡管理員。'),
    'toast-info': () => toastInfo('資料每 5 秒自動重新整理一次。'),
    loading: (button) => {
      setLoading(button, true, '處理中…');
      setTimeout(() => setLoading(button, false), 1600);
    },
  };

  qsa('[data-demo]', document).forEach((node) => {
    node.addEventListener('click', () => actions[node.dataset.demo]?.(node));
  });

  qsa('.segmented button', document).forEach((node) => {
    node.addEventListener('click', () => {
      qsa('.segmented button', node.closest('.segmented'))
        .forEach((sibling) => sibling.setAttribute('aria-pressed', String(sibling === node)));
    });
  });

  qsa('.chip', document).forEach((node) => {
    node.addEventListener('click', () => {
      node.setAttribute('aria-pressed', String(node.getAttribute('aria-pressed') !== 'true'));
    });
  });
}

/* ---------------------------- 啟動 ---------------------------- */

renderNav();
initSidebar();
qs('#page').innerHTML = buildPage();
bindDemos();
window.addEventListener('hashchange', renderNav);
