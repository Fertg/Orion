/**
 * Categorías por defecto del set ampliado.
 * Color en hex sin #. Paleta neutra/apagada acorde al diseño minimal.
 */
export const DEFAULT_CATEGORIES = [
  { slug: 'comida',         name: 'Comida',        color: '7B6F47', icon: '◆', sort_order: 1 },
  { slug: 'coche',          name: 'Coche',         color: '4A5568', icon: '◆', sort_order: 2 },
  { slug: 'salidas',        name: 'Salidas',       color: 'A8472C', icon: '◆', sort_order: 3 },
  { slug: 'hogar',          name: 'Hogar',         color: '5D6B5C', icon: '◆', sort_order: 4 },
  { slug: 'salud',          name: 'Salud',         color: '8B6F8E', icon: '◆', sort_order: 5 },
  { slug: 'ocio',           name: 'Ocio',          color: 'B8893E', icon: '◆', sort_order: 6 },
  { slug: 'suscripciones',  name: 'Suscripciones', color: '4A6670', icon: '◆', sort_order: 7 },
  { slug: 'viajes',         name: 'Viajes',        color: '6B7B8C', icon: '◆', sort_order: 8 },
  { slug: 'regalos',        name: 'Regalos',       color: 'A06B7E', icon: '◆', sort_order: 9 },
  { slug: 'educacion',      name: 'Educación',     color: '5C6B47', icon: '◆', sort_order: 10 },
  { slug: 'otros',          name: 'Otros',         color: '8B8B8B', icon: '◆', sort_order: 99 },
];

/**
 * Keywords semilla por categoría — comercios y términos comunes en España.
 * Todo en minúsculas y sin tildes (la normalización se hace antes de comparar).
 */
export const SEED_KEYWORDS = {
  comida: [
    'mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'eroski', 'alcampo',
    'consum', 'hipercor', 'el corte ingles', 'ahorramas', 'bonpreu',
    'frutas', 'fruteria', 'panaderia', 'carniceria', 'pescaderia',
    'supermercado', 'super', 'compra',
  ],
  coche: [
    'repsol', 'cepsa', 'galp', 'shell', 'bp', 'petronor', 'ballenoil',
    'gasolina', 'gasoil', 'diesel', 'gasolinera', 'combustible',
    'taller', 'itv', 'parking', 'aparcamiento', 'autopista', 'peaje',
    'seguro coche',
  ],
  salidas: [
    'restaurante', 'bar', 'cerveceria', 'cafeteria', 'cafe',
    'mcdonalds', 'burger king', 'kfc', 'telepizza', 'dominos',
    'starbucks', 'glovo', 'uber eats', 'just eat',
    'cena', 'comida fuera', 'tapas', 'copa', 'discoteca',
  ],
  hogar: [
    'ikea', 'leroy merlin', 'bricomart', 'bricodepot', 'aki',
    'luz', 'iberdrola', 'endesa', 'naturgy', 'repsol luz',
    'agua', 'gas', 'comunidad', 'alquiler', 'hipoteca',
    'internet', 'movistar', 'vodafone', 'orange', 'masmovil', 'yoigo',
    'limpieza', 'detergente',
  ],
  salud: [
    'farmacia', 'medico', 'dentista', 'clinica', 'hospital',
    'sanitas', 'adeslas', 'mapfre salud', 'dkv',
    'optica', 'gafas', 'lentillas', 'fisio', 'fisioterapeuta',
    'psicologo', 'analitica',
  ],
  ocio: [
    'cine', 'teatro', 'concierto', 'entrada', 'museo',
    'spotify', 'netflix', 'hbo', 'disney', 'amazon prime', 'apple music',
    'libro', 'casa del libro', 'fnac',
    'gimnasio', 'gym', 'padel', 'pista',
  ],
  suscripciones: [
    'spotify', 'netflix', 'hbo max', 'disney plus', 'amazon prime',
    'apple music', 'apple tv', 'youtube premium', 'icloud', 'dropbox',
    'google one', 'github', 'chatgpt', 'claude', 'notion',
    'adobe', 'microsoft 365', 'office 365',
  ],
  viajes: [
    'renfe', 'ave', 'iberia', 'vueling', 'ryanair', 'easyjet', 'air europa',
    'booking', 'airbnb', 'hotel', 'hostal', 'apartamento',
    'blablacar', 'flixbus', 'alsa', 'viaje', 'vacaciones',
  ],
  regalos: [
    'regalo', 'amazon regalo', 'flores', 'interflora',
    'cumple', 'cumpleaños', 'aniversario',
  ],
  educacion: [
    'curso', 'udemy', 'coursera', 'platzi', 'domestika',
    'libro tecnico', 'matricula', 'universidad', 'master',
    'academia', 'idiomas',
  ],
};
