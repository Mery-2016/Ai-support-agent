# 02 · 資料庫與權限模型

---

## 1. 核心原則

1. GitHub 只負責驗證「這個人是誰」。
2. Cloudflare Access 負責登入 Session 與 JWT 簽發。
3. Worker 是唯一可信任的權限邊界；前端隱藏按鈕不等於授權。
4. `people` 是所有 App 共用的人員資料表，**同一個人只有一列**。
5. 每個 App 只在 `people` 佔用一個 `<prefix>_role` 欄位，不共用同一個 role。
6. **沒有核准流程**：登入時資料庫沒有這個人就直接建立，`<prefix>_role` 預設 `member`。
7. 每個 App 至少要有 `member` 與 `admin` 兩個角色；其他角色由各 App 自行定義。
8. 不儲存申請時間、審核時間或審核人員。
9. **不刪除 `people` 的資料**——其他 App 也還需要這個人的身分。
   要收回權限就把 `<prefix>_role` 調回 `member`。

---

## 2. `people` 表

```sql
CREATE TABLE IF NOT EXISTS people (
  id            TEXT PRIMARY KEY,   -- Cloudflare Access JWT 的 sub
  email         TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',

  -- 每個 App 一個 role 欄位，預設一律 member
  tasks_role    TEXT NOT NULL DEFAULT 'member',
  parts_role    TEXT NOT NULL DEFAULT 'member',
  analysis_role TEXT NOT NULL DEFAULT 'member',
  storage_role  TEXT NOT NULL DEFAULT 'member',

  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people (email);
```

可直接使用的版本：[`../design-system/worker/migrations/0001_people.sql`](../design-system/worker/migrations/0001_people.sql)

`people` 只放「共用身分 + 每個 App 的 role」。
**任何 App 專屬的關聯資料都不要放進來**，放在該 App 自己的資料表（見 §5）。

### 為什麼沒有 email 唯一索引

同一個人的 email 由 Access 提供，理論上不會重複；但如果加了唯一索引，
一旦出現 email 衝突就會讓「登入」這個動作整個失敗。改成普通索引，
寧可有一筆髒資料也不要讓人進不來。

### 現有 App 的角色

| App | 前綴 | 角色 |
| --- | --- | --- |
| 任務管理 | `tasks` | `admin` / `leader` / `member` |
| 零件加工 | `parts` | `admin` / `operator` / `member` |
| 偵察分析 | `analysis` | `admin` / `officer` / `member` / `viewer` |
| 培訓室管理 | `storage` | `admin` / `member` |

---

## 3. 登入流程

```text
使用者開啟 App
        ↓
前端向 Worker 詢問工作階段（POST /api/v1/auth/session）
        ↓
沒有工作階段 → 自動導向 /api/v1/auth/login（此路徑由 Access 保護）
        ↓
Cloudflare Access 導向 GitHub → 完成驗證 → 建立登入 Session
        ↓
瀏覽器帶 CF_Authorization cookie 回到 Worker
        ↓
Worker 驗證 Access JWT，查詢 D1 people
        ↓
資料庫沒有這個人 → 直接建立，<prefix>_role 預設 member
        ↓
（若這個 App 還沒有任何管理員，第一位登入者自動成為 admin）
        ↓
導回網站，馬上可以使用
```

**沒有「等待授權」狀態。** 前端只有三種畫面：載入中、App 主畫面、錯誤。

### 3.1 Access JWT 必須驗證

Worker **不可以只解碼 JWT**。至少必須驗證：

- 簽章為 Access 公鑰簽發的 RS256
- `iss` 等於指定的 Zero Trust team domain
- `aud` 包含目前 Access Application Audience
- `exp` 尚未過期
- `sub` 存在，並作為 `people.id`

Token 從 `cf-access-jwt-assertion` header 或 `CF_Authorization` cookie 取得。
可直接使用的實作：[`../design-system/worker/access-auth.js`](../design-system/worker/access-auth.js)

### 3.2 建立或更新人員資料

```sql
INSERT INTO people (id, email, name, created_at, updated_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  email = excluded.email,
  name = CASE
    WHEN people.name IS NULL OR people.name = '' THEN excluded.name
    ELSE people.name
  END,
  updated_at = excluded.updated_at;
```

INSERT **不指定任何 `<prefix>_role`**；`NOT NULL DEFAULT 'member'` 會讓這個人
在所有 App 都直接是一般成員。

`name` 用 `CASE` 而不是直接覆寫：使用者或管理員可能已經改過顯示名稱，
不該每次登入就被 Access 的原始值蓋掉。

### 3.3 第一位管理員

每個 App 都要避免「沒有任何人能調整角色」的死鎖。用一個**冪等的條件更新**，
不需要 `app_bootstrap` 之類的額外資料表：

```sql
UPDATE people
SET tasks_role = 'admin', updated_at = ?
WHERE id = ?
  AND NOT EXISTS (SELECT 1 FROM people WHERE tasks_role = 'admin');
```

即使這個人已由另一個 App 建立，第一次進入尚未有管理員的 App 時仍會執行這個檢查。

---

## 4. 權限強制

### 4.1 每個 API 的入口

```js
async function requireAppAccess(env, request) {
  const identity = await verifyAccessJwtFromRequest(env, request);
  await ensurePerson(env, identity);           // 沒有就建立，預設 member
  const person = await loadPerson(env, identity.sub);
  if (!person) throw new ApiError('auth/signed-out', '找不到登入帳號', 401);
  return buildContext(person);
}
```

通過 Access 就能讀寫這個 App 的一般資料；**管理性操作仍必須另外檢查 role**：

```js
function requireAdmin(ctx) {
  if (!ctx.isAdmin) throw new ApiError('permission-denied', '需要管理員權限', 403);
}
```

### 4.2 修改角色

```sql
UPDATE people SET tasks_role = ?, updated_at = ? WHERE id = ?;
```

Worker 必須重新驗證：

- 操作者是這個 App 的 admin
- 目標 role 在這個 App 的允許清單內
- 目標對象存在
- **操作者不能改自己的 role**（否則會失去最後一位管理員）

### 4.3 絕對禁止

- `DELETE FROM people`
- 在 `people` 加 `<app>_auth` 之類的核准欄位
- 信任前端送來的 user id
- 讓瀏覽器直接連 D1

---

## 5. App 專屬關聯不要放進 people

以任務系統為例：組別成員原本同時存在 `users.tasks_team_ids` 與 `tasks_teams.member_ids`，
兩份資料會不同步。現在只保留 `tasks_teams.member_ids` 一份，
某個人屬於哪些組別是**反查**出來的：

```sql
SELECT id FROM tasks_teams
WHERE EXISTS (SELECT 1 FROM json_each(member_ids) WHERE json_each.value = ?);
```

新 App 若有類似的多對多關聯，一律採同樣做法：**關聯存在 App 自己的表，
`people` 不重複保存一份**。

---

## 6. D1 / SQLite 慣例與地雷

### 6.1 共用的 migration 帳本

每個 App 有自己的 `migrations_dir`，但 `d1_migrations` 是**整個資料庫共用**的。

- migration 檔名必須**全域唯一**，一律加 App 前綴：`0004_tasks_people.sql`。
- 兩個 App 各有一支 `0002_init.sql` 時，先跑的會讓後跑的被當成「已套用」而跳過。
- **已經套用過的 migration 不要再改內容**，要改結構就新增一支。

### 6.2 `INSERT ... SELECT ... ON CONFLICT` 需要 `WHERE true`

```sql
-- ✗ 會噴 near "DO": syntax error
INSERT INTO people (...) SELECT ... FROM users
ON CONFLICT (id) DO UPDATE SET ...;

-- ✓
INSERT INTO people (...) SELECT ... FROM users
WHERE true
ON CONFLICT (id) DO UPDATE SET ...;
```

SQLite 的文法在 `INSERT ... SELECT` 後面接 `ON CONFLICT` 時無法判斷 `ON` 屬於誰，
必須補一個 `WHERE` 子句消除歧義。

### 6.3 陣列以 JSON 字串儲存

D1 沒有陣列型別。陣列欄位存 JSON 字串（`TEXT NOT NULL DEFAULT '[]'`），
查詢時用 `json_each()` 展開：

```sql
-- 「collaborator_ids 這個 JSON 陣列包含某個 id」
EXISTS (SELECT 1 FROM json_each(t.collaborator_ids) WHERE json_each.value = ?)

-- 反向聚合成陣列
SELECT json_group_array(p.id) FROM people p WHERE ...
```

`json_group_array` 在沒有任何列時回傳 `'[]'`（不是 NULL），可以安全寫進 NOT NULL 欄位。

### 6.4 時間一律存毫秒 INTEGER

`created_at` / `updated_at` 存 `Date.now()` 的毫秒整數，由 Worker 在寫入當下填入。
**不要用 `datetime('now')`**：混用兩種格式會讓排序與比較出錯。

日期（沒有時間的那種，例如截止日）存 `YYYY-MM-DD` **字串**，避免時區位移造成「差一天」。

### 6.5 不設跨表外鍵指向 people

使用者欄位（`creator_id`、`assignee_id`…）存的是 `people.id`，但**刻意不設外鍵**：

- 成員換組或離隊時，既有資料仍保留原作者 id（顯示成「已移除的成員」）。
- D1 預設啟用外鍵約束，設了外鍵會讓新登入的人在某些流程被擋住。

### 6.6 批次與交易

同一個繫結內的多筆寫入用 `db.batch([...])`，那是單一交易。
**跨兩個繫結（ACCOUNTS / APP）不是原子的**，設計時避免這種需求。

樂觀鎖的寫法（避免數量超賣）：

```sql
UPDATE storage_items SET quantity = ?, updated_at = ?
WHERE id = ? AND quantity IS ?      -- 用「舊值」當守衛
```

之後檢查 `meta.changes !== 1` 就知道期間被別人改過，回 409。

### 6.7 沒有即時推播

D1 沒有 subscription。需要「即時」的畫面用輪詢：預設 5 秒，
自己寫入後立刻重讀，分頁切到背景時暫停，回到前景時補上。

---

## 7. 安全檢查清單

- [ ] 每個 API request 都驗證 Access JWT，而非信任前端 user id
- [ ] JWT 驗證簽章、issuer、audience、expiry 與 subject
- [ ] 所有資料查寫都經過 Worker，不讓瀏覽器直接連 D1
- [ ] `<prefix>_role` 是 `NOT NULL DEFAULT 'member'`
- [ ] 每個 App 至少提供 `member` 與 `admin` 兩個角色
- [ ] role 使用 App 專屬欄位，沒有通用混存欄位
- [ ] App 專屬的多對多關聯只存在 App 自己的表，`people` 不重複保存
- [ ] 管理性操作（改 role）只允許該 App 的 admin，且不能改自己的
- [ ] 不刪除 `people` 的列
- [ ] 第一位管理員以冪等的條件更新產生
- [ ] redirect 經過同源或白名單驗證
- [ ] CORS 使用明確 origin 並允許 credentials，不使用 `*`
- [ ] 不儲存 requested/reviewed 時間與審核人員欄位
- [ ] migration 檔名全域唯一
- [ ] Access Policy 夠嚴謹（系統內沒有第二層核准）
