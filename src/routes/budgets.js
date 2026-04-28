import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { listBudgets, setBudget, clearBudget } from '../services/budgets.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const budgets = await listBudgets(req.user.id);
    res.json({ budgets });
  } catch (err) {
    next(err);
  }
});

const setSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  monthlyCents: z.number().int().positive(),
});

router.post('/', async (req, res, next) => {
  try {
    const data = setSchema.parse(req.body);
    const result = await setBudget(req.user.id, {
      categoryId: data.categoryId || null,
      monthlyCents: data.monthlyCents,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:categoryId?', async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId === 'global' ? null : req.params.categoryId;
    await clearBudget(req.user.id, categoryId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
