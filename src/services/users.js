import { query, withTransaction } from '../db/index.js';
import { DEFAULT_CATEGORIES, SEED_KEYWORDS } from '../db/seed-data.js';

/**
 * Busca un usuario por su provider+providerId, o lo crea con categorías iniciales.
 *
 * @param {object} profile
 * @param {string} profile.provider - 'google' | 'apple'
 * @param {string} profile.providerId
 * @param {string} profile.email
 * @param {string} profile.name
 * @param {string} [profile.avatarUrl]
 * @returns {Promise<object>} usuario completo
 */
export async function findOrCreateUser({ provider, providerId, email, name, avatarUrl }) {
  // Busca primero
  const existing = await query(
    `SELECT * FROM users WHERE provider = $1 AND provider_id = $2`,
    [provider, providerId]
  );

  if (existing.rows.length > 0) {
    // Actualiza campos que pueden cambiar (nombre, avatar)
    const user = existing.rows[0];
    if (user.name !== name || user.avatar_url !== avatarUrl) {
      await query(
        `UPDATE users SET name = $1, avatar_url = $2 WHERE id = $3`,
        [name, avatarUrl, user.id]
      );
    }
    return user;
  }

  // Crea usuario + categorías + keywords en una transacción
  return await withTransaction(async (client) => {
    const insertUser = await client.query(
      `INSERT INTO users (email, name, avatar_url, provider, provider_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, name, avatarUrl, provider, providerId]
    );
    const user = insertUser.rows[0];

    // Categorías por defecto
    const categoryIdsBySlug = {};
    for (const cat of DEFAULT_CATEGORIES) {
      const { rows } = await client.query(
        `INSERT INTO categories (user_id, name, slug, color, icon, is_default, sort_order)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6)
         RETURNING id`,
        [user.id, cat.name, cat.slug, cat.color, cat.icon, cat.sort_order]
      );
      categoryIdsBySlug[cat.slug] = rows[0].id;
    }

    // Keywords seed
    for (const [slug, keywords] of Object.entries(SEED_KEYWORDS)) {
      const categoryId = categoryIdsBySlug[slug];
      if (!categoryId) continue;
      for (const keyword of keywords) {
        await client.query(
          `INSERT INTO category_keywords (user_id, category_id, keyword, weight, source)
           VALUES ($1, $2, $3, 2, 'seed')
           ON CONFLICT (user_id, keyword, category_id) DO NOTHING`,
          [user.id, categoryId, keyword]
        );
      }
    }

    return user;
  });
}

export async function getUserById(id) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}
