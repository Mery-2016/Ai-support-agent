# 03 · API 契約

四個 App 使用同一組端點名稱與同一套錯誤碼。照這份契約做，前端的 `db.js`、
錯誤訊息中文化、自動重新登入這些都可以直接複製。

---

## 1. 端點

全部掛在 `/api/v1/` 之下。除了 `auth/login` 與 `health`，其餘都是 `POST`。

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| `GET` | `/api/v1/auth/login` | **由 Access 保護。** 完成登入、在 `people` 建立人員資料，再安全導回網站 |
| `POST` | `/api/v1/auth/session` | 驗證 Access Session，回傳身分與這個 App 的 role。沒有工作階段時回 401 |
| `POST` | `/api/v1/read` | 讀取資料，Worker 強制套用權限 |
| `POST` | `/api/v1/write` | 寫入資料，Worker 強制套用權限 |
| `GET` | `/api/v1/health` | 健康檢查 |

**沒有 `/auth/logout`。** 登入由 Access 管理，App 不提供登出。

資源導向的 REST 風格（`GET /api/v1/items`、`PATCH /api/v1/members/:id`…）也可以，
但 `auth/login` 與 `auth/session` 這兩條的路徑與行為必須一致，
否則前端的自動登入邏輯無法共用。

前端請求一律 `credentials: 'include'`，否則 `CF_Authorization` cookie 不會送出。

---

## 2. `auth/login`

這是唯一被 Access 保護的路徑。它的工作只有三件：

```js
async function handleLogin(request, env, url) {
  const target = safeRedirect(env, url.searchParams.get('redirect'), url);
  try {
    await authenticate(env, request);        // 驗 JWT + 建立 people 資料
  } catch (error) {
    const mapped = normalizeError(error);
    if (mapped.status === 401) {
      // Access 沒有保護這個路徑時會走到這裡：直接說清楚怎麼修，
      // 不要讓使用者卡在白畫面。
      return new Response(
        '這個路徑必須由 Cloudflare Access 保護。\n'
        + '請在 Zero Trust → Access → Applications 建立一個 Self-hosted 應用程式，\n'
        + `路徑指向 ${url.origin}${url.pathname}，身分提供者選 GitHub。`,
        { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
      );
    }
    return Response.redirect(`${target}${target.includes('?') ? '&' : '?'}login_error=${mapped.code}`, 302);
  }
  return Response.redirect(target, 302);
}
```

`redirect` 參數**必須**經過同源或白名單驗證（`safeRedirect`），否則會變成開放轉址。

失敗時把錯誤碼放在 `?login_error=`，前端用它顯示錯誤畫面並停止自動重試。

---

## 3. `auth/session`

```jsonc
// 200
{ "user": { "id": "…", "email": "…", "name": "…" }, "role": "member", "isAdmin": false }

// 401（沒有 Access 工作階段）
{ "error": { "code": "auth/signed-out", "message": "尚未登入" } }
```

前端收到 401 就自動導向 `auth/login`（見 [`04-frontend.md`](04-frontend.md) §4）。

---

## 4. `read` / `write`（批次形狀）

任務系統採用這個形狀：前端沿用 Firestore 的集合／文件語彙，
Worker 把它翻譯成 SQL。好處是同一個 tick 的多個訂閱可以合併成**一次** HTTP 往返。

### 4.1 `POST /api/v1/read`

```jsonc
// 請求
{
  "reads": [
    { "kind": "doc",  "path": "people", "id": "abc" },
    { "kind": "list", "path": "items",  "constraints": [
        { "type": "where",   "field": "status", "op": "==", "value": "open" },
        { "type": "orderBy", "field": "createdAt", "direction": "desc" },
        { "type": "limit",   "count": 50 }
    ] }
  ]
}

// 回應（順序與請求相同）
{
  "results": [
    { "doc": { "id": "abc", "data": { "name": "…" } } },
    { "docs": [ { "id": "i1", "data": { … } } ] }
  ]
}
```

- 一次最多 20 筆讀取。
- `op` 支援 `== != >= <= > <`、`in`、`array-contains`。
- 沒指定 `limit` 也要有上限（建議 2000），避免單一請求把整張表撈出來。
- **單筆讀取失敗不會讓整個請求失敗**：那一筆回 `{ "error": { code, message } }`，
  其餘照常回傳。

### 4.2 `POST /api/v1/write`

```jsonc
// 請求
{
  "ops": [
    { "op": "set",    "path": "items", "id": "i1", "data": { … } },
    { "op": "update", "path": "items", "id": "i2", "data": { "status": "done" } },
    { "op": "delete", "path": "items", "id": "i3" }
  ]
}

// 回應
{ "ok": true, "applied": 3 }
```

- 一次最多 500 筆。
- `set` 只能新增（主鍵重複會失敗），`update` 只改指定欄位。
- 同一個繫結內的多筆用 `db.batch()` 送出，是單一交易。
- **每一筆都要重新檢查權限**，不能只檢查第一筆。

### 4.3 欄位對照與型別

前端欄位名（camelCase）與資料表欄位（snake_case）的對照集中在一張表，
**不要把前端傳來的字串直接拼進 SQL**：

```js
const F = (column, type = 'text', extra = {}) => ({ column, type, ...extra });

export const COLLECTIONS = {
  items: {
    db: 'APP',
    table: 'example_items',
    fields: {
      name:      F('name'),
      status:    F('status'),
      tags:      F('tags', 'json', { default: [] }),
      createdAt: F('created_at', 'ts'),
    },
  },
};
```

型別：`text` / `int` / `bool` / `json` / `ts`（毫秒時間戳）。
未知欄位一律拒絕（回 `invalid-argument`），值一律用參數繫結。

### 4.4 `serverTimestamp`

前端送 `{ "__op": "serverTimestamp" }`，Worker 換成當下的 `Date.now()`。
**時間永遠由伺服器決定**，不信任瀏覽器時鐘。

回傳時把毫秒整數包成 `{ "__ts": 1785700000000 }`，前端再還原成有 `toDate()` 的物件。

---

## 5. 錯誤格式

所有錯誤統一這個形狀：

```jsonc
{ "error": { "code": "permission-denied", "message": "需要管理員權限" } }
```

| code | HTTP | 意思 |
| --- | ---: | --- |
| `auth/signed-out` | 401 | 尚未登入，或登入已失效 |
| `auth/session-expired` | 401 | JWT 過期／簽章不符／不是發給這個 App |
| `auth/configuration-not-found` | 500 | Worker 缺 `ACCESS_TEAM_DOMAIN` 或 `ACCESS_AUD` |
| `auth/user-disabled` | 403 | email 不在 `ALLOWED_EMAIL_DOMAINS` 內 |
| `permission-denied` | 403 | 通過身分驗證但沒有這項操作的權限 |
| `not-found` | 404 | 找不到資料或未知路徑 |
| `invalid-argument` | 400 | 欄位、型別或參數不正確 |
| `failed-precondition` | 409 | 唯一鍵衝突、資料已被別人改過 |
| `unavailable` | 503 | 下游（Access 公鑰、外部 API）暫時不可用 |
| `internal` | 500 | 其他 |

### 5.1 不要把資料庫錯誤直接丟給使用者

D1 的原始錯誤訊息不適合給人看，在 Worker 收斂成上表的代碼：

```js
function normalizeError(error) {
  if (error instanceof ApiError) return { code: error.code, message: error.message, status: error.status };
  const message = String(error?.message || '');
  if (/UNIQUE constraint failed/i.test(message)) {
    return { code: 'failed-precondition', message: '這筆資料已經存在，請重新整理頁面後再試一次', status: 409 };
  }
  if (/no such table/i.test(message)) {
    return { code: 'failed-precondition', message: '資料庫尚未建立資料表，請先套用 worker/migrations 的 SQL', status: 500 };
  }
  return { code: 'internal', message: '伺服器發生錯誤', status: 500 };
}
```

`status >= 500` 時要 `console.error(error)` 留下原始錯誤供 `wrangler tail` 查看。

### 5.2 前端的訊息中文化

前端有一張 code → 使用者訊息的表，格式是「發生什麼事 + 影響 + 如何修正」：

```js
const MESSAGES = {
  'auth/signed-out': '尚未登入，或登入已失效。系統會自動重新登入；若停在這個畫面請重新整理。',
  'permission-denied': '你沒有執行這項操作的權限。若認為這是錯誤，請聯絡管理員。',
  'failed-precondition': '伺服器拒絕了這次操作，資料可能已被其他人變更。請重新整理頁面後再試一次。',
  // …
};
```

---

## 6. CORS

網站與 API 同網域時其實不需要 CORS，但要處理 `OPTIONS` 並允許 credentials。
**允許 credentials 時不能用 `*`**，必須回應明確的 origin：

```js
function corsHeaders(env, origin, url) {
  const allowed = allowedOrigins(env);
  const value = isAllowedOrigin(env, origin, url) ? (origin || url.origin) : (allowed[0] || url.origin);
  return {
    'access-control-allow-origin': value,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}
```

同源請求一律放行；`ALLOWED_ORIGINS` 只是給「網站另外掛在別的網域」的情況用的。

---

## 7. 路由前綴要能容忍子路徑

Worker 可能掛在 `example.com/api/*`，所以路由只看 `/v1/` 之後的部分：

```js
function apiPath(pathname) {
  const index = pathname.indexOf('/v1/');
  return index === -1 ? pathname.replace(/\/+$/, '') : pathname.slice(index).replace(/\/+$/, '');
}
```

---

## 8. 快取

API 回應一律 `cache-control: no-store`。
靜態資源交給 Cloudflare 的預設行為，不要自己加 `cache-control`。
