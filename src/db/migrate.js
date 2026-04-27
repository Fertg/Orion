import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  console.log('🌱 Aplicando schema...');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await query(sql);
    console.log('✓ Schema aplicado correctamente');
  } catch (err) {
    console.error('✗ Error aplicando schema:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
