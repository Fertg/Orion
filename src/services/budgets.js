import { query } from '../db/index.js';

/**
 * Devuelve los presupuestos vigentes del usuario.
 * - global (categoryId NULL) y/o por categoría
 * - vigente = effective_from <= hoy AND (effective_to IS NULL OR >= hoy)
 */
export async function listBudgets(userId) {
  const { rows } = await query(
    `SELECT b.id, b.category_id, b.monthly_cents, b.currency,
            b.effective_from::text AS effective_from,
            b.effective_to::text AS effective_to,
            c.name AS category_name, c.color AS category_color, c.slug AS category_slug
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = $1
       AND b.effective_from <= CURRENT_DATE
       AND (b.effective_to IS NULL OR b.effective_to >= CURRENT_DATE)
     ORDER BY b.category_id NULLS FIRST`,
    [userId]
  );
  return rows;
}

/**
 * Crea o reemplaza el presupuesto para una categoría (o global si categoryId=null).
 * Estrategia: cierra el presupuesto vigente con effective_to = ayer
 * y crea uno nuevo desde hoy.
 */
export async function setBudget(userId, { categoryId = null, monthlyCents }) {
  if (!Number.isFinite(monthlyCents) || monthlyCents <= 0) {
    throw new Error('Importe mensual inválido');
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Cerrar el vigente (si existe) — usamos IS NOT DISTINCT FROM para tratar NULL = NULL
  await query(
    `UPDATE budgets
     SET effective_to = $3
     WHERE user_id = $1
       AND category_id IS NOT DISTINCT FROM $2
       AND effective_to IS NULL`,
    [userId, categoryId, yesterday]
  );

  // Insertar el nuevo
  const { rows } = await query(
    `INSERT INTO budgets (user_id, category_id, monthly_cents, effective_from)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, categoryId, monthlyCents, today]
  );

  return { id: rows[0].id };
}

/**
 * Elimina (cierra) el presupuesto de una categoría.
 */
export async function clearBudget(userId, categoryId = null) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await query(
    `UPDATE budgets
     SET effective_to = $3
     WHERE user_id = $1
       AND category_id IS NOT DISTINCT FROM $2
       AND effective_to IS NULL`,
    [userId, categoryId, yesterday]
  );
}
