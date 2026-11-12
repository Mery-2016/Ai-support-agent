/**
 * Unified API Handler for COMBO.UZ
 * Used by both local server (server.js) and Vercel Serverless (api/index.js)
 */
const url = require('url');
const db = require('./db');
const catalog = require('./catalog');
const pricing = require('./pricing');
const agentCore = require('./agent-core');
const instagram = require('./instagram');
const telegram = require('./telegram');

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

async function handleApiRequest(req, res) {
  // CORS and security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';

  // ---------------------------------------------------------------------------
  // 1. HEALTH & STATUS
  // ---------------------------------------------------------------------------
  if (pathname === '/api/db-status' || pathname === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      service: 'COMBO.UZ Omnichannel AI Sales Manager API',
      neonConnected: db.isNeonConfigured(),
      channels: {
        instagram: instagram.getInstagramStatus(),
        telegram: telegram.getTelegramStatus(),
        web: { active: true }
      },
      timestamp: new Date().toISOString()
    }));
  }

  // Full Omnichannel Status
  if (pathname === '/api/omnichannel/status' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      instagram: instagram.getInstagramStatus(),
      telegram: telegram.getTelegramStatus(),
      web: { configured: true, active: true },
      activeSessions: agentCore.getAllSessions(),
      activeHandovers: agentCore.getHandoversList()
    }));
  }

  // ---------------------------------------------------------------------------
  // 2. CONFIG & API KEY
  // ---------------------------------------------------------------------------
  if (pathname === '/api/config' && req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      hasApiKey: Boolean(key),
      apiKey: key || undefined
    }));
  }

  // ---------------------------------------------------------------------------
  // 3. PRODUCT CATALOG
  // ---------------------------------------------------------------------------
  if (pathname === '/api/catalog' && req.method === 'GET') {
    const items = catalog.getCatalog();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      count: items.length,
      categories: items
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. DYNAMIC PRICING (Excel 01.10.2025) & OFFICIAL PRICING
  // ---------------------------------------------------------------------------
  if ((pathname === '/api/pricing/retail' || pathname === '/api/retail-pricing') && req.method === 'GET') {
    const data = pricing.getRetailPricing();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, data }));
  }

  if ((pathname === '/api/pricing/retail' || pathname === '/api/retail-pricing') && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = pricing.updateRetailPricing(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if (pathname === '/api/pricing' && req.method === 'GET') {
    const data = pricing.getOfficialPricing();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, data }));
  }

  if (pathname === '/api/pricing' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = pricing.updateOfficialPricing(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // ---------------------------------------------------------------------------
  // 5. INSTAGRAM DIRECT (Meta Graph API)
  // ---------------------------------------------------------------------------
  // GET: Meta Webhook Handshake Verification (hub.challenge)
  if (pathname === '/api/webhook/instagram' && req.method === 'GET') {
    const verifyRes = instagram.verifyWebhook(parsedUrl.query);
    if (verifyRes.success) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(verifyRes.challenge);
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: verifyRes.error }));
    }
  }

  // POST: Meta Webhook Event (incoming messages)
  if (pathname === '/api/webhook/instagram' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await instagram.handleWebhookEvent(body, false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // POST: Instagram Simulator / Sandbox
  if (pathname === '/api/instagram/simulate' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const username = body.username || '@test_user_ig';
      const text = body.text || 'Здравствуйте! Сколько стоят шторы День-Ночь 150 на 200 см?';
      const result = await instagram.simulateDirectMessage(username, text);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // GET: Instagram Status
  if (pathname === '/api/instagram/status' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(instagram.getInstagramStatus()));
  }

  // ---------------------------------------------------------------------------
  // 6. TELEGRAM BOT API
  // ---------------------------------------------------------------------------
  // POST: Telegram Webhook Update
  if (pathname === '/api/webhook/telegram' && req.method === 'POST') {
    try {
      const update = await parseBody(req);
      const result = await telegram.handleTelegramUpdate(update, false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST: Telegram Simulator / Sandbox
  if (pathname === '/api/telegram/simulate' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const chatId = body.chatId || '12345678';
      const username = body.username || '@test_tg_user';
      const text = body.text || '/start';
      const contact = body.contact || null;
      const result = await telegram.simulateTelegramMessage(chatId, username, text, contact);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // GET: Telegram Status
  if (pathname === '/api/telegram/status' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(telegram.getTelegramStatus()));
  }

  // ---------------------------------------------------------------------------
  // 7. HUMAN HANDOVER (Manager Transfer)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/handover' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { channel, senderId, shouldHandover, reason, operatorName } = body;
      if (!channel || !senderId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'channel and senderId are required' }));
      }
      const result = await agentCore.setHandover(channel, senderId, Boolean(shouldHandover), reason, operatorName);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // ---------------------------------------------------------------------------
  // 8. LEADS CRM
  // ---------------------------------------------------------------------------
  if (pathname === '/api/leads' && req.method === 'GET') {
    try {
      const leads = await db.getLeads();
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        count: leads.length,
        leads,
        data: leads
      }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if (pathname === '/api/leads' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await db.saveLead(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        message: result.isNew
          ? 'Заявка на бесплатный замер успешно зарегистрирована в CRM! Менеджер свяжется с вами в течение 10 минут.'
          : 'Заявка успешно обновлена в журнале менеджера.',
        leadId: result.lead.id,
        lead: result.lead,
        isUpdated: !result.isNew
      }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if ((pathname.startsWith('/api/leads/') || pathname === '/api/leads/update-status') && (req.method === 'PATCH' || req.method === 'POST')) {
    try {
      const body = await parseBody(req);
      const targetId = body.id || pathname.split('/').pop();
      const updated = await db.updateLeadStatus(targetId, body.status);
      if (!updated) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Заявка не найдена' }));
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        message: 'Статус заявки обновлен',
        lead: updated
      }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // ---------------------------------------------------------------------------
  // 9. KNOWLEDGE BASE (100 Q&A)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/knowledge-base' && req.method === 'GET') {
    try {
      const kb = await db.getKnowledgeBase();
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        count: kb.length,
        data: kb
      }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if (pathname === '/api/knowledge-base/item' && req.method === 'POST') {
    try {
      const item = await parseBody(req);
      const result = await db.saveKnowledgeBaseItem(item);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        item: result.item,
        message: 'Статья успешно сохранена в базе знаний'
      }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  if (pathname.startsWith('/api/knowledge-base/item/') && (req.method === 'DELETE' || req.method === 'POST')) {
    try {
      const idToDelete = pathname.split('/').pop();
      const result = await db.deleteKnowledgeBaseItem(idToDelete);
      if (result.notFound) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Статья не найдена' }));
      }
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        message: `Статья ${idToDelete} удалена`
      }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // ---------------------------------------------------------------------------
  // 10. MANAGER CALLBACK ESCALATION
  // ---------------------------------------------------------------------------
  if (pathname === '/api/manager-callback' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = await db.saveCallback(body);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        message: 'Запрос передан дежурному менеджеру. Ожидайте звонка в течение 5–10 минут.',
        escalationId: result.id
      }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
}

module.exports = {
  handleApiRequest
};
