import express from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  togglePauseRecurring,
  upcomingRecurring,
} from '../services/recurring.js';

const router = express.Router();
router.use(requireAuth);

const createSchema = z.object({
  description: z.string().min(1).max(100),
  amountCents: z.number().int().positive(),
  dayOfMonth: z.number().int().min(1).max(31),
  categoryId: z.string().uuid().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const updateSchema = z.object({
  description: z.string().min(1).max(100).optional(),
  amountCents: z.number().int().positive().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const recurring = await listRecurring(req.user.id);
    res.json({ recurring });
  } catch (err) {
    next(err);
  }
});

router.get('/upcoming', async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : 30;
    const upcoming = await upcomingRecurring(req.user.id, days);
    res.json({ upcoming });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await createRecurring(req.user.id, data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const result = await updateRecurring(req.user.id, req.params.id, data);
    if (!result) return res.status(404).json({ error: 'No encontrado' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle', async (req, res, next) => {
  try {
    const result = await togglePauseRecurring(req.user.id, req.params.id);
    if (!result) return res.status(404).json({ error: 'No encontrado' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deleteRecurring(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
