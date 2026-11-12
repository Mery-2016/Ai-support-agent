const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[k]) process.env[k] = v;
          }
        }
      }
    }
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL not set in environment or .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function initDb() {
  console.log('🚀 Initializing Neon Database Schema & Data Migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Table: leads
    console.log('📦 Creating table "leads"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        district VARCHAR(128),
        address TEXT,
        model VARCHAR(255),
        fabric_collection VARCHAR(255),
        cornice_type VARCHAR(255),
        dimensions VARCHAR(128),
        quantity INTEGER DEFAULT 1,
        day VARCHAR(128),
        total_estimate_uzs NUMERIC(14, 2) DEFAULT 0,
        source VARCHAR(128) DEFAULT 'WEB',
        notes TEXT,
        status VARCHAR(64) DEFAULT 'NEW',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    `);

    // 2. Table: knowledge_base
    console.log('📚 Creating table "knowledge_base"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(128),
        subcategory VARCHAR(128),
        keywords TEXT[],
        question_ru TEXT NOT NULL,
        answer_ru TEXT NOT NULL,
        question_uz TEXT,
        answer_uz TEXT,
        requires_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
    `);

    // 3. Table: callbacks
    console.log('📞 Creating table "callbacks"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS callbacks (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(64) NOT NULL,
        district VARCHAR(128),
        question TEXT,
        status VARCHAR(64) DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Migrate Leads from data/leads.json
    const leadsFile = path.resolve(__dirname, '..', 'data', 'leads.json');
    if (fs.existsSync(leadsFile)) {
      const leads = JSON.parse(fs.readFileSync(leadsFile, 'utf-8'));
      console.log(`📥 Migrating ${leads.length} leads from JSON...`);
      for (const lead of leads) {
        await client.query(`
          INSERT INTO leads (
            id, name, phone, district, address, model, fabric_collection,
            cornice_type, dimensions, quantity, day, total_estimate_uzs,
            source, notes, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            district = EXCLUDED.district,
            status = EXCLUDED.status,
            total_estimate_uzs = EXCLUDED.total_estimate_uzs,
            updated_at = EXCLUDED.updated_at
        `, [
          lead.id,
          lead.name || 'Клиент',
          lead.phone || '',
          lead.district || '',
          lead.address || '',
          lead.model || '',
          lead.fabricCollection || '',
          lead.corniceType || '',
          lead.dimensions || '',
          lead.quantity || 1,
          lead.day || '',
          lead.totalEstimateUZS || 0,
          lead.source || 'WEB',
          lead.notes || '',
          lead.status || 'NEW',
          lead.createdAt ? new Date(lead.createdAt) : new Date(),
          lead.updatedAt ? new Date(lead.updatedAt) : new Date()
        ]);
      }
    }

    // 5. Migrate Knowledge Base from data/knowledge_base.json
    const kbFile = path.resolve(__dirname, '..', 'data', 'knowledge_base.json');
    if (fs.existsSync(kbFile)) {
      const kb = JSON.parse(fs.readFileSync(kbFile, 'utf-8'));
      console.log(`📥 Migrating ${kb.length} knowledge base Q&A from JSON...`);
      for (const item of kb) {
        await client.query(`
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
        `, [
          item.id,
          item.category || 'general',
          item.subcategory || '',
          item.keywords || [],
          item.question_ru || '',
          item.answer_ru || '',
          item.question_uz || '',
          item.answer_uz || '',
          Boolean(item.requires_admin)
        ]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');

    // Verification
    const leadsCount = await client.query('SELECT count(*) FROM leads');
    const kbCount = await client.query('SELECT count(*) FROM knowledge_base');
    console.log(`📊 Neon Database Stats:`);
    console.log(`   - Leads: ${leadsCount.rows[0].count}`);
    console.log(`   - Knowledge Base Q&A: ${kbCount.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch(() => process.exit(1));
