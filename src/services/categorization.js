import { query } from '../db/index.js';
import { normalizeText } from '../utils/text.js';

/**
 * Sugiere una categoría para una descripción dada.
 * Estrategia:
 *   1. Normaliza descripción
 *   2. Busca todas las keywords del usuario que aparezcan en la descripción
 *   3. Suma pesos por categoría (matches más largos pesan más)
 *   4. Devuelve la de mayor score, o la categoría "otros" si no hay match
 *
 * @param {string} userId
 * @param {string} description
 * @returns {Promise<{ categoryId: string, confidence: number, matchedKeyword: string|null }>}
 */
export async function suggestCategory(userId, description) {
  const normalized = normalizeText(description);
  if (!normalized) return await fallbackToOtros(userId);

  // Cogemos todas las keywords del usuario de una vez (suelen ser pocas, <500)
  // y filtramos en JS — más simple que un query SQL con LIKE dinámico.
  const { rows: keywords } = await query(
    `SELECT keyword, category_id, weight
     FROM category_keywords
     WHERE user_id = $1`,
    [userId]
  );

  if (keywords.length === 0) return await fallbackToOtros(userId);

  // Calcular score por categoría
  const scores = new Map(); // categoryId -> { score, matchedKeyword }

  for (const { keyword, category_id, weight } of keywords) {
    if (normalized.includes(keyword)) {
      // bonus por longitud: una keyword más larga es más específica
      const lengthBonus = keyword.length;
      const score = weight * lengthBonus;

      const current = scores.get(category_id);
      if (!current || score > current.score) {
        scores.set(category_id, { score, matchedKeyword: keyword });
      }
    }
  }

  if (scores.size === 0) return await fallbackToOtros(userId);

  // Ganadora
  let winnerId = null;
  let winnerScore = 0;
  let winnerKeyword = null;
  for (const [id, { score, matchedKeyword }] of scores) {
    if (score > winnerScore) {
      winnerId = id;
      winnerScore = score;
      winnerKeyword = matchedKeyword;
    }
  }

  // Confianza: ratio frente al segundo
  const allScores = [...scores.values()].map((s) => s.score).sort((a, b) => b - a);
  const confidence = allScores.length === 1 ? 1 : allScores[0] / (allScores[0] + allScores[1]);

  return {
    categoryId: winnerId,
    confidence,
    matchedKeyword: winnerKeyword,
  };
}

async function fallbackToOtros(userId) {
  const { rows } = await query(
    `SELECT id FROM categories WHERE user_id = $1 AND slug = 'otros' LIMIT 1`,
    [userId]
  );
  return {
    categoryId: rows[0]?.id ?? null,
    confidence: 0,
    matchedKeyword: null,
  };
}

/**
 * Aprende de una corrección del usuario.
 * Si el usuario asignó manualmente un gasto a una categoría distinta de la sugerida,
 * incrementamos el peso de las palabras significativas de la descripción
 * para esa categoría.
 *
 * @param {string} userId
 * @param {string} description
 * @param {string} categoryId
 */
export async function learnFromExpense(userId, description, categoryId) {
  const normalized = normalizeText(description);
  if (!normalized) return;

  // Tokens significativos: palabras de 3+ chars que no sean stopwords ni números
  const stopwords = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'por', 'para',
    'una', 'uno', 'mi', 'su', 'al', 'lo',
  ]);
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopwords.has(t) && !/^\d+$/.test(t));

  if (tokens.length === 0) return;

  // El primer token suele ser el comercio — le damos más peso
  const merchantToken = tokens[0];

  // Upsert con peso incremental
  await query(
    `INSERT INTO category_keywords (user_id, category_id, keyword, weight, source)
     VALUES ($1, $2, $3, 3, 'learned')
     ON CONFLICT (user_id, keyword, category_id)
     DO UPDATE SET weight = category_keywords.weight + 1`,
    [userId, categoryId, merchantToken]
  );

  // Tokens secundarios con peso menor (solo si son específicos)
  for (const token of tokens.slice(1, 3)) {
    if (token.length >= 5) {
      await query(
        `INSERT INTO category_keywords (user_id, category_id, keyword, weight, source)
         VALUES ($1, $2, $3, 1, 'learned')
         ON CONFLICT (user_id, keyword, category_id)
         DO UPDATE SET weight = category_keywords.weight + 1`,
        [userId, categoryId, token]
      );
    }
  }
}
