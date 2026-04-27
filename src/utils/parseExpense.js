import { todayIso } from './format.js';

/**
 * Parsea un input estilo terminal a partes estructuradas.
 *
 * Formatos aceptados:
 *   "Mercadona 47.30"            -> hoy
 *   "Mercadona 47,30 ayer"       -> ayer
 *   "Mercadona 47.30 hace 3 dias"
 *   "47.30 cafe"                 -> orden libre
 *   "Mercadona 47.30 25/04"      -> fecha explícita
 *   "Mercadona 47.30 2026-04-25"
 *
 * Devuelve { description, amountCents, occurredAt } o null si falta cantidad.
 */
export function parseExpenseInput(raw) {
  if (!raw || !raw.trim()) return null;

  let working = raw.trim().replace(/\s+/g, ' ');

  // 1. Detectar fecha relativa o explícita
  let occurredAt = todayIso();
  let dateMatched = false;

  const today = new Date();
  const setDateOffset = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    occurredAt = d.toISOString().slice(0, 10);
    dateMatched = true;
  };

  // "hoy"
  const hoyRe = /\bhoy\b/i;
  if (hoyRe.test(working)) {
    working = working.replace(hoyRe, '').trim();
    dateMatched = true;
  }

  // "ayer"
  const ayerRe = /\bayer\b/i;
  if (!dateMatched && ayerRe.test(working)) {
    setDateOffset(1);
    working = working.replace(ayerRe, '').trim();
  }

  // "anteayer"
  const anteRe = /\bante[\s-]?ayer\b/i;
  if (!dateMatched && anteRe.test(working)) {
    setDateOffset(2);
    working = working.replace(anteRe, '').trim();
  }

  // "hace N dias"
  const haceRe = /\bhace\s+(\d+)\s+d[ií]as?\b/i;
  if (!dateMatched) {
    const m = working.match(haceRe);
    if (m) {
      setDateOffset(parseInt(m[1], 10));
      working = working.replace(haceRe, '').trim();
    }
  }

  // Fecha YYYY-MM-DD
  const isoRe = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  if (!dateMatched) {
    const m = working.match(isoRe);
    if (m) {
      occurredAt = `${m[1]}-${m[2]}-${m[3]}`;
      dateMatched = true;
      working = working.replace(isoRe, '').trim();
    }
  }

  // Fecha DD/MM o DD/MM/YYYY
  const dmRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/;
  if (!dateMatched) {
    const m = working.match(dmRe);
    if (m) {
      const day = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const year = m[3] || String(today.getFullYear());
      occurredAt = `${year}-${month}-${day}`;
      dateMatched = true;
      working = working.replace(dmRe, '').trim();
    }
  }

  // 2. Detectar cantidad (con coma o punto, opcional símbolo €)
  // Buscamos un número que tenga decimal explícito o esté solo
  const amountRe = /(?<!\d)(\d+(?:[.,]\d{1,2})?)\s*€?(?!\d)/;
  const amountMatch = working.match(amountRe);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(',', '.');
  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const amountCents = Math.round(amount * 100);

  // Quitar la cantidad del texto
  working = working.replace(amountMatch[0], ' ').replace(/\s+/g, ' ').trim();

  // 3. Lo que queda es la descripción
  const description = working || 'Gasto';

  return {
    description,
    amountCents,
    occurredAt,
  };
}
