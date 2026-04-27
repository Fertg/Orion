import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /categories
 */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, slug, color, icon, is_default, sort_order
       FROM categories
       WHERE user_id = $1 AND archived_at IS NULL
       ORDER BY sort_order, name`,
      [req.user.id]
    );
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^[0-9A-Fa-f]{6}$/),
  icon: z.string().max(10).nullish(),
});

/**
 * POST /categories
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, color, icon } = createSchema.parse(req.body);
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { rows } = await query(
      `INSERT INTO categories (user_id, name, slug, color, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5,
               COALESCE((SELECT MAX(sort_order)+1 FROM categories WHERE user_id = $1), 1))
       RETURNING *`,
      [req.user.id, name, slug, color, icon || null]
    );
    res.status(201).json({ category: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    next(err);
  }
});

/**
 * PATCH /categories/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).max(50).optional(),
      color: z.string().regex(/^[0-9A-Fa-f]{6}$/).optional(),
      icon: z.string().max(10).nullish().optional(),
    }).parse(req.body);

    const fields = [];
    const values = [];
    let i = 1;
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = $${i++}`);
      values.push(v);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Sin cambios' });

    values.push(req.user.id, req.params.id);
    const { rows } = await query(
      `UPDATE categories SET ${fields.join(', ')}
       WHERE user_id = $${i++} AND id = $${i}
       RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ category: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /categories/:id - soft delete (archive)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `UPDATE categories SET archived_at = NOW()
       WHERE user_id = $1 AND id = $2 AND archived_at IS NULL`,
      [req.user.id, req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
