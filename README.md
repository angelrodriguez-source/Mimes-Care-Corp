# Mimes Care Corp

[![CI y Deploy](https://github.com/angelrodriguez-source/Mimes-Care-Corp/actions/workflows/deploy.yml/badge.svg)](https://github.com/angelrodriguez-source/Mimes-Care-Corp/actions/workflows/deploy.yml)

Juego social de mascotas virtuales: **no cuidas a tus Mimes — cuidas a los de
tus amigos, y ellos cuidan a los tuyos**. Cesiones de 7 dias, mini-juegos con
dos dificultades, economia de Puntos Mimes, tienda de accesorios y mensajeria
a traves del propio Mime.

**Jugar**: https://angelrodriguez-source.github.io/Mimes-Care-Corp/
(instalable como PWA desde el movil)

## Stack

| Capa | Tecnologia |
|------|-----------|
| Frontend | Vue 3 + TypeScript + Vite + Pinia + Vue Router (hash mode) |
| Backend | Supabase (Auth + PostgreSQL + RLS + RPCs + Realtime) |
| Estilos | CSS puro con variables |
| Tests | Vitest (logica pura de `MimeModel`) |
| Hosting | GitHub Pages (rama `gh-pages`) |

## Desarrollo

```bash
cd mimes-app
npm install
npm run dev          # http://localhost:5173
npm run test         # tests unitarios
npm run build        # type-check + build de produccion
```

Credenciales de Supabase en `mimes-app/src/services/supabase.ts`.

## Despliegue (automatico)

### Frontend
Push a `main` → GitHub Actions testea, buildea y publica en `gh-pages`
(workflow `.github/workflows/deploy.yml`). No hay que hacer nada mas.

Deploy manual de emergencia:
```bash
cd mimes-app && npm run build && npx gh-pages -d dist
```

### Backend (migraciones de base de datos)
Las migraciones nuevas se dejan en `supabase/migrations/` con nombre
`YYYYMMDDHHMM_descripcion.sql` y se aplican solas al hacer push (workflow
`.github/workflows/migrate.yml`). Requiere el secret `SUPABASE_DB_URL`
(ver `supabase/migrations/README.md`).

Las migraciones historicas (schema + v2..v7, en `supabase/`) se ejecutaron
a mano en el SQL Editor y quedan como referencia.

## Puesta en marcha

Checklist paso a paso (reactivar Supabase, migracion v7, secrets, pruebas):
**[GUIA-PUESTA-EN-MARCHA.md](GUIA-PUESTA-EN-MARCHA.md)**

El workflow `keepalive.yml` hace ping a Supabase cada 3 dias para que el
free tier no pause el proyecto; si falla, GitHub avisa por email.

## Documentacion

Para arrancar OTRA app con este mismo montaje (deploy y migraciones
automaticas): **[PLANTILLA-NUEVA-APP.md](PLANTILLA-NUEVA-APP.md)**.

Toda la documentacion viva esta en [`project-context/`](project-context/):
vision general, base de datos, arquitectura frontend, componentes,
mini-juegos, mecanicas y trabajo pendiente. `CLAUDE.md` define las
convenciones para sesiones con Claude Code.

> Nota: `src/` y `package.json` de la raiz son el prototipo legacy en
> Phaser.js. El codigo vivo esta en `mimes-app/`.
