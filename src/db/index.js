import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Railway requiere SSL en producción
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isDev ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente de Postgres:', err);
  process.exit(-1);
});

/**
 * Ejecuta una query con parámetros.
 * @param {string} text - SQL con $1, $2, ...
 * @param {Array} params - parámetros
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Para transacciones — coge un cliente del pool y lo libera al final.
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
