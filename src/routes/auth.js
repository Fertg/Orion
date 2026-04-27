import express from 'express';
import { z } from 'zod';
import { verifyGoogleIdToken, signJwt } from '../services/auth.js';
import { findOrCreateUser } from '../services/users.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const googleSchema = z.object({
  idToken: z.string().min(10),
});

/**
 * POST /auth/google
 * Body: { idToken: string }
 * El frontend obtiene el idToken con Google Identity Services
 * y lo manda aquí. Devolvemos JWT + datos del usuario.
 */
router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = googleSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(idToken);
    const user = await findOrCreateUser({
      provider: 'google',
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    });
    const token = signJwt(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        currency: user.currency,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me - datos del usuario autenticado
 */
router.get('/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatar_url,
    currency: u.currency,
  });
});

export default router;
