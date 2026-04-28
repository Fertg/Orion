import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Espera a que la BBDD esté disponible.
 * Importante en Railway: a veces el backend arranca antes que Postgres
 * en el primer deploy.
 */
async function waitForDb() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await query('SELECT 1');
      return true;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.log(`⏳ BBDD no lista (intento ${attempt}/${MAX_RETRIES}), reintentando en ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

async function migrate() {
  console.log('🌱 Aplicando schema...');

  try {
    await waitForDb();

    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await query(sql);

    // Verificar que las tablas críticas existen
    const { rows } = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'categories', 'expenses', 'category_keywords', 'budgets')
      ORDER BY table_name
    `);

    console.log(`✓ Schema aplicado. Tablas: ${rows.map(r => r.table_name).join(', ')}`);
  } catch (err) {
    console.error('✗ Error aplicando schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
