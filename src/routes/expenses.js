import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  listExpenses,
  getDashboardData,
} from '../services/expenses.js';
import { suggestCategory } from '../services/categorization.js';

const router = express.Router();
router.use(requireAuth);

const createSchema = z.object({
  description: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid().nullish(),
  notes: z.string().max(500).nullish(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amountCents: z.number().int().positive().optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  categoryId: z.string().uuid().optional(),
  notes: z.string().max(500).nullable().optional(),
});

/**
 * GET /expenses?from=&to=&categoryId=&search=&limit=&offset=
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to, categoryId, search, limit, offset } = req.query;
    const result = await listExpenses(req.user.id, {
      from: from || null,
      to: to || null,
      categoryId: categoryId || null,
      search: search || null,
      limit: limit ? Math.min(parseInt(limit, 10), 500) : 200,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /expenses
 */
router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await createExpense({
      userId: req.user.id,
      description: data.description,
      amountCents: data.amountCents,
      occurredAt: data.occurredAt,
      categoryId: data.categoryId || null,
      notes: data.notes || null,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /expenses/suggest - sin crear, solo sugiere categoría
 * Body: { description: string }
 */
router.post('/suggest', async (req, res, next) => {
  try {
    const { description } = z.object({ description: z.string().min(1) }).parse(req.body);
    const suggestion = await suggestCategory(req.user.id, description);
    res.json(suggestion);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /expenses/:id
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updates = {};
    if (data.description !== undefined) updates.description = data.description;
    if (data.amountCents !== undefined) updates.amount_cents = data.amountCents;
    if (data.occurredAt !== undefined) updates.occurred_at = data.occurredAt;
    if (data.categoryId !== undefined) updates.category_id = data.categoryId;
    if (data.notes !== undefined) updates.notes = data.notes;

    const updated = await updateExpense(req.user.id, req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json({ expense: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /expenses/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deleteExpense(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /expenses/dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const data = await getDashboardData(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
