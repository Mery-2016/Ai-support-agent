# 04 · 前端架構

---

## 1. 樣式分層（不可調換順序）

```html
<link rel="stylesheet" href="styles/fonts.css">   <!-- 共用：@font-face -->
<link rel="stylesheet" href="styles/tokens.css">  <!-- 共用：token，唯一允許色碼之一 -->
<link rel="stylesheet" href="styles/base.css">    <!-- 共用：元件層 -->
<link rel="stylesheet" href="styles/app.css">     <!-- 產品層：只放領域元件 -->
```

| 層 | 來源 | 規則 |
| --- | --- | --- |
| `fonts.css` | [`design-system/assets/fonts/fonts.css`](../design-system/assets/fonts/fonts.css) | 逐字元相同 |
| `tokens.css` | [`design-system/tokens/tokens.css`](../design-system/tokens/tokens.css) | 逐字元相同。**不要修改** |
| `base.css` | [`design-system/base/base.css`](../design-system/base/base.css) | 逐字元相同。開頭有衍生 token 區段，是第二個（也是最後一個）允許色碼的地方 |
| `app.css` | 各 App 自己寫 | **絕對禁止出現色碼**，禁止重新定義 `base.css` 已有的 class |

驗證方式：

```bash
diff public/styles/base.css   <design-docs>/design-system/base/base.css
diff public/styles/tokens.css <design-docs>/design-system/tokens/tokens.css
grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(" public/styles/app.css   # 應無輸出
```

> **常見錯誤**：把產品層的 CSS 排在 `base.css` 之後，然後在裡面重新定義 `.spinner`
> 之類的共用元件。這會讓「共用」失效且不容易發現。產品層只能新增 class，不能覆寫。

---

## 2. HTML 外殼

四個 App 的 `index.html` 骨架相同，只有品牌文字與頁面標題不同：

```html
<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>頁面名 | Team 8725</title>
  <meta name="description" content="…">
  <link rel="icon" href="assets/images/icon.ico">
  <link rel="stylesheet" href="styles/fonts.css">
  <link rel="stylesheet" href="styles/tokens.css">
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/app.css">
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要內容</a>

  <!-- 啟動中：等待後端回報登入狀態 -->
  <div class="boot" id="boot-view">
    <div class="boot-card">
      <img class="boot-logo" src="assets/images/icon.ico" alt="">
      <p class="boot-title">Team 8725 產品名</p>
      <p class="boot-text" role="status">正在確認登入狀態…</p>
      <div class="spinner" aria-hidden="true"></div>
    </div>
  </div>

  <!-- 無法完成登入或讀不到帳號資料時的錯誤畫面 -->
  <div class="auth" id="auth-view" hidden></div>

  <!-- 已登入：主要應用程式 -->
  <div class="shell" id="app-shell" hidden>
    <nav class="rail" id="rail" aria-label="主要導覽">
      <button class="sidebar-toggle" type="button" data-sidebar-toggle
              aria-label="收合側邊欄" aria-expanded="true">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <use href="assets/icons/icon-chevron-left.svg#icon-chevron-left"></use>
        </svg>
      </button>

      <div class="brand">
        <img class="brand-logo" src="assets/images/icon.ico" alt="">
        <span class="brand-copy">
          <strong><b>MIST</b><span>PRODUCT</span></strong>
          <small>English Subtitle</small>
        </span>
      </div>

      <button class="icon-button nav-toggle" type="button" data-nav-toggle
              aria-expanded="false" aria-controls="nav-panel" aria-label="開啟導覽選單">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <use href="assets/icons/icon-menu.svg#icon-menu"></use>
        </svg>
      </button>

      <div class="nav-panel" id="nav-panel">
        <div class="nav-group" id="nav-group"></div>
        <div class="rail-foot" id="rail-foot"></div>
      </div>
    </nav>

    <main class="main" id="main-content" tabindex="-1"></main>
  </div>

  <div class="toast-region" id="toast-region" aria-live="polite" aria-atomic="false"></div>
  <div id="dialog-root"></div>

  <script type="module" src="src/app.js"></script>
  <noscript><p class="noscript">這個系統需要 JavaScript 才能運作。請啟用後重新整理頁面。</p></noscript>
</body>
</html>
```

三個容器（`#boot-view` / `#auth-view` / `#app-shell`）互斥，由 `showOnly()` 切換。
`#toast-region` 與 `#dialog-root` 在三種狀態下都存在。

### 品牌區

| App | wordmark | 副標 |
| --- | --- | --- |
| 任務管理 | `MIST` + `TASKS` | `Tasks Management` |
| 零件加工 | `MIST` + `PARTS` | `Fabrication · Schedule` |
| 偵察分析 | `MIST` + `SCOUT` | `Scouting · Analysis` |
| 培訓室管理 | `MIST` + `STORAGE` | `Misty Panther · Workshop` |

`<b>MIST</b>` 為 `font-weight: 800`，後段 `400`，整體斜體。Logo 44×44 白底圓角 10px。

---

## 3. 模組職責

```text
src/config.js       API base url、輪詢間隔等常數
src/db.js           後端門面：唯一對外的 API 出入口 + 錯誤訊息中文化
src/app.js          進入點：身分載入、導覽列渲染、路由註冊、側邊欄
src/router.js       hash 路由：定義路由、outlet、not-found
src/store.js        全域狀態 + 訂閱（subscribe / emit）
src/permissions.js  前端權限判斷（必須與 Worker 規則一致）
src/constants.js    列舉：狀態、角色、標籤
src/util/dom.js     ← 共用
src/ui/*.js         ← 共用（components / dialog / toast）
src/pages/*.js      各頁面：export function xxxPage(container) → 回傳 unsubscribe
```

**只有 `db.js` 能發 HTTP。** 頁面與 `data/` 一律透過它，這樣換後端或加重試邏輯
只要改一個檔案。

### 頁面的形狀

```js
export function examplePage(container) {
  function paint() {
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div>
            <h1>頁面名</h1>
            <p>一句話說明這一頁在做什麼。</p>
          </div>
          <div class="page-head-actions">…</div>
        </header>
        …
      </div>`;
    bind();
  }
  function bind() { /* 事件綁定 */ }
  paint();
  return subscribe(paint);      // 回傳解除訂閱函式，router 換頁時呼叫
}
```

每一頁都要有 `.page-head` 的標題 **與一句說明**。
（四個 App 中曾經只有一個有說明文字，那就是不一致的來源。）

---

## 4. 啟動流程與自動登入

```
onAuthStateChanged
  ├─ 有身分 → 讀取自己的 people 資料 → 啟動同步 → showOnly('app')
  └─ 沒身分 → db.js 已自動導向 Access；走到這裡代表導向被擋下 → showOnly('auth') 顯示錯誤
```

### 4.1 自動導向（含防迴圈）

沒有工作階段時**不顯示登入頁，直接導向** `auth/login`。
一定要有防迴圈旗標，否則 Access 設錯時會無限轉圈：

```js
const LOGIN_ATTEMPT_KEY = 'frc8725.<app>.loginAttempt';

function loginAlreadyAttempted() {
  if (new URL(location.href).searchParams.get('login_error')) return true;
  try { return sessionStorage.getItem(LOGIN_ATTEMPT_KEY) === '1'; } catch { return false; }
}

export function startAccessLogin() {
  if (!API_BASE || loginAlreadyAttempted()) return false;
  try { sessionStorage.setItem(LOGIN_ATTEMPT_KEY, '1'); } catch { /* 少一層防護 */ }
  const back = `${location.origin}${location.pathname}${location.hash}`;
  location.assign(`${API_BASE}/v1/auth/login?redirect=${encodeURIComponent(back)}`);
  return true;
}

/** 錯誤畫面的「重新嘗試」：清掉旗標與網址上的錯誤參數後重試。 */
export function retryAccessLogin() {
  try { sessionStorage.removeItem(LOGIN_ATTEMPT_KEY); } catch { /* ignore */ }
  const url = new URL(location.href);
  url.searchParams.delete('login_error');
  location.replace(url.toString());
}
```

成功取得工作階段後**要清掉旗標**，否則下次 session 過期時無法自動重登。

### 4.2 401 也要自動重登

`db.js` 的 request 包裝在收到 401 時同樣呼叫 `startAccessLogin()`，
這樣使用者用到一半 session 過期會自動接上，而不是看到一堆錯誤 toast。

`redirect: 'manual'` 是為了處理「整個 API 都被 Access 保護」的設定：
未登入時 Access 會回 302，要把它當成「尚未登入」而不是網路錯誤。

```js
if (response.type === 'opaqueredirect' || response.status === 0) {
  signedOut();
  throw fail('尚未登入', 'auth/signed-out');
}
```

### 4.3 沒有登出

登入由 Access 管理，App **不提供登出按鈕**。
帳號區只顯示「姓名 + 角色」。要擋掉某個人請改 Access 的 Policy。

---

## 5. 導覽列

由 JS 依權限渲染，分「主要」與「管理」兩段：

```js
const NAV_MAIN = [
  { href: '#/',      label: '首頁',   iconName: 'icon-home' },
  { href: '#/items', label: '項目',   iconName: 'icon-box', count: (s) => s.openCount },
];
const NAV_MANAGE = [
  { href: '#/users',    label: '成員管理', iconName: 'icon-shield',  adminOnly: true },
  { href: '#/activity', label: '操作紀錄', iconName: 'icon-history', adminOnly: true },
];
```

規則：

- 主要區**沒有**標題，直接從第一項開始。
- 管理區固定 `<p class="nav-section">管理</p>`；整段因權限不可見時，標題也不渲染。
- 當前項目：`class="nav-link is-active"` + `aria-current="page"`。
- `.nav-count` 只在數字 > 0 時輸出。
- 每個 `.nav-link` 都要有 `title`（收合時只剩圖示，靠 title 辨識）。

### 跨 App 保留字

同一個概念在任何 App 出現時，**名稱與圖示必須完全一致**：

| 概念 | 名稱 | 圖示 |
| --- | --- | --- |
| 落地頁 | **首頁** | `icon-home` |
| 成員／權限管理 | **成員管理** | `icon-shield` |
| 稽核／操作紀錄 | **操作紀錄** | `icon-history` |
| 系統設定 | **系統設定** | `icon-settings` |

不要出現「總覽」「儀表板」「使用者」「設定」「紀錄」這些同義但不同字的標籤。

---

## 6. 側邊欄收合

- 收合寬度 260 / 76 px（`--rail-expanded` / `--rail-collapsed`）。
- 狀態存 `localStorage`，key 格式 `frc8725.<app>.sidebarCollapsed`。
- ≤768px 時強制不套用收合狀態：`sidebarMedia.matches ? false : stored`。
- 圖示 `icon-chevron-left`，收合時 `transform: rotate(180deg)`。

---

## 7. 全域狀態

小量、全站都要用的資料（人員、分類、設定）啟動後同步到記憶體；
量大或有權限範圍的資料依範圍訂閱。

```js
export const state = {
  user: null,          // 登入帳號
  profile: null,       // 自己的 people 資料
  people: [],
  items: [],
  ready: { people: false, items: false },
  errors: {},          // 集合名稱 → 錯誤訊息
};

const listeners = new Set();
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function emit() { listeners.forEach((fn) => fn(state)); }
```

- `ready` 旗標決定顯示骨架屏還是內容。**不要用「陣列長度為 0」判斷載入中**，
  那會讓空清單一直顯示骨架。
- `errors` 讓頁面能區分「還沒到」與「讀取失敗」。
- 角色或範圍被管理員調整時，要重建訂閱範圍（用一個 `scopeKey` 字串比對）。

### 輪詢式即時同步

D1 沒有推播。做法：

- 同一個 tick 的所有讀取合併成一次 HTTP 請求（`queueMicrotask` + 佇列）。
- 預設每 5 秒重讀；只有內容真的改變（比對 fingerprint）才通知，否則畫面會每輪重繪。
- 自己寫入後立刻重讀，不等下一輪。
- `document.hidden` 時暫停；`visibilitychange` 與 `online` 時補上。
- 連續失敗只回報一次錯誤，避免整排錯誤提示。

---

## 8. 安全

- 所有插入 HTML 的使用者輸入都必須 `escapeHtml()`。用 `h` 樣板標籤可以自動處理。
- 前端的 `permissions.js` 只用於顯示／隱藏，**不是安全邊界**。
  規則必須與 Worker 一致，但 Worker 才是真正的把關。
- 前端不持有任何金鑰。需要外部 API key 時由 Worker 代理。
