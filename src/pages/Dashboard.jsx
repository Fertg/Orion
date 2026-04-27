import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { QuickExpense } from '../components/QuickExpense.jsx';
import {
  formatEur,
  splitEur,
  currentMonthLabel,
} from '../utils/format.js';
import './Dashboard.css';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [dash, cats] = await Promise.all([
        api.dashboard(),
        api.listCategories(),
      ]);
      setData(dash);
      setCategories(cats.categories);
      setError(null);
    } catch (err) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="loading" style={{ padding: 'var(--s-7)' }}>Cargando</div>;
  }
  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!data) return null;

  return (
    <div className="dashboard fade-in">
      <header className="dashboard-header">
        <div className="month-label">{currentMonthLabel()}</div>
      </header>

      <QuickExpense categories={categories} onCreated={load} />

      <BigNumber data={data} />

      <div className="dashboard-grid">
        <PaceSection data={data} />
        <CategoryBreakdown data={data} />
      </div>
    </div>
  );
}

/* ============ Big number — el gasto del mes ============ */
function BigNumber({ data }) {
  const { integer, decimal } = splitEur(data.currentMonth.totalCents);
  const delta = data.deltaVsPreviousPct;
  const hasDelta = delta !== null && Number.isFinite(delta);

  return (
    <section className="big-number">
      <div className="big-number-label">Gasto del mes</div>
      <div className="big-number-value mono tabular">
        <span className="big-int">{integer}</span>
        <span className="big-dec">,{decimal} €</span>
      </div>
      {hasDelta && (
        <div className={`big-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%{' '}
          <span className="big-delta-label">vs mes anterior</span>
        </div>
      )}
    </section>
  );
}

/* ============ Ritmo diario y proyección ============ */
function PaceSection({ data }) {
  const { currentMonth, period, dailyTotals } = data;
  const projected = currentMonth.projectedTotalCents;
  const elapsed = period.daysElapsed;
  const total = period.daysInMonth;
  const elapsedPct = (elapsed / total) * 100;

  // Línea horizontal con marcas diarias
  const maxDay = Math.max(1, ...dailyTotals.map((d) => d.totalCents));

  return (
    <section className="panel-block">
      <h2 className="block-title">Ritmo</h2>

      <div className="pace-stats">
        <div className="stat">
          <div className="stat-label">Diario medio</div>
          <div className="stat-value mono tabular">
            {formatEur(currentMonth.dailyAverageCents, { withCents: false })}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Proyección fin de mes</div>
          <div className="stat-value mono tabular">
            {formatEur(projected, { withCents: false })}
          </div>
        </div>
      </div>

      {/* Mini-gráfico de barras del mes */}
      <div className="pace-chart" aria-label="Gasto diario del mes">
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const dayStr = `${period.year}-${String(period.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const point = dailyTotals.find((d) => d.day === dayStr);
          const value = point?.totalCents || 0;
          const heightPct = maxDay > 0 ? (value / maxDay) * 100 : 0;
          const isFuture = day > elapsed;
          return (
            <div
              key={day}
              className={`pace-bar ${isFuture ? 'future' : ''}`}
              style={{ height: `${heightPct}%` }}
              title={value > 0 ? `${formatEur(value)} · día ${day}` : `día ${day}`}
            />
          );
        })}
      </div>

      <div className="pace-axis">
        <span>1</span>
        <span>{Math.floor(total / 2)}</span>
        <span>{total}</span>
      </div>

      <div className="pace-progress">
        <div className="pace-progress-bar">
          <div
            className="pace-progress-fill"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
        <div className="pace-progress-text">
          Día {elapsed} de {total}
        </div>
      </div>
    </section>
  );
}

/* ============ Distribución por categoría ============ */
function CategoryBreakdown({ data }) {
  const total = data.currentMonth.totalCents;
  const items = data.byCategory.filter((c) => c.totalCents > 0);

  return (
    <section className="panel-block">
      <h2 className="block-title">Por categoría</h2>

      {items.length === 0 ? (
        <div className="empty-state">
          Aún no hay gastos este mes
        </div>
      ) : (
        <ul className="cat-list">
          {items.map((c) => {
            const pct = total > 0 ? (c.totalCents / total) * 100 : 0;
            return (
              <li key={c.id} className="cat-row">
                <div className="cat-row-head">
                  <div className="cat-row-name">
                    <span className="cat-dot" style={{ background: `#${c.color}` }} />
                    <span>{c.name}</span>
                    <span className="cat-row-count mono">{c.count}</span>
                  </div>
                  <div className="cat-row-amount mono tabular">
                    {formatEur(c.totalCents, { withCents: false })}
                  </div>
                </div>
                <div className="cat-row-bar">
                  <div
                    className="cat-row-fill"
                    style={{ width: `${pct}%`, background: `#${c.color}` }}
                  />
                </div>
                <div className="cat-row-pct mono">{pct.toFixed(0)}%</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
