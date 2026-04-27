/**
 * Convierte céntimos a string formateado en EUR.
 * 4730 -> "47,30 €"
 */
export function formatEur(cents, { withSymbol = true, withCents = true } = {}) {
  if (cents == null) return withSymbol ? '— €' : '—';
  const value = cents / 100;
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(value);
  return withSymbol ? `${formatted} €` : formatted;
}

/**
 * 4730 -> { integer: "47", decimal: "30" }
 * Útil para tipografía con tamaños distintos
 */
export function splitEur(cents) {
  if (cents == null) return { integer: '—', decimal: '00' };
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const integer = Math.floor(abs / 100);
  const decimal = String(abs % 100).padStart(2, '0');
  return {
    integer: sign + new Intl.NumberFormat('es-ES').format(integer),
    decimal,
  };
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const MONTHS_ES_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

/**
 * "2026-04-25" -> "25 abr"
 */
export function formatDateShort(yyyymmdd) {
  if (!yyyymmdd) return '';
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return `${d} ${MONTHS_ES_SHORT[m - 1]}`;
}

/**
 * "2026-04-25" -> "25 de abril"
 */
export function formatDateLong(yyyymmdd) {
  if (!yyyymmdd) return '';
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  return `${d} de ${MONTHS_ES[m - 1]}`;
}

/**
 * Devuelve "abril 2026" para el mes actual
 */
export function currentMonthLabel() {
  const d = new Date();
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * "2026-04-25" -> "Hoy" / "Ayer" / "25 abr"
 */
export function formatDateRelative(yyyymmdd) {
  if (!yyyymmdd) return '';
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (yyyymmdd === todayStr) return 'Hoy';
  if (yyyymmdd === yesterdayStr) return 'Ayer';
  return formatDateShort(yyyymmdd);
}

/**
 * Fecha local en formato YYYY-MM-DD (sin desfase de zona horaria)
 */
export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Convierte string como "47,30" o "47.30" a céntimos.
 * Devuelve null si no es válido.
 */
export function parseAmountToCents(str) {
  if (!str) return null;
  const normalized = String(str).replace(',', '.').trim();
  const num = Number(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}
