# Mis Finanzas — Metáfora

App de finanzas personales con sync entre dispositivos vía Neon (Postgres).

## Cómo correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En local cae a localStorage si la API de Neon no está disponible.

## Deploy en Vercel

El proyecto es un Vite + React estándar. Vercel detecta todo solo. Solo necesitas configurar dos variables de entorno:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | La integración de Neon en Vercel la crea automáticamente |
| `APP_PASSWORD` | La defines tú — es la contraseña para entrar a la app |

## Pantalla de login

Al entrar pide contraseña (la que pusiste en `APP_PASSWORD`). Una vez ingresada se guarda en el navegador y no la pide más, hasta que cierres sesión con el botón de logout en el header.

## Importar / exportar backup

- **⬆️ Upload** en el header: sube un JSON exportado previamente y reemplaza los datos.
- **⬇️ Download** en el header: descarga todo en un JSON.

## Estructura

```
api/
  data.js              → endpoint GET/PUT que habla con Neon
src/
  main.jsx
  index.css
  App.jsx              → toda la app (login + dashboard + vistas)
```

## Schema en Neon

Una sola tabla `user_data` con una sola fila (id=1) que guarda todo el estado en una columna `JSONB`. El endpoint la crea automáticamente la primera vez que recibe una request.
