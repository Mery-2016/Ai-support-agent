const { Pool } = require('pg');
require('fs');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_orqyxCJB09hV@ep-misty-mountain-ar8ow1b8-pooler.c-4.us-west-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version()');
    console.log('✅ Successfully connected to Neon PostgreSQL!');
    console.log('Database:', res.rows[0].current_database);
    console.log('User:', res.rows[0].current_user);

    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in public schema:', tablesRes.rows.map(r => r.table_name));
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
