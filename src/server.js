import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler, asyncErrorBoundary } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';
import budgetsRoutes from './routes/budgets.js';
import recurringRoutes from './routes/recurring.js';
import { generateDueRecurringExpenses } from './services/recurring.js';

asyncErrorBoundary();

const app = express();

// Railway pone un proxy delante. Confiamos en el primer hop
// para que rate-limit y otras libs lean bien la IP del cliente.
app.set('trust proxy', 1);

// CORS — admite varios orígenes separados por coma en FRONTEND_URL,
// y también acepta peticiones sin origen (curl, health checks).
const allowedOrigins = config.frontendUrl
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

console.log(`[cors] Orígenes permitidos: ${allowedOrigins.join(', ')}`);

app.use(cors({
  origin: (origin, callback) => {
    // Sin origen (curl, server-to-server) → permitir
    if (!origin) return callback(null, true);

    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    console.warn(`[cors] Bloqueado: ${origin} (esperado: ${allowedOrigins.join(', ')})`);
    callback(new Error(`Origen no permitido: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Logger simple — útil para diagnosticar en producción
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Rate limit general
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Health
app.get('/health', (req, res) => res.json({ ok: true, service: 'orion-api' }));

// Rutas
app.use('/auth', authRoutes);
app.use('/expenses', expensesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/budgets', budgetsRoutes);
app.use('/recurring', recurringRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`✦ Orion API en http://localhost:${config.port} [${config.nodeEnv}]`);

  // Generar suscripciones pendientes al arrancar
  generateDueRecurringExpenses().catch((err) => {
    console.error('[recurring] Error en generación inicial:', err);
  });

  // Y reintentar cada 6 horas — barato y suficiente para una app personal
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    generateDueRecurringExpenses().catch((err) => {
      console.error('[recurring] Error en generación periódica:', err);
    });
  }, SIX_HOURS);
});
