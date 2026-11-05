/**
 * Cloudflare Access 身分驗證 + 共用 people 人員資料。
 *
 * 這是 Team 8725 App 系列的 Worker 身分層範本。新 App 直接複製這個檔案，
 * 只需要改最上面三個常數（ROLE_COLUMN / ROLES / DEFAULT_ROLE），其餘不要動。
 *
 * 登入流程（使用者不需要按任何按鈕）：
 *
 *   使用者開啟網站
 *     → 前端沒有工作階段時導向 /api/v1/auth/login（這個路徑由 Access 保護）
 *     → Access 帶去 GitHub 驗證，回來時建立 Access 工作階段（CF_Authorization cookie）
 *     → 這裡驗證 Access 簽發的 JWT，查 D1 的 people
 *     → 第一次登入：直接建立人員資料，角色預設 member，不需要任何人核准
 *     → 導回網站，馬上就能使用
 *
 * 這個 Worker 不自己發權杖、不存 session——工作階段完全由 Access 管理，
 * 每一次請求都重新驗證 Access 的 JWT。
 *
 * 詳細規格見 docs/02-database.md 與 docs/03-api-contract.md。
 */

/* ============================================================
   1. 新 App 只需要改這一段
   ============================================================ */

/** 這個 App 在 people 表使用的角色欄位。必須是 `<prefix>_role`，前綴選定後不可變更。 */
const ROLE_COLUMN = 'example_role';

/** 這個 App 支援的角色。member 與 admin 是每個 App 都必須提供的兩個。 */
export const ROLES = ['admin', 'member'];

/** 新登入者的預設角色。 */
const DEFAULT_ROLE = 'member';

/* ============================================================
   2. 以下不需要修改
   ============================================================ */

export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const encoder = new TextEncoder();

function base64UrlToBytes(value) {
  // base64url → base64，並補回被去掉的 '='（長度要是 4 的倍數）。
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function decodeSegment(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

/** Zero Trust 團隊網域，例如 https://your-team.cloudflareaccess.com */
function teamUrl(env) {
  const domain = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!domain) throw new ApiError('auth/configuration-not-found', 'Worker 尚未設定 ACCESS_TEAM_DOMAIN', 500);
  return `https://${domain}`;
}

/* ------------------------ Access JWT ------------------------ */

let certsCache = { keys: null, expiresAt: 0, url: '' };

async function fetchAccessCerts(env) {
  const url = `${teamUrl(env)}/cdn-cgi/access/certs`;
  const now = Date.now();
  if (certsCache.keys && certsCache.url === url && certsCache.expiresAt > now) return certsCache.keys;

  const response = await fetch(url);
  if (!response.ok) throw new ApiError('unavailable', '無法取得 Cloudflare Access 的驗證金鑰', 503);
  const body = await response.json();
  certsCache = { keys: body.keys || [], expiresAt: now + 3600_000, url };
  return certsCache.keys;
}

// 同一個 JWT 在有效期內只驗一次簽章，之後直接用快取（每次請求都驗會浪費 CPU）。
const verified = new Map();

function rememberVerified(token, payload) {
  if (verified.size > 500) verified.clear();
  verified.set(token, payload);
}

/**
 * 驗證 Access 簽發的 JWT：簽章、簽發者（團隊網域）、對象（應用程式 AUD）、有效期限。
 * 任何一項不符就當作沒登入。**不可以只解碼不驗簽章。**
 */
export async function verifyAccessJwt(env, token) {
  const cached = verified.get(token);
  if (cached && cached.exp * 1000 > Date.now()) return cached;

  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new ApiError('auth/session-expired', '登入憑證格式錯誤', 401);

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]);
  if (header.alg !== 'RS256') throw new ApiError('auth/session-expired', '不支援的簽章演算法', 401);

  const jwk = (await fetchAccessCerts(env)).find((item) => item.kid === header.kid);
  if (!jwk) throw new ApiError('auth/session-expired', '找不到對應的驗證金鑰，請重新登入', 401);

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, base64UrlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) throw new ApiError('auth/session-expired', '登入憑證的簽章無效', 401);

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== teamUrl(env)) throw new ApiError('auth/session-expired', '登入憑證不是這個團隊簽發的', 401);
  if (Number(payload.exp) < now) throw new ApiError('auth/session-expired', '登入已過期，請重新登入', 401);

  const audience = String(env.ACCESS_AUD || '').trim();
  if (!audience) throw new ApiError('auth/configuration-not-found', 'Worker 尚未設定 ACCESS_AUD', 500);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(audience)) throw new ApiError('auth/session-expired', '登入憑證不是發給這個應用程式的', 401);

  rememberVerified(token, payload);
  return payload;
}

/** JWT 來源：Access 保護的路徑會有標頭，同網域的其他路徑則會帶 cookie。 */
export function readAccessToken(request) {
  const header = request.headers.get('cf-access-jwt-assertion');
  if (header) return header.trim();
  const cookie = request.headers.get('cookie') || '';
  const match = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * 取得使用者姓名等資訊。Access 的 JWT 只有 email 與 sub，
 * 姓名要另外向團隊網域問一次；問不到就用電子郵件前段當顯示名稱。
 */
async function fetchIdentity(env, request) {
  const cookie = request.headers.get('cookie');
  const jwt = readAccessToken(request);
  if (!cookie && !jwt) return null;
  try {
    const response = await fetch(`${teamUrl(env)}/cdn-cgi/access/get-identity`, {
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
      },
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;               // 拿不到姓名不影響登入
  }
}

/* ---------------------------- 人員資料 ---------------------------- */

export async function loadPerson(env, userId) {
  return env.ACCOUNTS.prepare(`
    SELECT id, email, name, COALESCE(${ROLE_COLUMN}, '${DEFAULT_ROLE}') AS role
    FROM people
    WHERE id = ?
  `).bind(userId).first();
}

/** 選填的網域白名單：只允許特定網域的電子郵件進入系統。 */
function checkAllowedEmail(env, email) {
  const raw = String(env.ALLOWED_EMAIL_DOMAINS || '').trim();
  if (!raw) return;
  const domain = String(email || '').split('@')[1]?.toLowerCase();
  const allowed = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!domain || !allowed.includes(domain)) {
    throw new ApiError('auth/user-disabled', `這個系統只開放 ${allowed.join('、')} 的帳號登入`, 403);
  }
}

/**
 * 第一次登入時建立人員資料，角色預設 member，不需要任何人核准。
 *
 * 唯一的例外是「系統裡還沒有任何管理員」：這時第一位登入的人自動成為管理員，
 * 否則沒有人能調整別人的角色。這是冪等的條件更新，不需要額外的 bootstrap 資料表。
 */
export async function ensurePerson(env, identity) {
  const now = Date.now();

  await env.ACCOUNTS.prepare(`
    INSERT INTO people (id, email, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      email = excluded.email,
      name = CASE WHEN people.name IS NULL OR people.name = '' THEN excluded.name ELSE people.name END,
      updated_at = excluded.updated_at
  `).bind(identity.id, identity.email, identity.name, now, now).run();

  await env.ACCOUNTS.prepare(`
    UPDATE people
    SET ${ROLE_COLUMN} = 'admin', updated_at = ?
    WHERE id = ?
      AND NOT EXISTS (SELECT 1 FROM people WHERE ${ROLE_COLUMN} = 'admin')
  `).bind(now, identity.id).run();
}

/* ---------------------------- 端點 ---------------------------- */

/**
 * Access 的 JWT → 目前的使用者與這個 App 的角色。找不到人就順手建立。
 *
 * 通過 Access 就能讀寫這個 App 的一般資料；**管理性操作仍必須另外檢查 role**。
 */
export async function authenticate(env, request) {
  if (String(env.LOCAL_AUTH_BYPASS || '') === '1') {
    const identity = { id: 'local-dev-user', email: 'local-dev@localhost', name: 'Local Developer' };
    await ensurePerson(env, identity);
    await env.ACCOUNTS.prepare(`UPDATE people SET ${ROLE_COLUMN} = 'admin', updated_at = ? WHERE id = ?`)
      .bind(Date.now(), identity.id).run();
    const person = await loadPerson(env, identity.id);
    if (!person) throw new ApiError('internal', '無法建立本機開發帳號', 500);
    return context(person);
  }

  const token = readAccessToken(request);
  if (!token) throw new ApiError('auth/signed-out', '尚未登入', 401);

  const payload = await verifyAccessJwt(env, token);
  const userId = payload.sub;
  if (!userId) throw new ApiError('auth/session-expired', '登入憑證缺少使用者識別碼', 401);

  let person = await loadPerson(env, userId);
  if (!person) {
    // 第一次登入：建立人員資料，馬上就能使用。
    checkAllowedEmail(env, payload.email);
    const identity = await fetchIdentity(env, request);
    await ensurePerson(env, {
      id: userId,
      email: payload.email || identity?.email || '',
      name: identity?.name || (payload.email || '').split('@')[0] || '新成員',
    });
    person = await loadPerson(env, userId);
  }
  if (!person) throw new ApiError('internal', '無法建立帳號資料', 500);

  return context(person);
}

function context(person) {
  const role = person.role || DEFAULT_ROLE;
  return {
    userId: person.id,
    user: { id: person.id, email: person.email || '', name: person.name || '' },
    role,
    isAdmin: role === 'admin',
  };
}

/** 管理性操作的守衛。前端隱藏按鈕不算授權，每一筆都要重新檢查。 */
export function requireAdmin(ctx) {
  if (!ctx.isAdmin) throw new ApiError('permission-denied', '需要管理員權限', 403);
}

/** 只允許導回自己的網站，避免變成開放轉址。 */
export function safeRedirect(env, requested, url) {
  const configured = (value) => {
    const text = String(value || '').trim().replace(/\/+$/, '');
    return text.startsWith('<') ? '' : text;
  };
  const site = configured(env.SITE_URL) || url.origin;
  if (!requested) return site;
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(configured).filter(Boolean);
  try {
    const target = new URL(requested, site);
    if ([site, url.origin, ...allowed].some((item) => {
      try { return new URL(item).origin === target.origin; } catch { return false; }
    })) return target.href;
  } catch { /* 網址不合法，改用預設 */ }
  return site;
}
