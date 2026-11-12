/**
 * Vercel Serverless Function for COMBO.UZ API
 * Powered by Neon PostgreSQL & Google AI Studio
 */
const url = require('url');
const db = require('../services/db');

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

module.exports = async (req, res) => {
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
  // DB STATUS
  // ---------------------------------------------------------------------------
  if (pathname === '/api/db-status' || pathname === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: true,
      service: 'COMBO.UZ API',
      neonConnected: db.isNeonConfigured(),
      timestamp: new Date().toISOString()
    }));
  }

  // ---------------------------------------------------------------------------
  // CONFIG & API KEY
  // ---------------------------------------------------------------------------
  if (pathname === '/api/config') {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      hasApiKey: Boolean(key),
      apiKey: key || undefined
    }));
  }

  // ---------------------------------------------------------------------------
  // LEADS CRM
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
          ? 'Заявка на бесплатный замер успешно зарегистрирована в Neon DB! Менеджер свяжется с вами в течение 10 минут.'
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
  // KNOWLEDGE BASE (100 Q&A)
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
  // MANAGER CALLBACK ESCALATION
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
};
