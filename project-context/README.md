# Mimes Care Corp — Contexto del Proyecto

Este directorio contiene la documentacion completa del estado actual del proyecto. Disenado para que cualquier agente o sesion nueva entienda rapidamente el que, donde, como y por que de cada pieza.

## Indice

| Archivo | Contenido |
|---------|-----------|
| [01-OVERVIEW.md](01-OVERVIEW.md) | Vision, stack, URLs, estructura de carpetas, ramas git, configuracion |
| [02-DATABASE.md](02-DATABASE.md) | Tablas, columnas, RLS, funciones RPC, trigger de registro, migraciones SQL |
| [03-FRONTEND-ARCHITECTURE.md](03-FRONTEND-ARCHITECTURE.md) | Entry point, routing, Pinia store, MimeModel (tipos/constantes/funciones), servicios, composables, constantes, utils, estilos |
| [04-COMPONENTS.md](04-COMPONENTS.md) | Jerarquia de componentes, 4 vistas (Login, Home, Dashboard, CareScreen), 4 componentes (MimeCharacter, MimeCard, StatBar, ActionButton) |
| [05-MINIGAMES.md](05-MINIGAMES.md) | Arquitectura shell+slot, 6 juegos (Feed, Clean, Play, Love, Rest, Dress), sistema de dificultad, flujo completo |
| [06-GAME-MECHANICS.md](06-GAME-MECHANICS.md) | 6 stats, personalidades, decay, mood, economia PM, afinidad, flujo social |
| [07-DEPLOYMENT.md](07-DEPLOYMENT.md) | GitHub Pages, build, ramas, configuracion Supabase, problemas historicos |
| [08-PENDING-WORK.md](08-PENDING-WORK.md) | Bugs conocidos, codigo muerto, mejoras tecnicas, features pendientes, progreso del roadmap |

## Como usar estos documentos

**Para entender el proyecto**: Empieza por 01-OVERVIEW y 06-GAME-MECHANICS.

**Para tocar codigo frontend**: Lee 03-FRONTEND-ARCHITECTURE y 04-COMPONENTS.

**Para la base de datos**: Lee 02-DATABASE.

**Para mini-juegos**: Lee 05-MINIGAMES.

**Para saber que falta**: Lee 08-PENDING-WORK.

## Ultima actualizacion

2026-04-06
