/**
 * Database Service for COMBO.UZ (Neon PostgreSQL & Local JSON fallback)
 */
const fs = require('fs');
const path = require('path');

let Pool = null;
try {
  Pool = require('pg').Pool;
} catch (e) {
  // pg is optional if purely running offline without dependencies
}

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const KB_FILE = path.join(DATA_DIR, 'knowledge_base.json');

let pool = null;
let isNeonConfigured = false;

function initPool() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString && Pool) {
    try {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      isNeonConfigured = true;
      console.log('🔌 Neon PostgreSQL pool initialized');
    } catch (err) {
      console.warn('⚠️ Could not initialize Neon Pool, falling back to JSON:', err.message);
      pool = null;
      isNeonConfigured = false;
    }
  } else {
    isNeonConfigured = false;
  }
}

initPool();

function readJsonFile(filePath, defaultVal = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) || defaultVal;
  } catch (err) {
    return defaultVal;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

// -----------------------------------------------------------------------------
// LEADS
// -----------------------------------------------------------------------------
async function getLeads() {
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT
          id, name, phone, district, address, model,
          fabric_collection AS "fabricCollection",
          cornice_type AS "corniceType",
          dimensions, quantity, day,
          total_estimate_uzs AS "totalEstimateUZS",
          source, notes, status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM leads
        ORDER BY created_at DESC
      `);
      return res.rows.map(r => ({
        ...r,
        quantity: Number(r.quantity) || 1,
        totalEstimateUZS: Number(r.totalEstimateUZS) || 0
      }));
    } catch (err) {
      console.warn('⚠️ Neon query error in getLeads, using JSON fallback:', err.message);
    }
  }
  return readJsonFile(LEADS_FILE, []);
}

async function saveLead(data) {
  const targetId = data.id || data.leadId;
  const cleanPhone = (p) => String(p || '').replace(/[^\d]/g, '');
  const targetPhoneDigits = cleanPhone(data.phone);

  if (pool) {
    try {
      let existingLeadId = null;

      if (targetId) {
        const check = await pool.query('SELECT id FROM leads WHERE id = $1', [targetId]);
        if (check.rows.length > 0) existingLeadId = check.rows[0].id;
      } else if (targetPhoneDigits && targetPhoneDigits.length >= 7) {
        const check = await pool.query(`
          SELECT id FROM leads
          WHERE regexp_replace(phone, '\\D', '', 'g') LIKE $1
            AND created_at > NOW() - INTERVAL '30 minutes'
          ORDER BY created_at DESC LIMIT 1
        `, [`%${targetPhoneDigits.slice(-7)}`]);
        if (check.rows.length > 0) existingLeadId = check.rows[0].id;
      }

      if (existingLeadId) {
        const updateRes = await pool.query(`
          UPDATE leads SET
            name = COALESCE($1, name),
            phone = COALESCE($2, phone),
            district = COALESCE($3, district),
            address = COALESCE($4, address),
            model = COALESCE($5, model),
            fabric_collection = COALESCE($6, fabric_collection),
            cornice_type = COALESCE($7, cornice_type),
            dimensions = COALESCE($8, dimensions),
            quantity = COALESCE($9, quantity),
            total_estimate_uzs = COALESCE($10, total_estimate_uzs),
            notes = COALESCE($11, notes),
            updated_at = NOW()
          WHERE id = $12
          RETURNING
            id, name, phone, district, address, model,
            fabric_collection AS "fabricCollection",
            cornice_type AS "corniceType",
            dimensions, quantity, day,
            total_estimate_uzs AS "totalEstimateUZS",
            source, notes, status,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `, [
          data.name || null,
          data.phone || null,
          data.district || null,
          data.address || null,
          data.model || null,
          data.fabricCollection || null,
          data.corniceType || null,
          data.dimensions || null,
          data.quantity ? Number(data.quantity) : null,
          data.totalEstimateUZS ? Number(data.totalEstimateUZS) : null,
          data.notes || null,
          existingLeadId
        ]);

        const row = updateRes.rows[0];
        if (row) {
          row.quantity = Number(row.quantity) || 1;
          row.totalEstimateUZS = Number(row.totalEstimateUZS) || 0;
        }
        return { lead: row, isNew: false };
      } else {
        const newId = targetId || `LEAD-${Date.now()}`;
        const insertRes = await pool.query(`
          INSERT INTO leads (
            id, name, phone, district, address, model,
            fabric_collection, cornice_type, dimensions, quantity,
            day, total_estimate_uzs, source, notes, status,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'NEW', NOW(), NOW())
          RETURNING
            id, name, phone, district, address, model,
            fabric_collection AS "fabricCollection",
            cornice_type AS "corniceType",
            dimensions, quantity, day,
            total_estimate_uzs AS "totalEstimateUZS",
            source, notes, status,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `, [
          newId,
          String(data.name || 'Клиент').slice(0, 100),
          String(data.phone || '').slice(0, 50),
          String(data.district || '').slice(0, 100),
          String(data.address || '').slice(0, 300),
          String(data.model || 'Рулонные шторы COMBO').slice(0, 100),
          String(data.fabricCollection || '').slice(0, 100),
          String(data.corniceType || '').slice(0, 100),
          String(data.dimensions || '').slice(0, 100),
          Number(data.quantity) || 1,
          String(data.day || 'В ближайшее время').slice(0, 100),
          Number(data.totalEstimateUZS) || 0,
          String(data.source || 'WEB').slice(0, 100),
          String(data.notes || '').slice(0, 500)
        ]);

        const row = insertRes.rows[0];
        if (row) {
          row.quantity = Number(row.quantity) || 1;
          row.totalEstimateUZS = Number(row.totalEstimateUZS) || 0;
        }
        return { lead: row, isNew: true };
      }
    } catch (err) {
      console.warn('⚠️ Neon error in saveLead, using JSON fallback:', err.message);
    }
  }

  // Fallback to JSON
  const leads = readJsonFile(LEADS_FILE, []);
  let existingIndex = -1;
  if (targetId) {
    existingIndex = leads.findIndex(x => x.id === targetId);
  } else if (targetPhoneDigits && targetPhoneDigits.length >= 7) {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    existingIndex = leads.findIndex(x => {
      const d = cleanPhone(x.phone);
      return d && (d.endsWith(targetPhoneDigits.slice(-7)) || targetPhoneDigits.endsWith(d.slice(-7))) && new Date(x.createdAt).getTime() > thirtyMinAgo;
    });
  }

  if (existingIndex >= 0) {
    const existing = leads[existingIndex];
    const updated = {
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
    leads[existingIndex] = updated;
    writeJsonFile(LEADS_FILE, leads);
    return { lead: updated, isNew: false };
  } else {
    const newLead = {
      id: targetId || `LEAD-${Date.now()}`,
      name: String(data.name || 'Клиент').slice(0, 100),
      phone: String(data.phone || '').slice(0, 50),
      district: String(data.district || '').slice(0, 100),
      address: String(data.address || '').slice(0, 300),
      model: String(data.model || 'Рулонные шторы COMBO').slice(0, 100),
      fabricCollection: String(data.fabricCollection || '').slice(0, 100),
      corniceType: String(data.corniceType || '').slice(0, 100),
      dimensions: String(data.dimensions || '').slice(0, 200),
      quantity: Number(data.quantity) || 1,
      day: String(data.day || 'В ближайшее время').slice(0, 100),
      totalEstimateUZS: Number(data.totalEstimateUZS) || 0,
      source: String(data.source || 'WEB').slice(0, 100),
      notes: String(data.notes || '').slice(0, 500),
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    leads.unshift(newLead);
    writeJsonFile(LEADS_FILE, leads);
    return { lead: newLead, isNew: true };
  }
}

async function updateLeadStatus(id, status) {
  if (pool) {
    try {
      const res = await pool.query(`
        UPDATE leads
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [status, id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      console.warn('⚠️ Neon error in updateLeadStatus, using JSON fallback:', err.message);
    }
  }

  const leads = readJsonFile(LEADS_FILE, []);
  const idx = leads.findIndex(x => x.id === id);
  if (idx >= 0) {
    leads[idx].status = status;
    leads[idx].updatedAt = new Date().toISOString();
    writeJsonFile(LEADS_FILE, leads);
    return leads[idx];
  }
  return null;
}

// -----------------------------------------------------------------------------
// KNOWLEDGE BASE
// -----------------------------------------------------------------------------
async function getKnowledgeBase() {
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT
          id, category, subcategory, keywords,
          question_ru, answer_ru, question_uz, answer_uz,
          requires_admin
        FROM knowledge_base
        ORDER BY id ASC
      `);
      return res.rows;
    } catch (err) {
      console.warn('⚠️ Neon error in getKnowledgeBase, using JSON fallback:', err.message);
    }
  }
  return readJsonFile(KB_FILE, []);
}

async function saveKnowledgeBaseItem(item) {
  const cleanItem = {
    id: item.id || `kb-${Date.now().toString().slice(-6)}`,
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

  if (pool) {
    try {
      const res = await pool.query(`
        INSERT INTO knowledge_base (
          id, category, subcategory, keywords,
          question_ru, answer_ru, question_uz, answer_uz,
          requires_admin, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (id) DO UPDATE SET
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          keywords = EXCLUDED.keywords,
          question_ru = EXCLUDED.question_ru,
          answer_ru = EXCLUDED.answer_ru,
          question_uz = EXCLUDED.question_uz,
          answer_uz = EXCLUDED.answer_uz,
          requires_admin = EXCLUDED.requires_admin,
          updated_at = NOW()
        RETURNING *
      `, [
        cleanItem.id,
        cleanItem.category,
        cleanItem.subcategory,
        cleanItem.keywords,
        cleanItem.question_ru,
        cleanItem.answer_ru,
        cleanItem.question_uz,
        cleanItem.answer_uz,
        cleanItem.requires_admin
      ]);
      return { item: res.rows[0], success: true };
    } catch (err) {
      console.warn('⚠️ Neon error in saveKnowledgeBaseItem, using JSON fallback:', err.message);
    }
  }

  const kb = readJsonFile(KB_FILE, []);
  const idx = kb.findIndex(x => x.id === cleanItem.id);
  if (idx >= 0) {
    kb[idx] = cleanItem;
  } else {
    kb.push(cleanItem);
  }
  writeJsonFile(KB_FILE, kb);
  return { item: cleanItem, success: true };
}

async function deleteKnowledgeBaseItem(id) {
  if (pool) {
    try {
      const res = await pool.query('DELETE FROM knowledge_base WHERE id = $1 RETURNING id', [id]);
      if (res.rows.length > 0) return { success: true };
    } catch (err) {
      console.warn('⚠️ Neon error in deleteKnowledgeBaseItem, using JSON fallback:', err.message);
    }
  }

  const kb = readJsonFile(KB_FILE, []);
  const filtered = kb.filter(x => x.id !== id);
  if (filtered.length !== kb.length) {
    writeJsonFile(KB_FILE, filtered);
    return { success: true };
  }
  return { success: false, notFound: true };
}

// -----------------------------------------------------------------------------
// CALLBACKS
// -----------------------------------------------------------------------------
async function saveCallback(data) {
  const id = `CB-${Date.now()}`;
  if (pool) {
    try {
      await pool.query(`
        INSERT INTO callbacks (id, name, phone, district, question, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW())
      `, [
        id,
        String(data.name || 'Гость').slice(0, 100),
        String(data.phone || '').slice(0, 50),
        String(data.district || '').slice(0, 100),
        String(data.question || data.reason || '').slice(0, 500)
      ]);
      return { id, success: true };
    } catch (err) {
      console.warn('⚠️ Neon error in saveCallback:', err.message);
    }
  }
  return { id, success: true };
}

module.exports = {
  isNeonConfigured: () => isNeonConfigured,
  getLeads,
  saveLead,
  updateLeadStatus,
  getKnowledgeBase,
  saveKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
  saveCallback
};
