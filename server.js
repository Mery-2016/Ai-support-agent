/**
 * Server for TashkentBlinds.AI & Support Agent
 * Features:
 * - Strict Directory Traversal Protection (CWE-22)
 * - HTTP Security Headers
 * - Manager Escalation Webhook / API Endpoint (/api/manager-callback)
 * - Lead Booking API Endpoint (/api/leads)
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

// In-memory escalation & leads log (in production connects to CRM / Telegram bot)
const escalationLog = [];
const leadsLog = [];

function setSecurityHeaders(res) {
  for (const [header, val] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, val);
  }
}

function parseJsonBody(req, maxBytes = 102400) {
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
  if (!['GET', 'HEAD', 'POST', 'OPTIONS'].includes(req.method)) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // CORS for local testing
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  // 1. API Endpoint: Передача запроса дежурному менеджеру
  if (pathname === '/api/manager-callback' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const name = String(data.name || 'Клиент').slice(0, 100);
      const phone = String(data.phone || '').slice(0, 50);
      const reason = String(data.reason || 'Запрос консультации').slice(0, 500);
      const category = String(data.category || 'general').slice(0, 50);

      const record = {
        id: 'ESC-' + Date.now(),
        name,
        phone,
        reason,
        category,
        status: 'PENDING_MANAGER_CALL',
        createdAt: new Date().toISOString()
      };
      escalationLog.push(record);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Запрос успешно передан дежурному менеджеру. Ожидайте звонка в течение 5–10 минут.',
        escalationId: record.id
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 2. API Endpoint: Запись на бесплатный замер (Leads)
  if (pathname === '/api/leads' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const lead = {
        id: 'LEAD-' + Date.now(),
        name: String(data.name || '').slice(0, 100),
        phone: String(data.phone || '').slice(0, 50),
        address: String(data.address || '').slice(0, 300),
        day: String(data.day || 'Сегодня').slice(0, 50),
        source: 'AI_SUPPORT_AGENT',
        createdAt: new Date().toISOString()
      };
      leadsLog.push(lead);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Заявка на бесплатный замер успешно зарегистрирована!',
        leadId: lead.id
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 3. Статическая отдача файлов с защитой от Directory Traversal
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Очистка пути от null-байтов и нормализация
  reqPath = reqPath.replace(/\0/g, '');
  const normalizedPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.resolve(ROOT_DIR, '.' + normalizedPath);

  // Проверка выхода за пределы корневой папки (CWE-22)
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
    console.log(`🚀 Сервер TashkentBlinds.AI успешно запущен!`);
    console.log(`👉 Локальный адрес: http://localhost:${port}/`);
    console.log(`🛡️ Защита от Directory Traversal активна`);
    console.log(`📡 Endpoints: /api/manager-callback, /api/leads`);
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

const INITIAL_PORT = parseInt(process.env.PORT || '8080', 10);
startServer(INITIAL_PORT);
