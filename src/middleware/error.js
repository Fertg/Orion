import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors,
    });
  }

  // Log explícito de la ruta que falló — ayuda a diagnosticar en producción
  console.error(`[error] ${req.method} ${req.path}`);
  console.error(err.stack || err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno',
    path: req.path,
  });
}

/**
 * Captura errores async no capturados en handlers de Express.
 * Se importa y se registra al final, después de las rutas.
 */
export function asyncErrorBoundary() {
  // Captura promesas rechazadas que se escapen
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
  });
}
