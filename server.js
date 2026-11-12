/**
 * Server for COMBO.UZ & Support Agent
 * Features:
 * - Strict Directory Traversal Protection (CWE-22)
 * - HTTP Security Headers & CORS
 * - Manager Escalation Webhook / API Endpoint (/api/manager-callback)
 * - Lead Booking API Endpoint (/api/leads)
 * - Knowledge Base REST Endpoints (/api/knowledge-base)
 * - Safe Error Handling & MIME validation
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

const ROOT_DIR = path.resolve(__dirname);
const DATA_DIR = path.join(ROOT_DIR, 'data');
const KB_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const PRICING_FILE = path.join(DATA_DIR, 'pricing.json');
const RETAIL_PRICING_FILE = path.join(DATA_DIR, 'retail_price_list.json');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_LOCAL_FILE = path.join(ROOT_DIR, '.env.local');

// Auto-load .env and .env.local files if present
for (const envF of [ENV_FILE, ENV_LOCAL_FILE]) {
  if (fs.existsSync(envF)) {
    try {
      const envContent = fs.readFileSync(envF, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) process.env[key] = val;
          }
        }
      }
    } catch (err) {}
  }
}

const db = require('./services/db');
const { handleApiRequest } = require('./services/api-handler');

// Ensure data folder and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LEADS_FILE)) {
  const initialLeads = [
    {
      id: 'LEAD-101',
      name: 'Шерзод Каримов',
      phone: '+998 90 123 45 67',
      district: 'Мирзо-Улугбекский',
      address: 'ул. Буюк Ипак Йули, дом 45, кв. 18',
      model: 'День-Ночь (Зебра)',
      dimensions: '2 окна (150x170 см)',
      quantity: 2,
      totalEstimateUZS: 1122000,
      source: 'AI_SALES_CHAT',
      status: 'NEW',
      notes: 'Клиент просит выезд мастера после 18:00 с каталогом под цвет светлого дуба',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'LEAD-102',
      name: 'Дилноза Ахмедова',
      phone: '+998 97 765 43 21',
      district: 'Юнусабадский',
      address: 'Юнусабад 14-квартал',
      model: 'Blackout 100% кассетные',
      dimensions: '3 окна (спальня и детская)',
      quantity: 3,
      totalEstimateUZS: 2520000,
      source: 'AI_SALES_CHAT',
      status: 'IN_PROGRESS',
      notes: 'Защита от сильного солнца на южной стороне, монтаж без сверления',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];
  fs.writeFileSync(LEADS_FILE, JSON.stringify(initialLeads, null, 2), 'utf-8');
}

function readJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// In-memory escalation log
const escalationLog = [];

function setSecurityHeaders(res) {
  for (const [header, val] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, val);
  }
}

function parseJsonBody(req, maxBytes = 1048576) { // 1MB for KB bulk updates
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', err => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  // Method check
  if (!['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'].includes(req.method)) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // CORS for local testing
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // =========================================================================
  // OMNICHANNEL API ROUTES (Instagram Direct, Telegram, Web, CRM, Catalog)
  // Endpoints:
  // - /api/pricing (GET/POST)
  // - /api/retail-pricing (GET/POST)
  // - /api/knowledge-base (GET/POST)
  // - /api/knowledge-base/item (POST/DELETE)
  // - /api/leads (GET/POST)
  // - /api/leads/update-status (POST/PATCH)
  // - /api/webhook/instagram (GET/POST)
  // - /api/webhook/telegram (POST)
  // - /api/catalog (GET)
  // - /api/handover (POST)
  // - /api/manager-callback (POST)
  // - /api/config (GET/POST)
  // =========================================================================
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v1/')) {
    return handleApiRequest(req, res);
  }

  // =========================================================================
  // PROXY: Forward AI-moderation requests to Standalone Service (port 3000)
  // =========================================================================
  if (pathname.startsWith('/api/v1/')) {
    const proxyHeaders = { ...req.headers, host: '127.0.0.1:3000' };
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: proxyHeaders
    }, (proxyRes) => {
      // Strip hop-by-hop headers to prevent corrupt double-chunk framing
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['transfer-encoding'];
      delete responseHeaders['connection'];
      delete responseHeaders['keep-alive'];
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: 'Сервер AI-модератора запущен отдельно на порту 3000. Откройте панель по адресу: http://localhost:3000/admin.html'
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  if (pathname === '/test_moderation.html') {
    res.writeHead(302, { 'Location': 'http://localhost:3000/' });
    res.end();
    return;
  }

  // =========================================================================
  // STATIC FILES (Directory Traversal Protection CWE-22)
  // =========================================================================
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Sanitize path from null-bytes and normalized traversal
  reqPath = reqPath.replace(/\0/g, '');
  const normalizedPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(ROOT_DIR, '.' + normalizedPath);

  // Check boundary
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n============================================================`);
    console.log(`🚀 Сервер COMBO.UZ успешно запущен!`);
    console.log(`👉 Локальный адрес: http://localhost:${port}/`);
    console.log(`🛡️ Защита от Directory Traversal активна`);
    console.log(`📡 Endpoints: /api/knowledge-base, /api/leads, /api/manager-callback`);
    console.log(`============================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Порт ${port} занят, пробуем ${port + 1}...`);
      server.close(() => {
        startServer(port + 1);
      });
    } else {
      console.error('Ошибка сервера:', err);
    }
  });
}

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 8080;
startServer(DEFAULT_PORT);
