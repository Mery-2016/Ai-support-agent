# 05 · 元件參考

`base.css` 提供的全部 class。**這是唯一合法的名稱清單**——不要自己另創同義的
`.btn` / `.panel` / `.modal` / `.state-block`。

實作在 [`../design-system/base/base.css`](../design-system/base/base.css)（14 個區段）。
設計意圖與使用時機見 [`../design-system-guide.md`](../design-system-guide.md) 第 7 章。

---

## 1. 版面骨架

| class | 說明 |
| --- | --- |
| `.shell` | 外層 grid：`var(--rail-width)` + 內容。`.is-collapsed` 切換 260 / 76 px |
| `.rail` | 側邊導覽容器，`position: sticky` 滿版高 |
| `.sidebar-toggle` | 收合圓鈕，浮在 rail 右緣 `-13px` |
| `.nav-toggle` | 手機漢堡鈕，桌面 `display: none` |
| `.nav-panel` | 手機下拉容器；桌面時就是導覽本體 |
| `.nav-group` | 導覽連結群，可捲動 |
| `.nav-section` | 分組標題（固定用於「管理」段），11px 大寫 |
| `.nav-link` / `.nav-link.is-active` | 導覽項，40px 高、18px 圖示 |
| `.nav-count` | 項目右側數字徽章（膠囊） |
| `.rail-foot` | rail 底部區（`margin-top: auto`） |
| `.rail-user` / `.rail-user-copy` | 帳號區：姓名 + 角色 |
| `.brand` / `.brand-logo` / `.brand-copy` | 品牌區，Logo 44px |
| `.main` | 內容區，內距 `28px 32px 64px` |
| `.page` | 頁面容器，`max-width: var(--content-max)`（1400px）並置中 |

## 2. 頁首與區段

| class | 說明 |
| --- | --- |
| `.page-head` | `h1` + `p` + `.page-head-actions`，flex、可換行 |
| `.page-head-actions` | 頁面層級動作按鈕群 |
| `.breadcrumbs` | 麵包屑，最後一項 `aria-current="page"` |
| `.section` / `.section-head` | 區段容器與其標題列（`h2` + `p`） |
| `.card` | 卡片：surface-1 底、圓角 14px、內距 20px |
| `.card--tight` | 內距縮成 16px |
| `.card--flush` | 內距 0（給表格、列表用），`overflow: hidden` |
| `.card-head` / `.card-body` | 帶分隔線的卡片標題列與內容區 |
| `.grid` `.grid--2` `.grid--3` `.grid--stats` | 自動換行網格（`auto-fit` + `min()`，320px 也不會撐破） |
| `.stack` | 垂直堆疊，間距 12px |
| `.row` `.row--between` `.row--end` | 水平排列，可換行 |

## 3. 按鈕與控制項

| class | 規格 |
| --- | --- |
| `.button` | 38px 高、內距 `8px 14px`、圓角 6px、14px/600、圖示 17px |
| `.button--primary` | primary 底、白字 |
| `.button--ghost` | 透明底 + border 框 |
| `.button--quiet` | 全透明、muted 字（低調動作） |
| `.button--danger` | danger 的底/框/字 |
| `.button--success` | success 的底/框/字 |
| `.button--sm` | 32px 高、13px |
| `.button--block` | `width: 100%` |
| `.button.is-loading` | 由 `setLoading()` 加上；鎖住寬度、塞入小 spinner |
| `.icon-button` | 38×38 方形純圖示鈕，透明底 |
| `.icon-button--danger` | hover 轉 danger 色 |
| `.button-group` | 按鈕群，可換行 |
| `.segmented` | 膠囊分段控制，內部 `button[aria-pressed]` |
| `.chip` | **可按下的**篩選膠囊，32px 高、圓角 10px、`aria-pressed="true"` 呈選取態 |

> 只有 `.segmented`、`.chip` 與 `.nav-count` 可以用膠囊語意。
> 一般按鈕、輸入框、卡片、列、toast、dialog **不得**做成藥丸形。

## 4. 表單

輸入框**不用 class**，`base.css` 直接對原生元素下規則：

```css
input[type="text"|"email"|"password"|"search"|"url"|"date"|"number"], select, textarea {
  width: 100%; min-height: 44px; padding: 8px 11px;
  background: var(--color-bg);        /* 比卡片「更深」，這是刻意的 */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
```

| class | 說明 |
| --- | --- |
| `.form` | `display: grid; gap: 20px` |
| `.fieldset` + `legend` | 欄位分組 |
| `.field` | 單一欄位容器（label + 控制項 + hint/error） |
| `.field-label` + `.req` | 標籤與必填星號 |
| `.field-hint` | 12px 說明文字 |
| `.field-error` | 圖示 + 錯誤訊息，配 `aria-invalid` / `aria-describedby` |
| `.select-wrap` | `select` 外層，內含 `icon-chevron-down`（原生箭頭已隱藏） |
| `.checkbox` / `.radio` | 17px、`accent-color: var(--color-primary)` |
| `.check-grid` | 多個 checkbox 的框狀容器 |
| `.form-actions` / `--split` | 動作列，上方分隔線、預設右對齊 |
| `.inline-form` | 橫排欄位 + 按鈕 |

## 5. 標籤與狀態

| class | 說明 |
| --- | --- |
| `.badge` + `--neutral/--info/--primary/--success/--warning/--danger` | 狀態徽章，12px/700、圓角 6px、13px 圖示 |
| `.tag` | **靜態**標籤，圓角 4px |
| `.tag--team` | 以 `--team-color`（行內 style 提供）著色的標籤 |
| `.callout` + `--info/--success/--warning/--danger` | 就地提示區塊，圓角 10px；`strong` 自動獨立成行 |
| `.progress` `.progress-track` `.progress-bar` `.progress-meta` | 進度條，6px 高；`.is-done` 轉綠 |
| `.stat` `.stat-label` `.stat-value` `.stat-note` | 統計卡，最小高 104px、數字 28px |
| `.stat--danger/--warning/--info/--success` | 數字著色 |

`.badge` 表示「這個東西目前的狀態」，`.tag` 表示「這個東西的分類」。不要混用。

## 6. 載入與空狀態

| class | 說明 |
| --- | --- |
| `.boot` `.boot-card` `.boot-logo` `.boot-title` `.boot-text` | 全螢幕啟動畫面 |
| `.auth` `.auth-card` `.auth-head` `.auth-pending` | 全螢幕錯誤／說明畫面 |
| `.spinner` / `.spinner--sm` | 22px / 15px 環形，700ms |
| `.skeleton` `.skeleton-list` `.skeleton-row` | 骨架屏，列高 62px、`pulse` 動畫 |
| `.empty` / `.empty--inline` | 空狀態：30px 圖示 + `strong` + `p` + 動作 |

**列表載入中一律用骨架屏，不要用置中 spinner。** spinner 只用於啟動畫面與按鈕內。

## 7. 篩選與表格

| class | 說明 |
| --- | --- |
| `.toolbar` | 篩選列容器（卡片外觀） |
| `.toolbar-search` | 帶左側搜尋圖示的輸入框 |
| `.filter-grid` | 自動換行的篩選欄位群 |
| `.quick-filters` | 一排 `.chip` |
| `.result-bar` | 「共 N 筆」+ 排序控制，13px muted |
| `.table-wrap` | 表格外層，`overflow-x: auto` |
| `table.data` | 表格本體；`th` 12px muted 粗體、列 hover 有底色 |
| `table.data td.actions` | 右對齊、不換行 |
| `table.data td.num` / `th.num` | 右對齊 + tabular-nums |
| `.prop-list` `.prop`（`dt`/`dd`） | 屬性清單 |

## 8. 疊層元件

| class | 說明 |
| --- | --- |
| `.dialog-backdrop` | `position: fixed; inset: 0; z-index: 50` |
| `.dialog` / `.dialog--wide` | 560 / 720px，grid `auto 1fr auto` |
| `.dialog > header` | 標題 + `.icon-button` 關閉鈕，下分隔線 |
| `.dialog-body` | 可捲動內容，`display: grid; gap: 16px` |
| `.dialog > footer` | 右對齊動作，上分隔線 |
| `.toast-region` | 右下固定容器，**可堆疊** |
| `.toast` + `--success/--error/--info` | 左側 3px 色條 |

Toast 型別**只有三種**：`success` / `error` / `info`。
需要 warning 就用 `.callout--warning` 就地顯示（警告通常不該自動消失）。

## 9. 工具 class

| class | 說明 |
| --- | --- |
| `.visually-hidden` | 螢幕閱讀器可見、視覺隱藏（**不要叫 `.sr-only`**） |
| `.num` | `font-variant-numeric: tabular-nums` |
| `.mono` | 等寬字（`--font-mono`） |
| `.muted` | muted 文字色 |
| `.truncate` | 單行省略 |
| `.skip-link` | 跳到主要內容，focus 時才出現 |
| `.noscript` | 全螢幕「需要 JavaScript」提示 |

---

## 10. 這裡沒有的東西 → 放在 App 的 `app.css`

`base.css` 只收「任何 App 都會用到」的元件。以下是領域元件的例子，
它們留在各 App 的產品層，但**必須用共用 token 與共用 class 組合出來**：

| App | 領域元件 |
| --- | --- |
| 任務管理 | `.task-row` / `.board*` / `.gantt*` / `.checklist` / `.timeline` / `.member-team-*` |
| 零件加工 | 3D 檢視器、DXF 預覽、工單卡、機台看板 |
| 偵察分析 | 聯盟面板、評分表、賽程列表 |
| 培訓室管理 | 平面圖、物品列、備料單 |

判斷標準：**「另一個 App 有沒有可能用到？」** 有 → 提案加進 `base.css`（要同步五份）；
沒有 → 留在 `app.css`。

## 11. 常見錯誤

| 錯誤 | 為什麼不行 |
| --- | --- |
| 在 `app.css` 重新定義 `.spinner` / `.button` | 產品層在 `base.css` 之後載入，會靜默覆寫共用元件 |
| 在 `app.css` 寫色碼 | 之後改主題會漏改；只有 `tokens.css` 與 `base.css` 的衍生 token 區段能寫 |
| 用 `.chip` 當靜態標籤 | `.chip` 是可按的篩選膠囊，靜態標籤要用 `.tag` |
| 輸入框底色用 surface-2 | 標準是 `--color-bg`（比卡片深），這是一眼看得出的差異 |
| 列表載入中放 spinner | 標準是骨架屏 |
| 自訂 `.sr-only` | 統一叫 `.visually-hidden` |
| 給按鈕/卡片藥丸圓角 | 只有 segmented / chip / nav-count 能用膠囊 |
