import { useState, useRef, useEffect, useCallback } from 'react';
import { parseExpenseInput } from '../utils/parseExpense.js';
import { formatEur, formatDateRelative } from '../utils/format.js';
import { api } from '../api/client.js';
import './QuickExpense.css';

export function QuickExpense({ categories, onCreated }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const inputRef = useRef(null);

  // Re-parsea con cada cambio
  useEffect(() => {
    const result = parseExpenseInput(text);
    setParsed(result);
    if (!result) {
      setSuggestion(null);
      setSelectedCategoryId(null);
    }
  }, [text]);

  // Pide sugerencia cuando hay descripción válida (debounced)
  useEffect(() => {
    if (!parsed?.description || parsed.description === 'Gasto') {
      setSuggestion(null);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const sug = await api.suggestCategory(parsed.description);
        setSuggestion(sug);
        setSelectedCategoryId(sug.categoryId);
      } catch {
        setSuggestion(null);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [parsed?.description]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (!parsed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.createExpense({
        description: parsed.description,
        amountCents: parsed.amountCents,
        occurredAt: parsed.occurredAt,
        categoryId: selectedCategoryId || undefined,
      });
      setText('');
      setSuggestion(null);
      setSelectedCategoryId(null);
      inputRef.current?.focus();
      onCreated?.();
    } catch (err) {
      setError(err.message || 'No se pudo crear');
    } finally {
      setSubmitting(false);
    }
  }, [parsed, selectedCategoryId, submitting, onCreated]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="quick-expense">
      <div className="quick-expense-row">
        <span className="prompt-char mono">›</span>
        <input
          ref={inputRef}
          className="quick-input mono"
          placeholder="Mercadona 47,30 ayer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {parsed && (
          <button
            className="quick-submit"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '...' : 'Añadir ↵'}
          </button>
        )}
      </div>

      {parsed && (
        <div className="quick-preview fade-in">
          <div className="preview-line">
            <span className="preview-label">Importe</span>
            <span className="preview-value mono tabular">{formatEur(parsed.amountCents)}</span>
          </div>
          <div className="preview-line">
            <span className="preview-label">Concepto</span>
            <span className="preview-value">{parsed.description}</span>
          </div>
          <div className="preview-line">
            <span className="preview-label">Fecha</span>
            <span className="preview-value">{formatDateRelative(parsed.occurredAt)}</span>
          </div>
          <div className="preview-line">
            <span className="preview-label">Categoría</span>
            <CategoryPicker
              categories={categories}
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              selected={selectedCategory}
              suggested={suggestion?.categoryId === selectedCategoryId && suggestion?.matchedKeyword}
            />
          </div>
        </div>
      )}

      {error && <div className="error-banner" style={{ marginTop: 'var(--s-3)' }}>{error}</div>}

      <div className="quick-hint">
        <kbd>Mercadona 47,30 ayer</kbd>
        <span>·</span>
        <kbd>Repsol 60</kbd>
        <span>·</span>
        <kbd>cafe 2,5 hace 3 dias</kbd>
      </div>
    </div>
  );
}

function CategoryPicker({ categories, value, onChange, selected, suggested }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="cat-picker">
      <button
        className="cat-picker-current"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {selected ? (
          <>
            <span className="cat-dot" style={{ background: `#${selected.color}` }} />
            <span>{selected.name}</span>
            {suggested && <span className="suggested-badge">sugerida</span>}
          </>
        ) : (
          <span className="cat-picker-placeholder">elegir…</span>
        )}
        <span className="cat-picker-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="cat-picker-menu">
          {categories.map((c) => (
            <button
              key={c.id}
              className="cat-picker-item"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              type="button"
            >
              <span className="cat-dot" style={{ background: `#${c.color}` }} />
              <span>{c.name}</span>
              {c.id === value && <span className="cat-picker-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
