# Mimes Care Corp — Guia para Claude Code

## Contexto del proyecto

Toda la documentacion detallada esta en `project-context/`. Lee ese directorio al inicio de cada sesion para entender el proyecto completo:

- [01-OVERVIEW.md](project-context/01-OVERVIEW.md) — Vision, stack, URLs, estructura
- [02-DATABASE.md](project-context/02-DATABASE.md) — Tablas, RLS, RPCs, migraciones
- [03-FRONTEND-ARCHITECTURE.md](project-context/03-FRONTEND-ARCHITECTURE.md) — Entry point, routing, stores, servicios
- [04-COMPONENTS.md](project-context/04-COMPONENTS.md) — Vistas y componentes Vue
- [05-MINIGAMES.md](project-context/05-MINIGAMES.md) — Sistema de mini-juegos
- [06-GAME-MECHANICS.md](project-context/06-GAME-MECHANICS.md) — Stats, personalidades, economia, social
- [07-DEPLOYMENT.md](project-context/07-DEPLOYMENT.md) — GitHub Pages, build, Supabase
- [08-PENDING-WORK.md](project-context/08-PENDING-WORK.md) — Bugs, deuda tecnica, roadmap

Ver tambien `SESSION_START.md` para el procedimiento de arranque de sesion.

## Rama de desarrollo

La rama principal es `main`. No se desarrolla directamente sobre `gh-pages` (es solo para el build publicado).

## Convenciones

- Frontend: Vue 3 + TypeScript + Vite
- Backend: Supabase (Auth + PostgreSQL + RLS + RPC)
- Estilos: CSS puro con variables CSS
- Idioma del codigo: nombres en espanol (stats, acciones, personalidades)
- Idioma de comentarios/docs: espanol
- Router: hash mode (GitHub Pages)
- Los componentes no llaman a Supabase directamente — usan `mimeService.ts`
- Logica pura del juego en `MimeModel.ts` (sin side-effects)

## Estructura clave

```
mimes-app/src/          # Codigo fuente Vue (proyecto real)
project-context/        # Documentacion (leer al inicio)
supabase/               # Migraciones SQL
design/mimes/           # Fichas de personalidad
IDEAS.md                # Buzon de ideas futuras
```

> Nota: en la raiz del repo hay tambien un `package.json` y `src/` legacy del prototipo
> inicial en Phaser.js, anteriores al refactor a Vue. El codigo vivo esta en `mimes-app/`.

## Al terminar una sesion

- Commitear cambios
- Actualizar `project-context/08-PENDING-WORK.md` si se resolvieron bugs o se anadieron features
- Actualizar otros docs de project-context si hubo cambios arquitecturales
