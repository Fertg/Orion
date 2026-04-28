import { useState, useEffect, useRef } from 'react';
import { todayIso } from '../utils/format.js';
import './DatePicker.css';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Componente DatePicker minimal.
 *
 * @param {string} value - fecha en formato YYYY-MM-DD
 * @param {(value: string) => void} onChange
 * @param {() => void} onClose - se llama al cerrar el picker (ESC o click fuera)
 * @param {string} [maxDate] - fecha máxima seleccionable (YYYY-MM-DD), por defecto hoy
 * @param {string} [minDate] - fecha mínima seleccionable
 */
export function DatePicker({ value, onChange, onClose, maxDate = todayIso(), minDate }) {
  // Mes que se está visualizando (puede ser distinto del seleccionado)
  const initialDate = value ? parseIso(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const containerRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    // Pequeño delay para que no se cierre en el click que lo abre
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Cerrar con ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelect = (day) => {
    const iso = formatIso(viewYear, viewMonth, day);
    onChange(iso);
  };

  const days = buildMonthMatrix(viewYear, viewMonth);
  const todayStr = todayIso();

  return (
    <div className="datepicker" ref={containerRef}>
      <header className="dp-header">
        <button
          type="button"
          className="dp-nav"
          onClick={handlePrev}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <div className="dp-month">
          {MONTHS[viewMonth]} <span className="dp-year mono">{viewYear}</span>
        </div>
        <button
          type="button"
          className="dp-nav"
          onClick={handleNext}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </header>

      <div className="dp-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="dp-weekday">{w}</div>
        ))}
      </div>

      <div className="dp-grid">
        {days.map((day, i) => {
          if (day === null) return <div key={i} className="dp-day dp-empty" />;
          const iso = formatIso(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === todayStr;
          const isDisabled = (maxDate && iso > maxDate) || (minDate && iso < minDate);
          return (
            <button
              key={i}
              type="button"
              className={[
                'dp-day',
                isSelected && 'dp-selected',
                isToday && !isSelected && 'dp-today',
                isDisabled && 'dp-disabled',
              ].filter(Boolean).join(' ')}
              onClick={() => !isDisabled && handleSelect(day)}
              disabled={isDisabled}
            >
              {day}
            </button>
          );
        })}
      </div>

      <footer className="dp-footer">
        <button
          type="button"
          className="dp-shortcut"
          onClick={() => {
            onChange(todayStr);
          }}
        >
          Hoy
        </button>
        <button
          type="button"
          className="dp-shortcut"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            onChange(d.toISOString().slice(0, 10));
          }}
        >
          Ayer
        </button>
      </footer>
    </div>
  );
}

/* ============= Helpers ============= */

function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Devuelve un array de 42 posiciones (6 semanas x 7 días).
 * Las posiciones vacías al inicio/fin son null.
 * Lunes como primer día.
 */
function buildMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // getDay(): domingo=0 ... sábado=6. Queremos lunes=0 ... domingo=6.
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const matrix = [];
  for (let i = 0; i < firstWeekday; i++) matrix.push(null);
  for (let d = 1; d <= daysInMonth; d++) matrix.push(d);
  while (matrix.length < 42) matrix.push(null);
  return matrix;
}
