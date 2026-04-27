import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import './Settings.css';

export function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { categories } = await api.listCategories();
      setCategories(categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('¿Archivar esta categoría? Los gastos asociados quedarán sin categoría.')) return;
    await api.deleteCategory(id);
    load();
  };

  if (loading) return <div className="loading">Cargando</div>;

  return (
    <div className="settings fade-in">
      <header className="settings-header">
        <h1 className="settings-title">Ajustes</h1>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="settings-section">
        <div className="section-head">
          <h2 className="section-title">Categorías</h2>
          <button className="btn-ghost section-action" onClick={() => setCreating(true)}>
            + Nueva
          </button>
        </div>

        <ul className="cat-settings-list">
          {categories.map((c) => (
            <li key={c.id} className="cat-settings-row">
              <span className="cat-dot" style={{ background: `#${c.color}` }} />
              <span className="cat-settings-name">{c.name}</span>
              {c.is_default && <span className="cat-default-badge">por defecto</span>}
              <button
                className="cat-settings-delete"
                onClick={() => handleDelete(c.id)}
                title="Archivar"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      {creating && (
        <NewCategoryForm
          onCancel={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewCategoryForm({ onCancel, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('8B8B8B');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      await api.createCategory({ name, color });
      onCreated();
    } catch (error) {
      setErr(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const palette = [
    '7B6F47', '4A5568', 'A8472C', '5D6B5C', '8B6F8E',
    'B8893E', '4A6670', '6B7B8C', 'A06B7E', '5C6B47',
  ];

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">Nueva categoría</h2>

        <label className="label">Nombre</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          maxLength={50}
        />

        <label className="label" style={{ marginTop: 'var(--s-4)' }}>Color</label>
        <div className="color-grid">
          {palette.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`color-swatch ${color === hex ? 'selected' : ''}`}
              style={{ background: `#${hex}` }}
              onClick={() => setColor(hex)}
            />
          ))}
        </div>

        {err && <div className="error-banner" style={{ marginTop: 'var(--s-3)' }}>{err}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !name}>
            {submitting ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </div>
  );
}
