# 08 · 建立一個新 App

從零到可部署。照著做出來的 App 會自動跟現有的四個長得一樣、共用同一份人員資料。

---

## 0. 先決定三件事

| 項目 | 規則 | 例 |
| --- | --- | --- |
| **SQL 前綴** | 短、小寫、不會撞名。**選定後不可變更** | `inventory` |
| **角色清單** | 至少要有 `member` 與 `admin` | `admin` / `keeper` / `member` |
| **品牌 wordmark** | `MIST` + 產品名，加一行英文副標 | `MISTSTOCK` / `Inventory · Tracking` |

前綴會出現在：`people.<prefix>_role`、所有資料表名（`<prefix>_items`）、
migration 檔名（`0001_<prefix>_people.sql`）。改起來要動全部 SQL 與既有資料，所以想清楚。

---

## 1. 建立專案骨架

```bash
mkdir frc8725-<name> && cd frc8725-<name>
npm init -y
npm install --save-dev wrangler
mkdir -p public/{styles,assets/{fonts,icons,images},src/{ui,util,pages}} worker/{src,migrations} .vscode
```

## 2. 複製共用素材

從這個 repo 複製，**不要修改內容**：

```bash
DS=<path-to>/FRC8725-Website-Design-Docs/design-system

cp $DS/tokens/tokens.css           public/styles/tokens.css
cp $DS/base/base.css               public/styles/base.css
cp $DS/assets/fonts/fonts.css      public/styles/fonts.css
cp $DS/assets/fonts/*.ttf          public/assets/fonts/
cp $DS/assets/icons/icon-*.svg     public/assets/icons/
cp $DS/assets/images/icon.ico      public/assets/images/

cp $DS/ui/dom.js                   public/src/util/dom.js
cp $DS/ui/components.js            public/src/ui/components.js
cp $DS/ui/dialog.js                public/src/ui/dialog.js
cp $DS/ui/toast.js                 public/src/ui/toast.js

cp $DS/worker/access-auth.js        worker/src/auth.js
cp $DS/worker/migrations/0001_people.sql \
                                   worker/migrations/0001_<prefix>_people.sql
```

`components.js`、`dialog.js`、`toast.js` 的 import 路徑要從 `./dom.js` 改成 `../util/dom.js`
（或把 `dom.js` 也放進 `src/ui/`，兩種都行，但四個檔案要一致）。

建立空的產品層：

```css
/* public/styles/app.css */
/* =============================================================
   <產品名>｜產品樣式層
   - 共用 token 來自 styles/tokens.css
   - 共用元件來自 styles/base.css（不得在此覆寫）
   - 本檔只放這個 App 專屬的領域元件，且一律 var()，不得出現色碼
   ============================================================= */
```

## 3. 改三個地方

### 3.1 `worker/src/auth.js` 最上面

```js
const ROLE_COLUMN = 'inventory_role';       // ← 你的前綴
export const ROLES = ['admin', 'keeper', 'member'];
const DEFAULT_ROLE = 'member';
```

### 3.2 `worker/migrations/0001_<prefix>_people.sql`

在 `CREATE TABLE people` 加一行：

```sql
inventory_role TEXT NOT NULL DEFAULT 'member',
```

**然後把改好的完整定義同步回其他每一個 App 的同名 migration。**
每個 App 都帶著同一份完整定義（`CREATE TABLE IF NOT EXISTS`），誰先跑誰建立。

刪掉檔案下半段「從舊的 users 表搬移」那一整段註解（新 App 不需要）。

### 3.3 `public/index.html`

複製 [`04-frontend.md`](04-frontend.md) §2 的外殼，改：

- `<title>`
- `.boot-title` → `Team 8725 <產品名>`
- `.brand-copy` 的 wordmark 與副標

## 4. `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "frc8725-<name>",
  "main": "worker/src/index.js",
  "compatibility_date": "2025-01-01",

  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },

  "d1_databases": [
    { "binding": "ACCOUNTS", "database_name": "<shared-db>", "database_id": "<id>",
      "migrations_dir": "worker/migrations" },
    { "binding": "APP",      "database_name": "<shared-db>", "database_id": "<id>",
      "migrations_dir": "worker/migrations" }
  ],

  "vars": {
    "APP_ID": "frc8725-<name>",
    "APP_NAME": "Team 8725 <產品名>",
    "ACCESS_TEAM_DOMAIN": "<team>.cloudflareaccess.com",
    "ACCESS_AUD": "<填 Access 的 AUD Tag>",
    "SITE_URL": "",
    "ALLOWED_ORIGINS": "",
    "ALLOWED_EMAIL_DOMAINS": ""
  },

  "observability": { "enabled": true, "head_sampling_rate": 1 }
}
```

`database_name` / `database_id` 用團隊現有的共用 D1（跟其他四個 App 同一個）。

## 5. `package.json` scripts

```jsonc
"scripts": {
  "dev": "wrangler dev --var LOCAL_AUTH_BYPASS:1",
  "deploy": "wrangler deploy",
  "test": "node --test test/",
  "db:migrate": "wrangler d1 migrations apply <shared-db> --remote",
  "db:migrate:local": "wrangler d1 migrations apply <shared-db> --local",
  "db:migrate:list": "wrangler d1 migrations list <shared-db> --remote",
  "tail": "wrangler tail"
}
```

## 6. `.vscode/tasks.json`

七個保留 label，見 [`01-architecture.md`](01-architecture.md) §7。
沒有的功能就不要建立同義別名。

## 7. Worker 進入點

```js
// worker/src/index.js
import { ApiError, authenticate, requireAdmin, safeRedirect } from './auth.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    const cors = corsHeaders(env, request.headers.get('origin') || '', url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const path = apiPath(url.pathname);

    // 登入回程：瀏覽器導向過來的，不是 API 呼叫
    if (path === '/v1/auth/login') return handleLogin(request, env, url);
    if (path === '/v1/health') return json({ ok: true }, 200, cors);

    try {
      const ctx = await authenticate(env, request);
      const body = await readJson(request);

      switch (path) {
        case '/v1/auth/session':
          return json({ user: ctx.user, role: ctx.role, isAdmin: ctx.isAdmin }, 200, cors);
        case '/v1/read':
          return json({ results: await handleRead(env, ctx, body.reads) }, 200, cors);
        case '/v1/write':
          return json(await handleWrite(env, ctx, body.ops), 200, cors);
        default:
          throw new ApiError('not-found', `未知的路徑：${path}`, 404);
      }
    } catch (error) {
      const mapped = normalizeError(error);
      if (mapped.status >= 500) console.error('[worker]', error);
      return json({ error: { code: mapped.code, message: mapped.message } }, mapped.status, cors);
    }
  },
};
```

`handleRead` / `handleWrite` / `normalizeError` / `corsHeaders` / `apiPath` 的規格見
[`03-api-contract.md`](03-api-contract.md)。

## 8. 前端進入點

```js
// public/src/app.js
import { qs } from './util/dom.js';

const bootView = qs('#boot-view');
const authView = qs('#auth-view');
const shellEl  = qs('#app-shell');

function showOnly(view) {
  bootView.hidden = view !== 'boot';
  authView.hidden = view !== 'auth';
  shellEl.hidden  = view !== 'app';
}
```

啟動流程、自動登入與防迴圈見 [`04-frontend.md`](04-frontend.md) §4。

## 9. Cloudflare Access

1. Zero Trust → Access → Applications → Add an application → **Self-hosted**。
2. Application domain 填新 App 的網域，**Path 填 `api/v1/auth/login`**。
3. Identity providers 只勾 GitHub。
4. Policy 用 `Emails ending in @…` 之類的規則——
   **系統內沒有第二層核准，這是唯一的入口控管**。
5. Overview → 複製 **AUD Tag** → 填進 `wrangler.jsonc` 的 `ACCESS_AUD`。

## 10. 跑起來

```bash
npm run db:migrate:local
npm run dev            # http://localhost:8787，自動以本機管理員身分登入
```

## 11. 部署

```bash
npm run db:migrate
npm run deploy
```

部署後把實際網址填回 `SITE_URL` / `ALLOWED_ORIGINS` 與 Access 應用程式網域，再 deploy 一次。

**第一位登入的人會自動成為管理員**，之後的人角色預設 `member`。

---

## 12. 完工檢查

### 共用層沒有走鐘

```bash
DS=<path-to>/FRC8725-Website-Design-Docs/design-system
diff public/styles/tokens.css $DS/tokens/tokens.css
diff public/styles/base.css   $DS/base/base.css
diff public/styles/fonts.css  $DS/assets/fonts/fonts.css
diff -r public/assets/icons   $DS/assets/icons
#   全部應該無差異
```

### 產品層乾淨

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(" public/styles/app.css
#   應無輸出（color-mix 內用 var() 是可以的）
```

### 沒有自創同義 class

```bash
grep -rn "\.btn\b\|\.panel\b\|\.modal\b\|state-block\|sr-only\|input-field\|field-input" public/
#   應無輸出
```

### 其餘

- [ ] `docs/05-components.md` §11 的常見錯誤逐項確認
- [ ] `docs/06-interaction.md` §5 的狀態呈現表逐項確認
- [ ] `docs/07-mobile.md` §7 的四個寬度逐項確認
- [ ] `design-system/interaction-checklist.md` 全部走過
- [ ] `docs/02-database.md` §7 安全檢查清單全部走過
- [ ] 導覽的「首頁 / 成員管理 / 操作紀錄 / 系統設定」用的是保留字與指定圖示
- [ ] 沒有登入頁、沒有等待核准頁、沒有登出按鈕
- [ ] migration 檔名帶了 App 前綴（全域唯一）
- [ ] `people` 的新 role 欄位已同步回其他每一個 App 的 migration

---

## 13. 需要改共用層時

「這個元件另一個 App 也會用到」才算共用。流程：

1. 改 `design-system/base/base.css`（或 `ui/`、`tokens/`、`assets/`）。
2. 複製到**每一個** App 的對應位置。
3. `diff` 驗證每一份都相同。
4. 在每個 App 的目標寬度看一次，確認沒有回歸。
5. 更新 `docs/05-components.md` 的清單。

**不要**只改自己的 App 然後想「以後再同步」——那是四個 App 走鐘的起點。
如果只有你的 App 需要，放 `app.css`。
