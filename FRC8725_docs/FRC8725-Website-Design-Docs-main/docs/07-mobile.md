# 07 · 手機與響應式

---

## 1. 斷點（只准用這四個）

| 斷點 | 行為 |
| --- | --- |
| `max-width: 1100px` | 雙欄詳細版面塌成單欄 |
| `max-width: 900px` | 列表列的側欄資訊換行到第二列 |
| `max-width: 768px` | **主要切換點**：側欄 → 頂端 bar + 漢堡；表格開始橫捲；水平容器改 snap |
| `max-width: 480px` | 手機微調：dialog 貼底全寬、動作按鈕變兩欄、內距縮減 |

多一個斷點就多一組要維護的組合。**不要自己加 `640px`、`860px` 這種中間值**——
如果某個元件在 768 到 1100 之間壞掉，先想辦法讓它自己流動（`auto-fit` + `min()`），
而不是加斷點。

`base.css` 已經處理好外殼、表格、表單、dialog、toast、篩選列的響應式；
`app.css` 只需要處理自己的領域元件。

---

## 2. 手機導覽（≤768px）

這是四個 App 最容易走鐘的地方，規格如下：

```
.shell 變成單欄 grid（auto / 1fr）
.rail 變成 position: sticky; top: 0; z-index: 20 的頂端 bar，min-height: 59px
  ├─ .sidebar-toggle          display: none
  ├─ .brand                   靠左，margin-right: auto，保留文字
  ├─ .nav-toggle（漢堡）       display: inline-grid，切換 aria-expanded
  └─ .nav-panel               position: absolute; top: 100%，預設 display: none
       .rail.is-open .nav-panel { display: grid }
       內含 .nav-group（**保留文字標籤**）與 .rail-foot
```

必要行為：

```js
const navToggle = qs('[data-nav-toggle]');
const setNavOpen = (open) => {
  railEl.classList.toggle('is-open', open);
  navToggle?.setAttribute('aria-expanded', String(open));
  navToggle?.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
};
navToggle?.addEventListener('click', () => setNavOpen(!railEl.classList.contains('is-open')));
// 點任一導覽連結後自動收起
railEl.addEventListener('click', (e) => { if (e.target.closest('a')) setNavOpen(false); });
// Escape 關閉並還焦點
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && railEl.classList.contains('is-open')) { setNavOpen(false); navToggle?.focus(); }
});
```

### 不要用「橫向純圖示列」

把側欄在手機上壓成一排圖示、隱藏 `nav-label`，看起來省空間，但：

- 超過 4 個項目就擠成一排無法辨識的符號（有 9 個導覽項的 App 完全不可用）
- 圖示是唯一的資訊來源，違反「不得只用圖示傳達必要資訊」
- 新增功能時會直接爆版

漢堡下拉保留文字標籤，項目再多都不會壞。

### 收合狀態

≤768px 時**強制不套用** `localStorage` 的收合狀態：

```js
applySidebar(sidebarMedia.matches ? false : stored);
```

否則使用者在桌面收合過，到手機會看到一個奇怪的窄條。

---

## 3. 觸控

- 所有可點目標最小 **44×44**（`--control-height-touch`）。
  輸入框、`select`、`textarea` 的 `min-height` 就是 44px。
- `.button` 是 38px 高——它靠內距與周圍間距補足命中區。
  單獨出現在密集列表中的按鈕請用 `.icon-button`（38×38）並確保周圍有 6px 以上間距。
- 不要用 hover 當唯一的資訊揭露方式（觸控裝置沒有 hover）。
- 不要用拖曳或手勢當唯一的操作方式，一定要有按鈕替代路徑。

---

## 4. 水平捲動

表格與寬內容一律包在可捲動容器裡，**頁面本身永遠不橫向捲動**：

```css
.table-wrap {
  width: 100%; max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;   /* 避免捲到底時觸發上一頁手勢 */
  -webkit-overflow-scrolling: touch;
}
table.data { min-width: 680px; }         /* 給表格一個合理的最小寬度 */
```

多欄看板之類的水平版面在手機上改成一次一欄 + snap：

```css
.board {
  grid-template-columns: repeat(4, 100%);
  scroll-snap-type: x mandatory;
  overscroll-behavior-inline: contain;
}
.board-col { scroll-snap-align: start; }
```

`.segmented` 超寬時 `overflow-x: auto` + 子項 `flex: 0 0 auto`。

---

## 5. ≤480px 的調整

| 元件 | 調整 |
| --- | --- |
| `.brand-logo` | 44px → 38px |
| `.main` | 內距 `16px 12px 48px` |
| `.page-head h1` | 25px → 21px |
| `.page-head-actions` | 變兩欄格狀，按鈕 `width: 100%`；奇數個時最後一個跨兩欄 |
| `.dialog-backdrop` | `align-items: end`、內距 0 |
| `.dialog` | 全寬、`max-height: 100dvh`、只有上方兩角圓角（像 bottom sheet） |
| `.dialog > footer` | 兩欄格狀 |
| `.form-actions` | `flex-direction: column-reverse`（主要動作在下方拇指區） |
| `.quick-filters` | 兩欄格狀 |
| `.toast-region` | 橫跨左右邊距 |

用 `100dvh` 而不是 `100vh`：手機網址列收放會讓 `100vh` 造成置中偏移。

---

## 6. 防止版面被撐破

所有可能被長字串撐破的容器都要 `min-width: 0`。這是 flex/grid 的常見陷阱——
子元素預設 `min-width: auto`，長 URL 或連續英數字會撐爆父容器。

```css
.page, .toolbar, .card, .card-body, .card-head,
.form, .fieldset, .field, .select-wrap { min-width: 0; }
input, select, textarea { min-width: 0; max-width: 100%; }
.page-head p, .section-head p, .field-hint { overflow-wrap: anywhere; }
```

網格用 `min()` 讓它在 320px 也不會溢出：

```css
.grid--2 { grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); }
```

---

## 7. 驗收寬度

每個頁面都要在這四個寬度看過：**1440 / 1024 / 768 / 375**。

375px 的檢查重點：

- [ ] 頁面沒有橫向捲動
- [ ] 頂端 bar 高度約 59px，漢堡可開關且選單有文字
- [ ] 點導覽連結後選單自動收起
- [ ] 表格可以左右捲動，不撐破版面
- [ ] Dialog 貼底全寬，上方兩角圓角
- [ ] 動作按鈕不會擠成一列小到按不到
- [ ] 長字串（email、URL、零件編號）不會撐爆卡片
- [ ] Toast 橫跨左右邊距

---

## 8. PWA（選配）

要做成可安裝的 App（例如工廠現場用平板）時：

```html
<link rel="manifest" href="manifest.webmanifest" crossorigin="use-credentials">
<meta name="theme-color" content="#252525">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="apple-touch-icon" href="images/icons/pwa/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Service worker 的原則：

- **API 與登入一律 network-only**，絕對不要快取 `/api/*`（會快取到別人的資料或過期的權限）。
- 導覽（`index.html`）用 network-first，離線才回快取。
- **ES module 與 HTML fragment 用 network-first**：快取到舊的依賴搭配新的 importer，
  App 會在啟動前就爆掉。
- 其他靜態資源用 stale-while-revalidate。
- `manifest` 用 `crossorigin="use-credentials"`，否則 Access 保護下抓不到。
- 改了任何預快取檔案就要 bump `VERSION`，否則已安裝的使用者拿不到新版。
