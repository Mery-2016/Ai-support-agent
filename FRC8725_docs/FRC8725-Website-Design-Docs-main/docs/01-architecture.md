# 01 · 系統架構

Team 8725 App 系列的每一個 App 都是同一個形狀。照這個形狀做，你的 App 就會自動具備
共用登入、共用人員資料、一致的部署方式與一致的前端外殼。

---

## 1. 一句話說明

**一次 `wrangler deploy` 送出「靜態前端 + Cloudflare Worker」，
身分由 Cloudflare Access（GitHub）驗證，資料存在共用的 Cloudflare D1。**

```
瀏覽器
  │  對得到靜態檔案的路徑 → Cloudflare 直接回檔案（前端是純靜態，不含任何金鑰）
  │  對不到（也就是 /api/*）→ 進 Worker
  ▼
Cloudflare Access（身分提供者：GitHub）
  │  只保護 /api/v1/auth/login 這一條路徑
  │  通過後在瀏覽器留下 CF_Authorization cookie
  ▼
Cloudflare Worker（唯一可信任的權限邊界）
  ├── D1: ACCOUNTS   共用人員資料（people）
  └── D1: APP        這個 App 自己的資料表（一律加前綴）
```

---

## 2. 三個不可動的邊界

這三件事是整個系列的地基，任何 App 都不得改變：

| # | 邊界 | 意思 |
| --- | --- | --- |
| B1 | **Access 驗證身分** | 「這個人是誰」完全交給 Cloudflare Access + GitHub。App 沒有自己的密碼、註冊表單或 session 儲存。 |
| B2 | **Worker 強制授權** | 每一個 API request 都重新驗證 Access JWT，並在伺服器端檢查角色。前端隱藏按鈕**不算**授權。 |
| B3 | **people 使用 App 專屬 role 欄位** | 人員資料共用一張表、一個人只有一列；每個 App 只佔用一個 `<prefix>_role` 欄位，不共用同一個 role。 |

---

## 3. 為什麼一定要有 Worker

D1 沒有可以安全地從瀏覽器直連的方式——直連需要 Cloudflare API 權杖，
放進靜態網頁等於把整個資料庫公開。Worker 負責持有繫結、驗證登入、強制權限，
**前端仍然是純靜態檔案**。

同一次 `wrangler deploy` 會把靜態資源與 Worker 一起送上去，兩者天生同網域。
**這一點是登入能運作的前提**：登入狀態是 Access 的 `CF_Authorization` cookie，
瀏覽器只會把它送到同網域。把 API 放在別的網域會一直登不進去。

---

## 4. 專案結構

```text
<app>/
  public/                      靜態網站本體（只有這個資料夾會公開）
    index.html                 應用外殼：啟動畫面 / 錯誤畫面 / 側邊欄 + 內容區
    styles/
      fonts.css                ← 共用（design-system/assets/fonts/fonts.css）
      tokens.css               ← 共用（design-system/tokens/tokens.css）
      base.css                 ← 共用（design-system/base/base.css）
      app.css                    這個 App 的產品層，只放領域元件
    assets/
      fonts/*.ttf              ← 共用（4 個 TASA 字型檔）
      icons/icon-*.svg         ← 共用（49 個圖示）
      images/icon.ico          ← 共用（品牌 Logo）
    src/
      config.js                  API base url 等常數
      app.js                     進入點：身分載入、導覽列、路由註冊
      router.js                  hash 路由
      store.js                   全域狀態與訂閱
      db.js                      後端門面（唯一對外的 API 出入口）
      util/dom.js              ← 共用（design-system/ui/dom.js）
      ui/components.js         ← 共用（design-system/ui/components.js）
      ui/dialog.js             ← 共用（design-system/ui/dialog.js）
      ui/toast.js              ← 共用（design-system/ui/toast.js）
      pages/*.js                 各頁面
  worker/
    src/index.js               API 路由、登入回程、CORS
    src/auth.js                ← 共用範本（design-system/worker/access-auth.js）
    migrations/*.sql           資料庫結構（wrangler d1 migrations）
  wrangler.jsonc               Worker 設定：靜態資源 + API + D1 繫結
  package.json                 統一的 npm scripts（見 §7）
  .vscode/tasks.json           統一的工作名稱（見 §7）
```

標記 `← 共用` 的檔案必須與 `design-system/` 的來源**逐字元相同**。
它們是複製過去的，不是 npm 套件——所以改動時要同步每一個 App，並回寫 `design-system/`。

> 用 React（Vite）也可以，但 `tokens.css` / `base.css` / `fonts.css` / 圖示 / UI 契約
> 仍然必須是同一份。React 版的差異只在「元件用 JSX 寫」，class 名稱與視覺完全一致。

---

## 5. Cloudflare 資源

### 5.1 D1 繫結

```jsonc
"d1_databases": [
  {
    "binding": "ACCOUNTS",           // 共用人員資料（people）
    "database_name": "<shared-db>",
    "database_id": "<id>",
    "migrations_dir": "worker/migrations"
  },
  {
    "binding": "APP",                // 這個 App 自己的資料
    "database_name": "<shared-db>",
    "database_id": "<id>",
    "migrations_dir": "worker/migrations"
  }
]
```

兩個繫結目前指向**同一個** D1 資料庫。分成兩個名字是為了讓程式碼表達意圖：
`env.ACCOUNTS` 只碰 `people`，`env.APP` 只碰自己的表。
日後真要把人員資料獨立出去時，只要建一個新資料庫、改 `ACCOUNTS` 的 `database_id`，
程式碼一行都不用動。

**代價**：跨兩個繫結的寫入不是原子的。設計資料模型時避免「一個動作必須同時改兩邊」。

### 5.2 靜態資源

```jsonc
"assets": {
  "directory": "./public",
  "binding": "ASSETS",
  "run_worker_first": ["/api/*"]     // SPA 時再加 not_found_handling
}
```

### 5.3 必要環境變數

```text
APP_ID                 例如 frc8725-example
APP_NAME               顯示名稱
ACCESS_TEAM_DOMAIN     Cloudflare Zero Trust team domain
ACCESS_AUD             Access Application Audience（AUD Tag）
SITE_URL               登入完成後允許導回的網站
ALLOWED_ORIGINS        選填；跨來源前端白名單
ALLOWED_EMAIL_DOMAINS  選填；可建立人員資料的 email 網域
```

機密（API key 等）用 `wrangler secret put`，本機開發放 `.dev.vars`，**不要進版控**。

### 5.4 Cloudflare Access 設定

1. Zero Trust → Settings → Authentication → Login methods → 加入 GitHub。
2. Access → Applications → Add an application → **Self-hosted**。
3. Application domain 填網站網域，**Path 只填 `api/v1/auth/login`**。
4. Identity providers 只勾 GitHub。
5. Policy 用 `Emails ending in @…` 之類的規則。
6. 回到 Overview 複製 **Application Audience (AUD) Tag** 填入 `ACCESS_AUD`。

只保護 `api/v1/auth/login` 一條路徑就夠：其他 API 由 Worker 自己驗證 cookie 裡的 JWT，
這樣沒登入時會回乾淨的 401 JSON，而不是一個 fetch 讀不懂的登入頁轉址。

> **重要**：系統內**沒有第二層核准**。能通過這個 Access Policy 的人就能使用 App，
> role 只決定他在裡面能做什麼。所以 Policy 要設得夠嚴謹，不要用 `Everyone`。

---

## 6. 資料表命名

| 範圍 | 規則 | 例 |
| --- | --- | --- |
| 共用人員 | 固定叫 `people`，不加前綴 | `people` |
| App 自己的表 | **一律加不可變更的 App 前綴** | `tasks_tasks`、`parts_work_orders`、`storage_items` |
| App 的 role 欄位 | `<prefix>_role`，放在 `people` | `tasks_role`、`parts_role` |
| migration 檔名 | **全域唯一**，帶 App 前綴 | `0004_tasks_people.sql` |

前綴選定後就不能改（會牽動所有 SQL 與既有資料）。選一個短、明確、不會跟別的 App 撞的字。

---

## 7. 統一的指令

四個 App 的 npm script 與 VS Code 工作名稱是保留字，新 App 照抄：

| npm script | 用途 |
| --- | --- |
| `dev` | 本機開發（含免登入 bypass） |
| `build` | 建置（只有需要打包的 App 才有） |
| `deploy` | 部署到 Cloudflare |
| `test` | 單元／煙霧測試 |
| `db:migrate:local` | 套用 migration 到本機 D1 |
| `db:migrate` | 套用 migration 到正式 D1 |
| `db:migrate:list` | 列出 migration 狀態（選配） |
| `db:seed:local` | 灌入本機測試資料（選配） |
| `tail` | `wrangler tail`（選配） |

`.vscode/tasks.json` 的 label：

```text
本機開發（build 群組，isDefault）
建置
部署
測試（test 群組，isDefault）
資料庫：套用 Migration（本機）
資料庫：套用 Migration（正式）
Wrangler 登入
```

有該功能就必須用這個名字，沒有就不要建立同義別名。

---

## 8. 本機開發

Worker 支援 `LOCAL_AUTH_BYPASS=1`：跳過 Access，直接以固定的本機管理員身分登入。

```bash
npm install
npm run db:migrate:local
npm run dev            # 預設 http://localhost:8787
```

`dev` script 用 `wrangler dev --var LOCAL_AUTH_BYPASS:1` 注入，
**只存在於這個指令**，正式部署不會有。

直接執行 `wrangler dev`（沒有 `--var`）則不會略過登入，可用來驗證真實的 Access 流程。

---

## 9. 部署

```bash
npm run db:migrate     # 資料表有變動時才需要
npm run deploy
```

第一次部署後，把實際網址填回 `wrangler.jsonc` 的 `SITE_URL` 與 `ALLOWED_ORIGINS`，
以及 Zero Trust 的 Access 應用程式網域，再 deploy 一次。

---

## 10. 相關文件

| 主題 | 文件 |
| --- | --- |
| 人員資料表、角色、D1 慣例與地雷 | [`02-database.md`](02-database.md) |
| API 契約與錯誤碼 | [`03-api-contract.md`](03-api-contract.md) |
| 前端外殼、路由、狀態管理 | [`04-frontend.md`](04-frontend.md) |
| 元件 class 語彙 | [`05-components.md`](05-components.md) |
| 互動與狀態呈現契約 | [`06-interaction.md`](06-interaction.md) |
| 手機與響應式 | [`07-mobile.md`](07-mobile.md) |
| 從零開始建 App 的步驟 | [`08-new-app.md`](08-new-app.md) |
