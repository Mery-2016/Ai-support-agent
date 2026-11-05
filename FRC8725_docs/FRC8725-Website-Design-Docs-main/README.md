# Team 8725 Web App Design Docs

Team 8725 所有網站與 Web App 的**單一真相來源**。這個 repo 的目標是：
**只讀這裡就能做出一個與現有 App 同系列的新 App** —— 設計、架構、GUI、互動、
手機介面、資料庫邏輯與常用素材都在裡面。

現有的四個 App 都遵循這份規範：任務管理（MistTasks）、零件加工（MistParts）、
偵察分析（MistScout）、培訓室管理（MistStorage）。

---

## 我想…

| 目的 | 從這裡開始 |
| --- | --- |
| **建一個新 App** | [`docs/08-new-app.md`](docs/08-new-app.md) — 從零到可部署的逐步流程 |
| 看元件實際長什麼樣 | [`design-system/starter/`](design-system/starter/) — 用瀏覽器打開 `index.html` |
| 知道有哪些 class 可以用 | [`docs/05-components.md`](docs/05-components.md) |
| 理解為什麼這樣設計 | [`design-system-guide.md`](design-system-guide.md) — 設計方法論 |
| 接上共用登入與人員資料 | [`docs/02-database.md`](docs/02-database.md) |
| 實作 Worker API | [`docs/03-api-contract.md`](docs/03-api-contract.md) |
| 處理手機版 | [`docs/07-mobile.md`](docs/07-mobile.md) |
| 交付前檢查 | [`design-system/interaction-checklist.md`](design-system/interaction-checklist.md) |
| 讓 AI 照規範做事 | [`SKILL.md`](SKILL.md) |

---

## 規範文件

| 文件 | 內容 |
| --- | --- |
| [`design-system-guide.md`](design-system-guide.md) | **設計方法論**（唯一正式設計規範）：設計流程、資訊架構、版面、色彩、字體、圖示、元件原則、狀態、內容、無障礙、治理 |
| [`docs/01-architecture.md`](docs/01-architecture.md) | 系統架構：Cloudflare Worker + D1 + Access、專案結構、環境變數、統一指令 |
| [`docs/02-database.md`](docs/02-database.md) | 資料庫與權限模型：`people` 表、角色、登入流程、D1 慣例與地雷、安全檢查清單 |
| [`docs/03-api-contract.md`](docs/03-api-contract.md) | API 契約：端點、`read`/`write` 形狀、錯誤碼、CORS |
| [`docs/04-frontend.md`](docs/04-frontend.md) | 前端架構：樣式分層、HTML 外殼、模組職責、自動登入、導覽、全域狀態 |
| [`docs/05-components.md`](docs/05-components.md) | 元件參考：`base.css` 全部 class 與常見錯誤 |
| [`docs/06-interaction.md`](docs/06-interaction.md) | 互動契約：JS 模組 API、狀態呈現規則、鍵盤、動效 |
| [`docs/07-mobile.md`](docs/07-mobile.md) | 手機與響應式：斷點、行動導覽、觸控、PWA |
| [`docs/08-new-app.md`](docs/08-new-app.md) | 建立新 App 的逐步流程與完工檢查 |
| [`design-system/interaction-checklist.md`](design-system/interaction-checklist.md) | 設計與開發驗收清單 |

## 可直接使用的素材

以下檔案是 **canonical**：每個 App 各放一份副本，且必須與這裡**逐字元相同**。

| 路徑 | 內容 |
| --- | --- |
| [`design-system/tokens/tokens.css`](design-system/tokens/tokens.css) | 設計 token（色、字、間距、圓角、動效）。**不要修改** |
| [`design-system/base/base.css`](design-system/base/base.css) | 共用元件層，14 個區段。外殼、按鈕、表單、徽章、表格、dialog、toast、響應式 |
| [`design-system/assets/fonts/`](design-system/assets/fonts/) | TASA Explorer / Orbiter 字型檔 + `fonts.css` |
| [`design-system/assets/icons/`](design-system/assets/icons/) | 49 個線性圖示（`icon-*.svg`，24×24、`stroke-width 1.75`） |
| [`design-system/assets/images/icon.ico`](design-system/assets/images/) | 品牌 Logo |
| [`design-system/ui/`](design-system/ui/) | 互動模組：`dom.js`（含 `icon`、`setLoading`、表單工具）、`components.js`、`dialog.js`、`toast.js` |
| [`design-system/worker/access-auth.js`](design-system/worker/access-auth.js) | Cloudflare Access 驗證 + `people` upsert 範本。改三個常數就能用 |
| [`design-system/worker/migrations/0001_people.sql`](design-system/worker/migrations/0001_people.sql) | `people` 表建表 SQL |
| [`design-system/tokens/colors.json`](design-system/tokens/colors.json) · [`typography.json`](design-system/tokens/typography.json) | 給設計工具用的 token 匯出 |
| [`design-system/starter/`](design-system/starter/) | 可直接開啟的元件展示頁，同時是新 App 的外殼範本 |

## 參考圖

[`design-system/assets/images/`](design-system/assets/images/) 有三張說明圖：
`color-palette.svg`（色票）、`navigation-anatomy.svg`（導覽結構）、
`responsive-layout.svg`（響應式版面）。

---

## 三個不可動的邊界

任何 App 都不得改變這三件事（詳見 [`docs/01-architecture.md`](docs/01-architecture.md) §2）：

1. **Access 驗證身分** —— 身分完全交給 Cloudflare Access + GitHub，App 沒有自己的密碼或註冊表單。
2. **Worker 強制授權** —— 每個 request 都重新驗證 JWT 並在伺服器端檢查角色。前端隱藏按鈕不算授權。
3. **`people` 使用 App 專屬 role 欄位** —— 一個人只有一列，每個 App 只佔用一個 `<prefix>_role`。

## 三個最容易忘記的規則

1. **沒有登入頁、沒有等待核准頁、沒有登出按鈕。** 打開網址就會自動完成登入。
2. **色碼只能出現在 `tokens.css` 與 `base.css` 的衍生 token 區段。** 產品層一律 `var()`。
3. **共用檔案要五份一起改。** 改了 `base.css` 就要同步四個 App 並回寫這裡。

---

## 維護

### 什麼算共用

判斷標準：**「另一個 App 有沒有可能用到？」**

- 有 → 提案加進 `design-system/`，同步到每一個 App。
- 沒有 → 留在該 App 的 `app.css` 或產品層模組。

不要把一個 App 的導覽結構、資料模型或工作流程變成全系列規則。

### 改動流程

1. 改 `design-system/` 的 canonical 檔案。
2. 複製到**每一個** App 的對應位置。
3. `diff` 驗證每一份都相同。
4. 在每個 App 的 1440 / 1024 / 768 / 375 四個寬度確認沒有回歸。
5. 更新對應的 `docs/`。

**不要**只改自己的 App 然後想「以後再同步」——那是走鐘的起點。

### 一致性驗證

```bash
DS=<path-to>/FRC8725-Website-Design-Docs/design-system
for app in <app1> <app2> <app3> <app4>; do
  diff $app/public/styles/tokens.css $DS/tokens/tokens.css
  diff $app/public/styles/base.css   $DS/base/base.css
  diff -r $app/public/assets/icons   $DS/assets/icons
done
```

產品專屬文件只能補充領域流程，不得覆寫主規範。
新增或修改介面後，必須完成 `interaction-checklist.md` 中相關項目。
