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

// Auto-load .env file if present
if (fs.existsSync(ENV_FILE)) {
  try {
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          if (key) process.env[key] = val;
        }
      }
    }
  } catch (err) {}
}

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
  // API: PRICING (Официальный прайс-лист)
  // =========================================================================

  // GET /api/pricing - Get pricing configuration
  if (pathname === '/api/pricing' && req.method === 'GET') {
    const pricing = readJsonFile(PRICING_FILE, { updatedAt: new Date().toISOString(), currency: 'UZS', isConfirmed: false, items: [] });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: pricing }));
    return;
  }

  // GET /api/retail-pricing - Get official retail price list (Excel)
  if (pathname === '/api/retail-pricing' && req.method === 'GET') {
    const retailPricing = readJsonFile(RETAIL_PRICING_FILE, {
      title: 'COMBO.UZ — Официальный розничный прайс-лист',
      currency: 'UZS',
      rollerBlinds: [],
      tulleBlinds: [],
      plisseAndHoneycomb: [],
      rules: []
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: retailPricing }));
    return;
  }

  // POST /api/retail-pricing - Save/update official retail price list
  if (pathname === '/api/retail-pricing' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!data) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Ожидается объект розничного прайс-листа' }));
        return;
      }
      data.updatedAt = new Date().toISOString();
      writeJsonFile(RETAIL_PRICING_FILE, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Розничный прайс-лист успешно сохранен', data }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // POST /api/pricing - Update/save official price list
  if (pathname === '/api/pricing' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!data || !Array.isArray(data.items)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Ожидается объект с массивом items' }));
        return;
      }
      data.updatedAt = new Date().toISOString();
      writeJsonFile(PRICING_FILE, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Официальный прайс-лист успешно сохранен', data }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // =========================================================================
  // API: KNOWLEDGE BASE
  // =========================================================================

  // GET /api/knowledge-base - Get full knowledge base
  if (pathname === '/api/knowledge-base' && req.method === 'GET') {
    const kb = readJsonFile(KB_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: kb.length, data: kb }));
    return;
  }

  // POST /api/knowledge-base - Save/replace full knowledge base
  if (pathname === '/api/knowledge-base' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      if (!Array.isArray(data)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Expected JSON array of items' }));
        return;
      }
      writeJsonFile(KB_FILE, data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: data.length, message: 'База знаний успешно сохранена' }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // POST /api/knowledge-base/item - Add or update a single question/answer
  if (pathname === '/api/knowledge-base/item' && req.method === 'POST') {
    try {
      const item = await parseJsonBody(req);
      if (!item.question_ru && !item.question_uz) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Необходимо указать вопрос' }));
        return;
      }

      const kb = readJsonFile(KB_FILE, []);
      let isNew = false;
      let existingIndex = -1;

      if (item.id) {
        existingIndex = kb.findIndex(x => x.id === item.id);
      }

      const cleanItem = {
        id: item.id || `kb-${String(kb.length + 1).padStart(3, '0')}`,
        category: item.category || 'general',
        subcategory: item.subcategory || 'general',
        keywords: Array.isArray(item.keywords) ? item.keywords : String(item.keywords || '').split(',').map(s => s.trim()).filter(Boolean),
        question_ru: String(item.question_ru || '').trim(),
        answer_ru: String(item.answer_ru || '').trim(),
        question_uz: String(item.question_uz || '').trim(),
        answer_uz: String(item.answer_uz || '').trim(),
        requires_admin: Boolean(
          item.requires_admin ||
          (item.answer_ru && item.answer_ru.includes('[Требуется заполнение')) ||
          (item.answer_uz && item.answer_uz.includes('[Administrator'))
        )
      };

      if (existingIndex >= 0) {
        kb[existingIndex] = cleanItem;
      } else {
        isNew = true;
        kb.push(cleanItem);
      }

      writeJsonFile(KB_FILE, kb);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        isNew,
        item: cleanItem,
        message: isNew ? 'Вопрос успешно добавлен в базу знаний' : 'Статья успешно обновлена'
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // DELETE /api/knowledge-base/item/:id - Delete an item by ID
  if (pathname.startsWith('/api/knowledge-base/item/') && (req.method === 'DELETE' || req.method === 'POST')) {
    const idToDelete = pathname.split('/').pop();
    const kb = readJsonFile(KB_FILE, []);
    const initialLen = kb.length;
    const filtered = kb.filter(x => x.id !== idToDelete);

    if (filtered.length === initialLen) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Статья не найдена' }));
      return;
    }

    writeJsonFile(KB_FILE, filtered);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: `Статья ${idToDelete} удалена`, count: filtered.length }));
    return;
  }

  // =========================================================================
  // API: CONFIG & GEMINI API KEY
  // =========================================================================
  if (pathname === '/api/config' && req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hasApiKey: Boolean(key),
      apiKey: key || undefined
    }));
    return;
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      if (body && body.apiKey) {
        const cleanKey = String(body.apiKey).trim().replace(/^["']|["']$/g, '');
        fs.writeFileSync(ENV_FILE, `GEMINI_API_KEY=${cleanKey}\n`, 'utf-8');
        process.env.GEMINI_API_KEY = cleanKey;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Google AI Studio API ключ сохранен в .env' }));
        return;
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Ключ не передан' }));
        return;
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // =========================================================================
  // API: LEADS (Заявки для менеджера)
  // =========================================================================

  // GET /api/leads - Get all leads
  if (pathname === '/api/leads' && req.method === 'GET') {
    const leads = readJsonFile(LEADS_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: leads.length, leads, data: leads }));
    return;
  }

  // POST /api/leads - Create new lead (from Landing or Sales AI Chat)
  if (pathname === '/api/leads' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const leads = readJsonFile(LEADS_FILE, []);

      const targetId = data.id || data.leadId;
      let existingIndex = -1;
      const cleanPhone = (p) => String(p || '').replace(/[^\d]/g, '');
      const targetPhoneDigits = cleanPhone(data.phone);

      if (targetId) {
        existingIndex = leads.findIndex(x => x.id === targetId);
      } else if (targetPhoneDigits && targetPhoneDigits.length >= 7) {
        // Prevent duplicate leads from the same active chat within 30 minutes
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        existingIndex = leads.findIndex(x => {
          const leadDigits = cleanPhone(x.phone);
          const isPhoneMatch = leadDigits && (leadDigits.endsWith(targetPhoneDigits.slice(-7)) || targetPhoneDigits.endsWith(leadDigits.slice(-7)));
          return isPhoneMatch && new Date(x.createdAt).getTime() > thirtyMinAgo;
        });
      }

      if (existingIndex >= 0) {
        // Update existing lead instead of creating duplicate
        const existing = leads[existingIndex];
        const updatedLead = {
          ...existing,
          name: String(data.name || existing.name).slice(0, 100),
          phone: String(data.phone || existing.phone).slice(0, 50),
          district: String(data.district || existing.district).slice(0, 100),
          address: String(data.address || existing.address).slice(0, 300),
          model: String(data.model || existing.model).slice(0, 100),
          fabricCollection: String(data.fabricCollection || existing.fabricCollection || '').slice(0, 100),
          corniceType: String(data.corniceType || existing.corniceType || '').slice(0, 100),
          dimensions: String(data.dimensions || existing.dimensions).slice(0, 200),
          quantity: Number(data.quantity) || existing.quantity || 1,
          totalEstimateUZS: Number(data.totalEstimateUZS) || existing.totalEstimateUZS || 0,
          notes: String(data.notes || existing.notes).slice(0, 500),
          updatedAt: new Date().toISOString()
        };
        leads[existingIndex] = updatedLead;
        writeJsonFile(LEADS_FILE, leads);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Заявка успешно обновлена в журнале менеджера.',
          leadId: updatedLead.id,
          lead: updatedLead,
          isUpdated: true
        }));
        return;
      }

      const lead = {
        id: targetId || ('LEAD-' + Date.now()),
        name: String(data.name || 'Клиент').slice(0, 100),
        phone: String(data.phone || '').slice(0, 50),
        district: String(data.district || 'Ташкент').slice(0, 100),
        address: String(data.address || '').slice(0, 300),
        model: String(data.model || 'Жалюзи/Шторы COMBO.UZ').slice(0, 100),
        fabricCollection: String(data.fabricCollection || '').slice(0, 100),
        corniceType: String(data.corniceType || '').slice(0, 100),
        dimensions: String(data.dimensions || '').slice(0, 200),
        quantity: Number(data.quantity) || 1,
        day: String(data.day || 'В ближайшее время').slice(0, 50),
        totalEstimateUZS: Number(data.totalEstimateUZS) || 0,
        source: String(data.source || 'AI_SUPPORT_AGENT').slice(0, 50),
        notes: String(data.notes || '').slice(0, 500),
        status: 'NEW',
        createdAt: new Date().toISOString()
      };

      leads.unshift(lead); // latest first
      writeJsonFile(LEADS_FILE, leads);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Заявка на бесплатный замер успешно зарегистрирована! Менеджер свяжется с вами в течение 10 минут.',
        leadId: lead.id,
        lead
      }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // PATCH /api/leads/:id or POST /api/leads/update-status - Update lead status
  if ((pathname.startsWith('/api/leads/') || pathname === '/api/leads/update-status') && (req.method === 'PATCH' || req.method === 'POST')) {
    try {
      const data = await parseJsonBody(req);
      const targetId = data.id || pathname.split('/').pop();
      const newStatus = data.status;
      const notes = data.notes;

      const leads = readJsonFile(LEADS_FILE, []);
      const index = leads.findIndex(x => x.id === targetId);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Заявка не найдена' }));
        return;
      }

      if (newStatus) leads[index].status = newStatus;
      if (notes !== undefined) leads[index].notes = notes;
      leads[index].updatedAt = new Date().toISOString();

      writeJsonFile(LEADS_FILE, leads);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Статус заявки обновлен', lead: leads[index] }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // =========================================================================
  // API: ESCALATION CALLBACK
  // =========================================================================
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
