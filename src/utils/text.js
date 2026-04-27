/**
 * Normaliza un texto para comparación de keywords:
 * - minúsculas
 * - sin tildes/acentos (NFD + remove diacritics)
 * - sin múltiples espacios
 * - trim
 */
export function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae el comercio/merchant del texto.
 * Heurística simple: la primera secuencia de palabras antes
 * de un número o el texto entero si no hay números.
 *
 * Ej: "Mercadona compra semanal 47.30" -> "mercadona compra semanal"
 *     "Repsol 60" -> "repsol"
 */
export function extractMerchant(description) {
  const normalized = normalizeText(description);
  // todo lo que viene antes del primer número
  const match = normalized.match(/^([^\d]+?)(?:\s+\d|$)/);
  return match ? match[1].trim() : normalized;
}
