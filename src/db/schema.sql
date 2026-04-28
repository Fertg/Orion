-- ============================================================
-- ORION - Schema de base de datos
-- ============================================================

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- búsqueda fuzzy en descripciones

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  provider_id   TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  locale        TEXT NOT NULL DEFAULT 'es-ES',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- CATEGORÍAS
-- Cada usuario tiene su propio set. Las creamos al registrarse.
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  color         TEXT NOT NULL,           -- hex sin # (ej: 'A8472C')
  icon          TEXT,                    -- nombre del icono o emoji opcional
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  archived_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id) WHERE archived_at IS NULL;

-- ============================================================
-- KEYWORDS DE CATEGORIZACIÓN
-- Aprende de los gastos del usuario. Cuando categoriza algo
-- como "Mercadona → Comida", la palabra gana peso.
-- ============================================================
CREATE TABLE IF NOT EXISTS category_keywords (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keyword       TEXT NOT NULL,           -- normalizado: minúsculas, sin tildes
  weight        INTEGER NOT NULL DEFAULT 1,
  source        TEXT NOT NULL DEFAULT 'learned' CHECK (source IN ('seed', 'learned')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, keyword, category_id)
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_keyword ON category_keywords(user_id, keyword);

-- ============================================================
-- GASTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),  -- guardamos en céntimos
  currency      TEXT NOT NULL DEFAULT 'EUR',
  description   TEXT NOT NULL,
  merchant      TEXT,                    -- normalizado, en minúsculas
  occurred_at   DATE NOT NULL,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'ocr')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_description_trgm ON expenses USING gin (description gin_trgm_ops);

-- ============================================================
-- PRESUPUESTOS
-- Un presupuesto por categoría y mes
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,  -- NULL = budget global
  monthly_cents   BIGINT NOT NULL CHECK (monthly_cents > 0),
  currency        TEXT NOT NULL DEFAULT 'EUR',
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

-- ============================================================
-- SUSCRIPCIONES / GASTOS RECURRENTES
-- Ej: Spotify 9,99€ todos los meses el día 5
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  description         TEXT NOT NULL,
  amount_cents        BIGINT NOT NULL CHECK (amount_cents > 0),
  currency            TEXT NOT NULL DEFAULT 'EUR',
  day_of_month        INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE,                       -- NULL = indefinido
  paused_at           TIMESTAMPTZ,                -- NULL = activa
  last_generated_for  DATE,                       -- último período generado (1er día del mes)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_expenses(user_id) WHERE paused_at IS NULL;

-- ============================================================
-- TRIGGER: actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated ON expenses;
CREATE TRIGGER trg_expenses_updated
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_updated ON recurring_expenses;
CREATE TRIGGER trg_recurring_updated
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
