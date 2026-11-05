-- ============================================================
-- 共用人員資料表 people
--
-- Team 8725 的 App 全部共用同一個 D1 資料庫，people 是唯一的人員資料表：
--
--   id / email / name  共用身分（Cloudflare Access JWT 的 sub 當 id）
--   <app>_role         每個 App 各自的角色，預設一律是 member
--
-- 沒有 <app>_auth 欄位：登入時若資料庫沒有這個人就直接建立，
-- 不需要管理員核准，所以也沒有「等待授權」這個狀態。
--
-- ---------------------------------------------------------------
-- 新 App 導入方式
-- ---------------------------------------------------------------
-- 1. 在下面的 CREATE TABLE 加一行 `<prefix>_role TEXT NOT NULL DEFAULT 'member'`。
-- 2. 把改好的完整定義**同步回其他每一個 App** 的同名 migration。
--    每個 App 都帶著同一份完整定義，用 CREATE TABLE IF NOT EXISTS，
--    誰先跑誰建立，其餘自動略過——這樣四個 App 不論什麼順序部署結果都一樣。
-- 3. migration 檔名必須**全域唯一**（見下方說明）。
--
-- ---------------------------------------------------------------
-- 為什麼檔名要全域唯一
-- ---------------------------------------------------------------
-- 每個 App 有自己的 migrations_dir，但 `d1_migrations` 這張帳本是整個資料庫共用的。
-- 兩個 App 各有一支 `0002_init.sql` 時，先跑的那個會讓後跑的被當成「已套用」而跳過。
-- 所以檔名一律加上 App 前綴，例如：
--
--   0004_tasks_people.sql
--   0006_parts_people.sql
--   0002_analysis_people.sql
--   0002_storage_people.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS people (
  id            TEXT PRIMARY KEY,   -- Cloudflare Access JWT 的 sub
  email         TEXT NOT NULL DEFAULT '',
  name          TEXT NOT NULL DEFAULT '',

  -- 每個 App 一個 role 欄位，預設一律 member。新 App 在這裡加一行。
  tasks_role    TEXT NOT NULL DEFAULT 'member',
  parts_role    TEXT NOT NULL DEFAULT 'member',
  analysis_role TEXT NOT NULL DEFAULT 'member',
  storage_role  TEXT NOT NULL DEFAULT 'member',

  created_at    INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people (email);

-- ============================================================
-- 從舊的 users 表搬移（只有既有 App 需要，全新的 App 可整段刪除）
--
-- 每個 App 只搬移自己的 role，用 ON CONFLICT DO UPDATE 補上，
-- 這樣多支 migration 不論執行順序結果都一致。
--
-- 注意 `WHERE true`：SQLite 的 `INSERT ... SELECT ... ON CONFLICT` 少了這個
-- WHERE 會解析失敗，錯誤訊息是 `near "DO": syntax error`。
-- ============================================================

-- INSERT INTO people (id, email, name, example_role, created_at, updated_at)
-- SELECT
--   u.id,
--   COALESCE(u.email, ''),
--   COALESCE(u.name, ''),
--   CASE
--     WHEN COALESCE(u.example_auth, 0) = 1 AND u.example_role IN ('admin', 'member')
--       THEN u.example_role
--     ELSE 'member'
--   END,
--   COALESCE(u.created_at, 0),
--   COALESCE(u.updated_at, 0)
-- FROM users u
-- WHERE true
-- ON CONFLICT (id) DO UPDATE SET
--   email        = excluded.email,
--   name         = CASE WHEN people.name = '' THEN excluded.name ELSE people.name END,
--   example_role = excluded.example_role;
