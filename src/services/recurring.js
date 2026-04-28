import { query, withTransaction } from '../db/index.js';

/**
 * Lista todas las suscripciones del usuario, activas y pausadas.
 */
export async function listRecurring(userId) {
  const { rows } = await query(
    `SELECT r.id, r.description, r.amount_cents, r.currency, r.day_of_month,
            r.start_date::text AS start_date,
            r.end_date::text AS end_date,
            r.paused_at,
            r.last_generated_for::text AS last_generated_for,
            r.category_id,
            c.name AS category_name, c.color AS category_color, c.slug AS category_slug,
            r.created_at
     FROM recurring_expenses r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = $1
     ORDER BY r.paused_at NULLS FIRST, r.day_of_month, r.description`,
    [userId]
  );
  return rows;
}

export async function createRecurring(userId, data) {
  const { rows } = await query(
    `INSERT INTO recurring_expenses
       (user_id, category_id, description, amount_cents, day_of_month, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7)
     RETURNING id`,
    [
      userId,
      data.categoryId || null,
      data.description,
      data.amountCents,
      data.dayOfMonth,
      data.startDate || null,
      data.endDate || null,
    ]
  );
  return rows[0];
}

export async function updateRecurring(userId, id, data) {
  const allowed = {
    category_id: data.categoryId,
    description: data.description,
    amount_cents: data.amountCents,
    day_of_month: data.dayOfMonth,
    end_date: data.endDate,
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(allowed)) {
    if (value !== undefined) {
      fields.push(`${key} = $${i++}`);
      values.push(value);
    }
  }
  if (fields.length === 0) return null;
  values.push(userId, id);
  const { rows } = await query(
    `UPDATE recurring_expenses SET ${fields.join(', ')}
     WHERE user_id = $${i++} AND id = $${i}
     RETURNING id`,
    values
  );
  return rows[0] || null;
}

export async function deleteRecurring(userId, id) {
  const { rowCount } = await query(
    `DELETE FROM recurring_expenses WHERE user_id = $1 AND id = $2`,
    [userId, id]
  );
  return rowCount > 0;
}

export async function togglePauseRecurring(userId, id) {
  const { rows } = await query(
    `UPDATE recurring_expenses
     SET paused_at = CASE WHEN paused_at IS NULL THEN NOW() ELSE NULL END
     WHERE user_id = $1 AND id = $2
     RETURNING id, paused_at`,
    [userId, id]
  );
  return rows[0] || null;
}

/**
 * Devuelve los próximos cargos previstos en los próximos N días.
 * Útil para el dashboard.
 */
export async function upcomingRecurring(userId, daysAhead = 30) {
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);

  // Para cada suscripción activa, calculamos su próxima fecha de cobro
  const { rows } = await query(
    `SELECT id, description, amount_cents, day_of_month, category_id,
            (SELECT name FROM categories WHERE id = r.category_id) AS category_name,
            (SELECT color FROM categories WHERE id = r.category_id) AS category_color
     FROM recurring_expenses r
     WHERE user_id = $1
       AND paused_at IS NULL
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
    [userId]
  );

  // Calcular próxima fecha en JS (más simple que en SQL)
  const upcoming = rows.map((r) => ({
    ...r,
    nextDate: nextOccurrence(r.day_of_month, today),
  })).filter((r) => r.nextDate <= end);

  upcoming.sort((a, b) => a.nextDate - b.nextDate);

  return upcoming.map((r) => ({
    id: r.id,
    description: r.description,
    amount_cents: r.amount_cents,
    day_of_month: r.day_of_month,
    category_id: r.category_id,
    category_name: r.category_name,
    category_color: r.category_color,
    next_date: r.nextDate.toISOString().slice(0, 10),
  }));
}

/**
 * Calcula la próxima ocurrencia de "día X del mes" desde una fecha dada.
 * Si X ya pasó este mes, devuelve el del mes siguiente.
 * Si X > días del mes (ej: 31 en febrero), usa el último día disponible.
 */
function nextOccurrence(dayOfMonth, fromDate) {
  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);

  // Probar este mes
  const thisMonthLast = lastDayOfMonth(result.getFullYear(), result.getMonth());
  const thisMonthDay = Math.min(dayOfMonth, thisMonthLast);
  const candidate = new Date(result.getFullYear(), result.getMonth(), thisMonthDay);

  if (candidate >= result) return candidate;

  // Mes siguiente
  const nextMonthLast = lastDayOfMonth(result.getFullYear(), result.getMonth() + 1);
  const nextMonthDay = Math.min(dayOfMonth, nextMonthLast);
  return new Date(result.getFullYear(), result.getMonth() + 1, nextMonthDay);
}

function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Generador automático: para cada suscripción activa, crea los gastos
 * que correspondan desde la última generación hasta hoy.
 *
 * Idempotente: usa last_generated_for para no duplicar.
 *
 * Se llama al arrancar el server y opcionalmente cada N horas.
 */
export async function generateDueRecurringExpenses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { rows: subs } = await query(
    `SELECT id, user_id, category_id, description, amount_cents, day_of_month,
            start_date, end_date,
            last_generated_for
     FROM recurring_expenses
     WHERE paused_at IS NULL
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`
  );

  let created = 0;
  for (const sub of subs) {
    try {
      const events = computePendingEvents(sub, today);
      for (const eventDate of events) {
        await withTransaction(async (client) => {
          // Crear el gasto
          await client.query(
            `INSERT INTO expenses
               (user_id, category_id, amount_cents, description, occurred_at, source)
             VALUES ($1, $2, $3, $4, $5, 'manual')`,
            [
              sub.user_id,
              sub.category_id,
              sub.amount_cents,
              sub.description,
              eventDate.toISOString().slice(0, 10),
            ]
          );
          // Marcar como generado para ese mes (1er día)
          const monthMark = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1)
            .toISOString().slice(0, 10);
          await client.query(
            `UPDATE recurring_expenses SET last_generated_for = $2 WHERE id = $1`,
            [sub.id, monthMark]
          );
        });
        created++;
      }
    } catch (err) {
      console.error(`[recurring] Error generando ${sub.id}:`, err.message);
    }
  }

  if (created > 0) {
    console.log(`[recurring] Generados ${created} gasto(s) de suscripciones`);
  }
  return created;
}

/**
 * Calcula qué eventos faltan por crear para una suscripción.
 * Considera desde el "mes siguiente al último generado" hasta hoy.
 */
function computePendingEvents(sub, today) {
  const startDate = new Date(sub.start_date);
  startDate.setHours(0, 0, 0, 0);

  // Punto de partida: el mes siguiente al último generado, o el mes de start_date
  let cursor;
  if (sub.last_generated_for) {
    const last = new Date(sub.last_generated_for);
    cursor = new Date(last.getFullYear(), last.getMonth() + 1, 1);
  } else {
    cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  }

  const events = [];
  const endLimit = sub.end_date ? new Date(sub.end_date) : today;
  const upperBound = endLimit < today ? endLimit : today;

  while (cursor <= upperBound) {
    const lastDay = lastDayOfMonth(cursor.getFullYear(), cursor.getMonth());
    const day = Math.min(sub.day_of_month, lastDay);
    const eventDate = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate >= startDate && eventDate <= upperBound) {
      events.push(eventDate);
    }
    // Avanzar al siguiente mes
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return events;
}
