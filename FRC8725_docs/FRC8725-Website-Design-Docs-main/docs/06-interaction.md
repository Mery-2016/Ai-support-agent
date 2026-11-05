# 06 · 互動與狀態呈現契約

視覺一致還不夠。**產生 HTML 的函式名稱與行為也要一致**，否則下一個功能又會長出
第五種寫法。這一份是那個契約。

原生 JS 的 App 直接複製 [`../design-system/ui/`](../design-system/ui/) 四個檔案；
React 的 App 實作**同名、同行為**的元件。

---

## 1. `ui/dom.js`

| 匯出 | 簽名 | 行為 |
| --- | --- | --- |
| `escapeHtml(value)` | `(any) => string` | HTML 跳脫。**所有插入 innerHTML 的使用者輸入都必須經過它** |
| `raw(value)` | `(string) => object` | 標記「這段 HTML 已知安全」 |
| `h` | 樣板字串標籤 | 自動跳脫插值，`raw()` 可插入已知安全 HTML |
| `icon(name, {label, className})` | `(string, opts) => string` | 產生 `<svg><use href="assets/icons/{name}.svg#{name}">`。名稱不符 `/^icon-[a-z0-9-]+$/` 時回退 `icon-alert`；沒給 `label` 就加 `aria-hidden="true"`，有給則 `role="img" aria-label` |
| `qs` / `qsa` | `(selector, scope?)` | querySelector 包裝，`qsa` 回傳陣列 |
| `setLoading(button, loading, label?)` | | 鎖住當前寬度、`disabled`、換成 `.spinner--sm` + 文字；還原時復原原本 `innerHTML` |
| `formValues(form)` | `(form) => object` | FormData → 物件，字串自動 `trim()` |
| `setFieldError(form, name, message)` | | 插入 `.field-error`，建立 `aria-invalid` + `aria-describedby`；`message` 為空則移除 |
| `clearFieldErrors(form)` | | 清掉全部欄位錯誤 |
| `debounce(fn, wait = 220)` | | 去抖動 |

`setLoading` 會鎖住按鈕寬度，這是刻意的——不鎖的話文字換成「處理中…」會讓
整排按鈕跳動。

---

## 2. `ui/components.js`

回傳 HTML 字串，不直接操作 DOM。

| 匯出 | 用途 |
| --- | --- |
| `tag(label, iconName?)` | 靜態標籤 |
| `emptyState({title, description, action, iconName, inline})` | 空狀態 |
| `skeletonList(rows = 4)` | 骨架屏 |
| `progressBlock(done, total)` | 進度條 + 「完成 x / y，進度 z%」 |
| `selectField({id, name, label, options, value, required, hint, disabled})` | 下拉欄位（`options` 是 `[value, label][]`） |
| `textField({id, name, label, value, type, required, hint, placeholder, autocomplete})` | 文字欄位 |
| `textareaField({id, name, label, value, required, hint, placeholder, rows})` | 多行欄位 |
| `statCard({label, value, note, tone, href, iconName})` | 統計卡（有 `href` 就變成連結） |
| `callout(message, tone = 'info', iconName = 'icon-alert')` | 提示區塊 |
| `breadcrumbs(items)` | 麵包屑（`[{label, href}]`） |

**這個檔案不得 import 產品常數。** 需要顯示自己領域的狀態 badge（任務狀態、
工單狀態…）時，在產品層自建 `ui/<domain>Components.js`：

```js
// src/ui/taskComponents.js — 產品層
import { icon, escapeHtml } from '../util/dom.js';
import { TASK_STATUS } from '../constants.js';

export function statusBadge(status) {
  const meta = TASK_STATUS[status] || TASK_STATUS.todo;
  return `<span class="badge badge--${meta.tone}">${icon(meta.icon)}${escapeHtml(meta.label)}</span>`;
}
```

領域列舉的形狀統一成 `{ label, tone, icon }`，`tone` 直接對應 `.badge--<tone>`：

```js
export const TASK_STATUS = {
  todo:        { label: '待處理', tone: 'neutral', icon: 'icon-inbox' },
  in_progress: { label: '進行中', tone: 'info',    icon: 'icon-refresh' },
  done:        { label: '已完成', tone: 'success', icon: 'icon-check-circle' },
};
```

---

## 3. `ui/dialog.js`

### `openDialog({title, body, footer, wide, onMount, onClose})` → `{dialog, close}`

必備行為（實作已完成，直接複製即可）：

- 焦點鎖在對話框內（Tab / Shift+Tab 循環）
- `Escape` 關閉
- 點背景關閉
- 關閉後焦點回到觸發元素
- 開啟時 `body { overflow: hidden }`，支援巢狀（用 `openCount` 計數）
- 自動聚焦順序：`[data-autofocus]` → body 內第一個輸入欄位 → 第一個可聚焦元素
- `role="dialog" aria-modal="true" aria-labelledby`
- footer 沒給就放一顆「關閉」

掛載點是 `#dialog-root`（`index.html` 要有）。

### `confirmDialog({title, message, detail, confirmLabel, cancelLabel, tone})` → `Promise<boolean>`

危險操作的確認。文字要寫明**對象、影響、是否可復原**：

```js
const ok = await confirmDialog({
  title: '刪除成員',
  message: '確定要刪除成員「王小明」嗎？',
  detail: '成員資料與組別關聯會被移除；既有任務與留言仍會保留。',
  confirmLabel: '刪除成員',
  tone: 'danger',
});
```

**不要用 `window.confirm()`。**

### `promptDialog({title, label, hint, placeholder, required, multiline, confirmLabel, value})` → `Promise<string|null>`

單一文字輸入（退回原因、完成說明…）。取消時回傳 `null`，必填未填時就地顯示錯誤。

---

## 4. `ui/toast.js`

| 匯出 | 說明 |
| --- | --- |
| `toast(message, tone = 'info')` | 基本 |
| `toastSuccess(message)` | |
| `toastError(message)` | |
| `toastInfo(message)` | |

規格：

- 掛在 `#toast-region`（`index.html` 要有），**可堆疊**
- `role`：error → `alert`，其餘 → `status`
- 存活時間：error `7000ms`，其餘 `4000ms`
- 圖示：success `icon-check-circle` / error `icon-alert` / info `icon-inbox`

---

## 5. 狀態呈現規則

這張表是「同一種情境在四個 App 長得一樣」的關鍵。

| 情境 | 一律這樣做 | 不要這樣做 |
| --- | --- | --- |
| App 啟動、確認登入 | 全螢幕 `.boot`：Logo + App 名 + 「正在確認登入狀態…」+ `.spinner` | 只有一顆 spinner、或純文字「載入中…」 |
| 沒有工作階段 | 自動導向 Access（畫面不停留），見 [`04-frontend.md`](04-frontend.md) §4 | 顯示登入頁與登入按鈕 |
| 列表資料載入中 | `skeletonList(n)` | 置中 spinner |
| 單一動作進行中 | `setLoading(button, true)` | 全頁遮罩 |
| 清單為空 | `emptyState()`：圖示 + 標題 + 一句說明 +（可選）主要動作 | 只有一行「沒有資料」 |
| 搜尋無結果 | `emptyState()`，說明要提示「調整搜尋條件」 | 與「完全沒資料」用同一句話 |
| 操作成功 | `toastSuccess()`，說明「對什麼做了什麼」 | 靜默 |
| 操作失敗 | `toastError()`，說明結果 + 下一步 | `alert()`、或只寫 console |
| 需要持續顯示的提醒 | `.callout--warning` / `--danger` 就地顯示 | toast（會消失） |
| 危險／不可復原操作 | `confirmDialog({tone: 'danger'})` | `window.confirm()` |
| 欄位驗證失敗 | `setFieldError()` + 聚焦第一個錯誤欄位 | 只在 toast 說「有欄位沒填」 |
| 權限不足的頁面 | `emptyState()` 說明原因 + 回首頁連結 | 直接空白或 403 頁 |
| 找不到路由 | `.empty` 卡片 + 顯示網址 + 回首頁按鈕 | 空白 |

### 文案原則

- 成功：說完成了什麼具體的事 —— 「已更新「王小明」的成員設定。」
- 失敗：說結果 + 下一步 —— 「更新失敗，請稍後重試；若持續發生請聯絡管理員。」
- 空狀態：說「為什麼空的」而不是「沒有資料」 —— 「團隊成員第一次打開網站時會自動建立資料。」
- 不要用「錯誤」「失敗」當唯一資訊；不要出現原始錯誤碼給一般使用者看。

---

## 6. 鍵盤與焦點

- `:focus-visible` → `2px solid var(--color-info)` + `outline-offset: 2px`（`base.css` 已處理）
- 頁面第一個可聚焦元素是 `.skip-link`
- `<main id="main-content" tabindex="-1">`，換頁後把焦點移到它
- Dialog：焦點鎖、Escape 關閉、關閉後還焦點
- 手機導覽選單：Escape 關閉並把焦點還給漢堡鈕
- 純圖示按鈕一定要有 `aria-label` **與** `title`（title 提供 hover 提示）
- 不要用 `tabindex` 正數改變順序

---

## 7. 動效

| token | 值 | 用途 |
| --- | --- | --- |
| `--duration-fast` | 120ms | 顏色、背景、邊框 |
| `--duration-normal` | 150ms | 一般 |
| `--duration-layout` | 180ms | 側欄收合、寬度變化 |

- spinner 700ms 線性旋轉；skeleton 1.4s `pulse`
- `@media (prefers-reduced-motion: reduce)`：關閉 transition、spinner 放慢到 1.6s、
  skeleton 停止動畫。`tokens.css` 已有全域覆寫，另外在 `base.css` 末段補元件層。
- 不要做超過 200ms 的入場動畫；不要用彈跳曲線

---

## 8. 資料變更時不要跳版面

- 控制項位置與主要容器尺寸在資料／狀態變化時要穩定。
- 數字用 `.num`（tabular-nums），避免寬度抖動。
- 骨架屏的列高（62px）要接近真實內容的高度。
- `setLoading` 鎖住按鈕寬度。
- 有固定高度的區塊（地圖、圖表）在載入中就先佔位。
