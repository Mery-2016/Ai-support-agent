/**
 * Unified API Handler for COMBO.UZ
 * Used by both local server (server.js) and Vercel Serverless (api/index.js)
 */
const url = require('url');
const https = require('https');
const db = require('./db');
const catalog = require('./catalog');
const pricing = require('./pricing');
const agentCore = require('./agent-core');
const instagram = require('./instagram');
const telegram = require('./telegram');

function getAdminSecret() {
  return (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'combo2026admin').trim();
}

function isAuthorizedAdmin(req) {
  const authHeader = (req.headers && req.headers['authorization']) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const customKey = (req.headers && req.headers['x-admin-key']) ? req.headers['x-admin-key'].trim() : '';
  const secret = getAdminSecret();
  return (Boolean(token) && token === secret) || (Boolean(customKey) && customKey === secret);
}

async function callServerGemini(promptText, requestedModel) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `
Ты — официальный AI-консультант компании COMBO.UZ (Жалюзи и рулонные шторы в Ташкенте и Узбекистане).
Отвечай вежливо, четко и профессионально на русском или узбекском (в зависимости от языка вопроса).

СТРОГИЕ ПРАВИЛА И УСЛОВИЯ СЕРВИСА COMBO.UZ:
1. В Ташкенте: замер с каталогами образцов, помощь дизайнера и монтаж — БЕСПЛАТНЫ при оформлении заказа!
2. Если после замера и консультации клиент не оформляет заказ, оплачивается только стандартный выезд специалиста — 100 000 сум.
3. В других областях Узбекистана: условия замера, доставки и установки согласовываются с менеджером индивидуально.
4. Минимальная расчётная площадь каждого изделия — 1 м²: S = max(1.0, W × H). Если створка меньше 1 м², расчет идет за 1 м².
5. Официальные цены:
   - День и Ночь (Зебра / Комбо): от 100 000 сум (общий карниз), кассета 220 000 сум, мини 130 000 сум.
   - Ролло: от 100 000 сум (общий карниз), мини 160 000 сум, кассета 230 000 сум, Blackout 250 000 сум.
   - Римские шторы: 270 000 сум.
   - Double: от 330 000 сум.
   - Тюлевые / Dikey: от 240 000 до 700 000 сум.
   - Плиссе: от 100 000 сум (до 0,5 м²) и от 125 000 сум (до 1 м²).
   - Горизонтальные алюминиевые: 130 000 сум.
   - Вертикальные тканевые: 115 000 сум.
6. Сроки изготовления: 1–3 рабочих дня в собственном цехе в Ташкенте.
7. Гарантия: 12 месяцев на все механизмы и монтаж.
8. Не придумывай несуществующие скидки, акции и цены! При вопросе о скидках говори, что скидки на объем согласовываются с менеджером при замере.
`.trim();

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  for (const model of candidateModels) {
    try {
      const payload = JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      });

      const resText = await new Promise((resolve) => {
        const req = https.request({
          hostname: 'generativelanguage.googleapis.com',
          port: 443,
          path: `/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 6000
        }, (res) => {
          let str = '';
          res.on('data', chunk => str += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const j = JSON.parse(str);
                const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
                resolve(txt || null);
              } catch (e) { resolve(null); }
            } else {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(payload);
        req.end();
      });

      if (resText) return resText;
    } catch (e) {}
  }
  return null;
}

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
  // 2. CONFIG & AUTH FOR CLIENTS & ADMINS
  // ---------------------------------------------------------------------------
  if (pathname === '/api/config' && req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      service: 'COMBO.UZ Omnichannel AI Sales Manager',
      serverAiReady: true,
      hasServerApiKey: Boolean(key),
      authRequiredForClients: false
    }));
  }

  // Admin login endpoint
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const secret = getAdminSecret();
      const pass = (body.password || body.token || '').trim();
      if (pass && pass === secret) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: true,
          token: secret,
          role: 'admin',
          message: 'Авторизация администратора успешна'
        }));
      }
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Неверный пароль администратора' }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // Admin auth status check
  if (pathname === '/api/admin/check-auth' && req.method === 'GET') {
    const isAuth = isAuthorizedAdmin(req);
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: isAuth,
      authenticated: isAuth,
      role: isAuth ? 'admin' : 'guest'
    }));
  }

  // ---------------------------------------------------------------------------
  // WEB AI CHAT (Secure Server-Side AI — No Client API Key Required)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/chat' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const userMessage = (body.message || body.text || '').trim();
      const senderId = body.senderId || body.sessionId || ('web_' + Date.now());
      const clientProfile = body.client || {};
      const senderName = clientProfile.name || body.senderName || 'Посетитель сайта';

      if (!userMessage) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: 'Message cannot be empty' }));
      }

      // 1. Process via Unified Omnichannel Sales Agent Core
      const agentResponse = await agentCore.processChannelMessage({
        channel: agentCore.CHANNELS.WEB,
        senderId,
        senderName,
        text: userMessage,
        metadata: {
          platform: 'web',
          clientProfile,
          selectedModel: body.model || 'Gemini 3.5'
        }
      });

      let finalReply = agentResponse.reply || '';

      // 2. If server has Gemini API Key, try optional server-side enhancement for complex questions
      const serverKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (serverKey && !agentResponse.isHandedOver && !agentResponse.isOrderReady && agentResponse.stage === 'INIT') {
        const geminiCandidate = await callServerGemini(userMessage, body.model);
        if (geminiCandidate && geminiCandidate.length > 20) {
          finalReply = geminiCandidate;
        }
      }

      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        reply: finalReply,
        text: finalReply,
        photos: agentResponse.photos || [],
        stage: agentResponse.stage,
        isOrderReady: Boolean(agentResponse.isOrderReady),
        leadData: agentResponse.leadData || null,
        needsManager: Boolean(agentResponse.isHandedOver || agentResponse.needsManager),
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
  // 8. LEADS CRM (Protected Access for Staff)
  // ---------------------------------------------------------------------------
  if (pathname === '/api/leads' && req.method === 'GET') {
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: false,
        error: 'Доступ запрещён: доступ к клиентским заявкам разрешён только авторизованным сотрудникам'
      }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
    if (!isAuthorizedAdmin(req)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, error: 'Доступ запрещён: требуется авторизация администратора' }));
    }
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
