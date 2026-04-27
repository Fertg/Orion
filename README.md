# Orion · Frontend

Cliente web de Orion — control de gastos minimalista.

## Stack

- React 18 + Vite
- React Router 6
- CSS custom (sin librerías de UI)
- Google Identity Services para login
- Tipografía: Inter + IBM Plex Mono (vía CDN)

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# editar .env con tus valores
```

Variables necesarias:
- `VITE_API_URL` — URL del backend (ej: `http://localhost:3001` en local, `https://orion-production-xxxx.up.railway.app` en producción)
- `VITE_GOOGLE_CLIENT_ID` — el Client ID público de Google OAuth (NO el Secret)

```bash
# 3. Arrancar en dev
npm run dev
```

Abre http://localhost:5173

## Cuenta Google — orígenes autorizados

En Google Cloud Console, en las credenciales OAuth, asegúrate de tener estos orígenes:
- `http://localhost:5173` (dev)
- La URL de producción del frontend cuando lo despliegues

Si no, el botón de login fallará silenciosamente.

## Estructura

```
src/
├── api/
│   └── client.js        # Cliente HTTP con manejo de JWT
├── auth/
│   ├── AuthContext.jsx  # Provider + hook useAuth
│   └── useGoogleSignIn.js  # Hook para Google Identity Services
├── components/
│   ├── AppLayout.jsx    # Sidebar + main
│   ├── Logo.jsx         # Logo SVG inline
│   ├── ProtectedRoute.jsx
│   └── QuickExpense.jsx # Input estilo terminal con preview
├── pages/
│   ├── Login.jsx        # Pantalla de login
│   ├── Dashboard.jsx    # Resumen del mes (big number + ritmo + categorías)
│   ├── History.jsx      # Lista densa estilo extracto
│   └── Settings.jsx     # Gestión de categorías
├── styles/
│   ├── tokens.css       # CSS variables (paleta, tipografía, spacing)
│   └── components.css   # Componentes compartidos (.btn, .input, etc.)
├── utils/
│   ├── format.js        # Formateo EUR, fechas
│   └── parseExpense.js  # Parser del input "tipo terminal"
├── App.jsx
└── main.jsx
```

## Diseño

**Paleta minimal**:
- Fondo: `#FAFAF7` (blanco hueso)
- Texto: `#1A1A1A`
- Acento: `#A8472C` (terracota)
- Bordes: `#E5E5E0` (1px finos, sin sombras)

**Tipografía**:
- Inter para UI
- IBM Plex Mono para números (tabular-nums)

**Principios**:
- Sin gradientes, sin sombras innecesarias
- Jerarquía por tamaño y espacio, no por color
- Animaciones solo de fade-in al cambiar de página
- Cero emojis decorativos

## Atajos del input rápido

El campo "tipo terminal" del Dashboard parsea:
- `Mercadona 47,30 ayer` → comercio + cantidad + fecha
- `Repsol 60` → comercio + cantidad (hoy por defecto)
- `cafe 2,5 hace 3 dias` → fecha relativa
- `Spotify 9.99 25/04` → fecha explícita
- `Compra 47.30 2026-04-15` → fecha ISO

Mientras escribes, sugiere automáticamente la categoría según el motor del backend. Puedes corregirla con un click — y el sistema aprende.

## Build & deploy en Railway

```bash
npm run build
```

Genera `dist/` con assets estáticos.

Para Railway:
1. Crea un nuevo servicio desde tu repo de frontend
2. Variables: `VITE_API_URL` y `VITE_GOOGLE_CLIENT_ID`
3. Railway detecta `npm run build` y `npm start` (que sirve con `vite preview`)
4. Genera dominio público y añádelo en:
   - Google Cloud Console → Credenciales OAuth → Orígenes autorizados
   - Backend de Railway → variable `FRONTEND_URL`
