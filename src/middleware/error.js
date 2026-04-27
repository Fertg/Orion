import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors,
    });
  }

  console.error('[error]', err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno',
  });
}
