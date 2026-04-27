import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';

const googleClient = new OAuth2Client(config.google.clientId);

/**
 * Verifica un ID token de Google emitido en el frontend.
 * Devuelve el payload con email, sub (id), name, picture.
 */
export async function verifyGoogleIdToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email_verified) {
    throw new Error('Email de Google no verificado');
  }
  return {
    providerId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    avatarUrl: payload.picture || null,
  };
}

export function signJwt(userId) {
  return jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

export function verifyJwt(token) {
  return jwt.verify(token, config.jwt.secret);
}
