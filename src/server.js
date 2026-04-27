import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import expensesRoutes from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';

const app = express();

// Railway pone un proxy delante. Confiamos en el primer hop
// para que rate-limit y otras libs lean bien la IP del cliente.
app.set('trust proxy', 1);

app.use(cors({limit: '1mb' }));

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

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`✦ Orion API en http://localhost:${config.port} [${config.nodeEnv}]`);
});
