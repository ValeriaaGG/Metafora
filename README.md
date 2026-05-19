# Mis Finanzas — Metáfora

App de finanzas personales (rescatada de un artifact de Claude).

## Cómo correrla

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Importar tu backup

1. Abre la app.
2. Click en el botón con ícono de **flecha hacia arriba** (Upload) en el header.
3. Selecciona tu archivo `mis-finanzas-backup-*.json` (el que descargaste del artifact).
4. Listo — toda tu data queda cargada.

## Exportar backup

Click en el botón con ícono de **flecha hacia abajo** en el header → descarga un JSON con todo.

## Build para producción

```bash
npm run build
```

Los archivos quedan en `dist/`. Puedes desplegarlos en cualquier hosting estático (Vercel, Netlify, GitHub Pages, etc.).

## Dónde se guardan los datos

En `localStorage` del navegador, bajo la clave `app-data`. Si cambias de navegador o computadora, **exporta el JSON** y reimpórtalo en el otro lado.
