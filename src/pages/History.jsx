import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { formatEur, formatDateLong, formatDateRelative } from '../utils/format.js';
import './History.css';

export function HistoryPage() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([
        api.listExpenses({ limit: 200 }),
        api.listCategories(),
      ]);
      setExpenses(list.expenses);
      setCategories(cats.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChangeCategory = async (id, categoryId) => {
    await api.updateExpense(id, { categoryId });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.deleteExpense(id);
    load();
  };

  if (loading) return <div className="loading">Cargando</div>;
  if (error) return <div className="error-banner">{error}</div>;

  // Agrupar por día
  const byDay = expenses.reduce((acc, e) => {
    (acc[e.occurred_at] ||= []).push(e);
    return acc;
  }, {});

  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  return (
    <div className="history fade-in">
      <header className="history-header">
        <h1 className="history-title">Histórico</h1>
        <div className="history-count mono">
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'}
        </div>
      </header>

      {days.length === 0 ? (
        <div className="empty-state">No hay gastos registrados todavía.</div>
      ) : (
        <div className="history-list">
          {days.map((day) => {
            const dayTotal = byDay[day].reduce((s, e) => s + Number(e.amount_cents), 0);
            return (
              <section key={day} className="day-group">
                <header className="day-header">
                  <div className="day-name">{formatDateRelative(day)}</div>
                  <div className="day-date">{formatDateLong(day)}</div>
                  <div className="day-total mono tabular">{formatEur(dayTotal)}</div>
                </header>
                <ul className="exp-list">
                  {byDay[day].map((e) => (
                    <ExpenseRow
                      key={e.id}
                      expense={e}
                      categories={categories}
                      onChangeCategory={(catId) => handleChangeCategory(e.id, catId)}
                      onDelete={() => handleDelete(e.id)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ expense, categories, onChangeCategory, onDelete }) {
  const [editingCat, setEditingCat] = useState(false);

  return (
    <li className="exp-row">
      <span
        className="cat-dot"
        style={{ background: `#${expense.category_color || '8B8B8B'}` }}
      />
      <div className="exp-desc">{expense.description}</div>
      <button
        className="exp-cat"
        onClick={() => setEditingCat((v) => !v)}
        type="button"
      >
        {expense.category_name || 'Otros'}
      </button>
      <div className="exp-amount mono tabular">{formatEur(expense.amount_cents)}</div>
      <button
        className="exp-delete"
        onClick={onDelete}
        title="Eliminar"
        type="button"
      >
        ×
      </button>

      {editingCat && (
        <div className="exp-cat-menu">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onChangeCategory(c.id);
                setEditingCat(false);
              }}
              className="exp-cat-option"
              type="button"
            >
              <span className="cat-dot" style={{ background: `#${c.color}` }} />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
