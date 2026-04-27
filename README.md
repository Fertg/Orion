# Orion · Backend

API REST para Orion — control de gastos personales con categorización inteligente.

## Stack

- Node.js 20+ (ESM)
- Express
- PostgreSQL 14+
- Google OAuth2 (vía `google-auth-library`)
- JWT
- Zod para validación

## Estructura

```
src/
├── config/         # Carga y validación de env
├── db/             # Pool, schema, migraciones, seed data
├── middleware/     # Auth, error handler
├── routes/         # auth, expenses, categories
├── services/       # Lógica de negocio
└── utils/          # Helpers (normalización de texto, etc.)
```

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env con tus valores reales

# 3. Crear la BBDD (si no existe)
createdb orion

# 4. Aplicar el schema
npm run db:migrate

# 5. Arrancar en modo dev (auto-reload)
npm run dev
```

El servidor levanta en `http://localhost:3001`.

## Configurar Google OAuth

1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un proyecto si no tienes
3. Crea credenciales OAuth 2.0 tipo "Aplicación web"
4. Orígenes autorizados: `http://localhost:5173` (frontend dev) y la URL de Railway en producción
5. URIs de redirección: no hace falta (usamos Google Identity Services en frontend)
6. Copia `Client ID` y `Client Secret` a tu `.env`

## Endpoints

### Auth
- `POST /auth/google` — body `{ idToken }` → `{ token, user }`
- `GET /auth/me` — usuario autenticado

### Categorías
- `GET /categories`
- `POST /categories` — `{ name, color, icon? }`
- `PATCH /categories/:id`
- `DELETE /categories/:id` — soft delete

### Gastos
- `GET /expenses?from=&to=&limit=&offset=`
- `POST /expenses` — `{ description, amountCents, occurredAt, categoryId?, notes? }`
- `POST /expenses/suggest` — `{ description }` → sugiere categoría sin crear
- `PATCH /expenses/:id`
- `DELETE /expenses/:id`
- `GET /expenses/dashboard` — datos agregados del mes

## Cómo funciona la categorización

1. Cada usuario nuevo recibe **11 categorías** (set ampliado) y **~150 keywords seed** con comercios típicos en España.
2. Al crear un gasto sin categoría explícita, el motor busca matches en las keywords del usuario, suma pesos por categoría (las keywords más largas pesan más) y devuelve la ganadora.
3. Cada vez que el usuario asigna o corrige manualmente una categoría, las palabras significativas de la descripción se incorporan a `category_keywords` con peso incremental. Esto significa que **Orion aprende los patrones de gasto de cada usuario** sin depender de modelos externos.

## Despliegue en Railway

1. Crea un nuevo proyecto en Railway desde tu repo
2. Añade un plugin de PostgreSQL — Railway expone `DATABASE_URL` automáticamente
3. Añade las variables de entorno: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`
4. Railway detecta `npm start` automáticamente
5. Tras el primer deploy, ejecuta el migrate desde la consola de Railway: `npm run db:migrate`

## Próximos pasos

- [ ] Frontend (React + Vite) — sesión 2
- [ ] OCR de tickets — sesión 4
- [ ] Apple Sign In — cuando tengas Apple Developer
