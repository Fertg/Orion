import { query } from '../db/index.js';
import { extractMerchant, normalizeText } from '../utils/text.js';
import { suggestCategory, learnFromExpense } from './categorization.js';

/**
 * Crea un gasto. Si no se pasa categoryId, lo sugiere automáticamente.
 */
export async function createExpense({
  userId,
  description,
  amountCents,
  occurredAt,
  categoryId = null,
  notes = null,
  source = 'manual',
}) {
  let finalCategoryId = categoryId;
  let suggestion = null;

  if (!finalCategoryId) {
    suggestion = await suggestCategory(userId, description);
    finalCategoryId = suggestion.categoryId;
  }

  const merchant = extractMerchant(description);

  const { rows } = await query(
    `INSERT INTO expenses
       (user_id, category_id, amount_cents, description, merchant, occurred_at, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, finalCategoryId, amountCents, description, merchant, occurredAt, source, notes]
  );

  // Si el usuario eligió la categoría manualmente y es distinta de la sugerida,
  // aprendemos. También si no había sugerencia previa, aprendemos.
  if (categoryId) {
    await learnFromExpense(userId, description, finalCategoryId);
  }

  return { expense: rows[0], suggestion };
}

export async function updateExpense(userId, expenseId, updates) {
  const allowed = ['category_id', 'amount_cents', 'description', 'occurred_at', 'notes'];
  const fields = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) return null;

  values.push(userId, expenseId);
  const { rows } = await query(
    `UPDATE expenses SET ${fields.join(', ')}
     WHERE user_id = $${i++} AND id = $${i}
     RETURNING *`,
    values
  );

  // Si cambió la categoría, aprende
  if (updates.category_id && rows[0]) {
    await learnFromExpense(userId, rows[0].description, updates.category_id);
  }

  return rows[0] || null;
}

export async function deleteExpense(userId, expenseId) {
  const { rowCount } = await query(
    `DELETE FROM expenses WHERE user_id = $1 AND id = $2`,
    [userId, expenseId]
  );
  return rowCount > 0;
}

/**
 * Lista de gastos paginada.
 */
export async function listExpenses(userId, { limit = 50, offset = 0, from = null, to = null } = {}) {
  const params = [userId];
  let where = `e.user_id = $1`;
  if (from) {
    params.push(from);
    where += ` AND e.occurred_at >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND e.occurred_at <= $${params.length}`;
  }
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT e.*, c.name AS category_name, c.color AS category_color, c.slug AS category_slug
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE ${where}
     ORDER BY e.occurred_at DESC, e.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows;
}

/**
 * Datos del dashboard: total mes, total mes anterior,
 * ritmo diario actual vs proyectado, distribución por categoría.
 */
export async function getDashboardData(userId, referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const yyyy = ref.getUTCFullYear();
  const mm = ref.getUTCMonth();

  const startOfMonth = new Date(Date.UTC(yyyy, mm, 1));
  const startOfNextMonth = new Date(Date.UTC(yyyy, mm + 1, 1));
  const startOfPrevMonth = new Date(Date.UTC(yyyy, mm - 1, 1));

  const today = new Date(Date.UTC(yyyy, mm, ref.getUTCDate()));
  const daysElapsed = Math.max(1, today.getUTCDate());
  const daysInMonth = new Date(Date.UTC(yyyy, mm + 1, 0)).getUTCDate();

  // Total mes en curso
  const currentMonth = await query(
    `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
     FROM expenses
     WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3`,
    [userId, startOfMonth.toISOString().slice(0, 10), startOfNextMonth.toISOString().slice(0, 10)]
  );

  // Total mes anterior
  const prevMonth = await query(
    `SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total
     FROM expenses
     WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3`,
    [userId, startOfPrevMonth.toISOString().slice(0, 10), startOfMonth.toISOString().slice(0, 10)]
  );

  // Distribución por categoría del mes actual
  const byCategory = await query(
    `SELECT c.id, c.name, c.slug, c.color,
            COALESCE(SUM(e.amount_cents), 0)::bigint AS total,
            COUNT(e.id)::int AS count
     FROM categories c
     LEFT JOIN expenses e
       ON e.category_id = c.id
       AND e.occurred_at >= $2
       AND e.occurred_at < $3
     WHERE c.user_id = $1 AND c.archived_at IS NULL
     GROUP BY c.id
     HAVING COALESCE(SUM(e.amount_cents), 0) > 0 OR c.is_default
     ORDER BY total DESC, c.sort_order ASC`,
    [userId, startOfMonth.toISOString().slice(0, 10), startOfNextMonth.toISOString().slice(0, 10)]
  );

  // Gasto diario del mes (para gráfico de ritmo)
  const dailyTotals = await query(
    `SELECT occurred_at::text AS day, SUM(amount_cents)::bigint AS total
     FROM expenses
     WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at < $3
     GROUP BY occurred_at
     ORDER BY occurred_at`,
    [userId, startOfMonth.toISOString().slice(0, 10), startOfNextMonth.toISOString().slice(0, 10)]
  );

  const currentTotal = Number(currentMonth.rows[0].total);
  const prevTotal = Number(prevMonth.rows[0].total);

  // Proyección: ritmo actual extrapolado al final del mes
  const projectedTotal = Math.round((currentTotal / daysElapsed) * daysInMonth);

  return {
    period: {
      year: yyyy,
      month: mm + 1, // human-readable
      daysElapsed,
      daysInMonth,
    },
    currentMonth: {
      totalCents: currentTotal,
      projectedTotalCents: projectedTotal,
      dailyAverageCents: Math.round(currentTotal / daysElapsed),
    },
    previousMonth: {
      totalCents: prevTotal,
    },
    deltaVsPreviousPct: prevTotal === 0 ? null : ((currentTotal - prevTotal) / prevTotal) * 100,
    byCategory: byCategory.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      color: r.color,
      totalCents: Number(r.total),
      count: r.count,
    })),
    dailyTotals: dailyTotals.rows.map((r) => ({
      day: r.day,
      totalCents: Number(r.total),
    })),
  };
}
