# 08 - Trabajo Pendiente, Issues Conocidos y Proximos Pasos

## Inmediato (en progreso)

### Mini-juegos avanzados
- El selector de dificultad (Facil/Avanzado) ya esta implementado en CareScreen.vue
- Los juegos "facil" son los 6 actuales
- **Pendiente**: El usuario define cada juego avanzado uno a uno
- Cuando esten listos: crear `ACTION_GAMES_ADVANCED` en `src/minigames/index.ts` y conectar con `selectDifficulty('advanced')`

## Bugs conocidos

### ~~RestGame tiene logica invertida~~ RESUELTO (2026-04-06)
- Se anadio `timeoutIsWin` a `MiniGameConfig` en `types.ts`
- `descansar` tiene `timeoutIsWin: true`
- `MiniGameShell` usa `!!config.timeoutIsWin` en vez de `false` fijo cuando el timer llega a 0

### ~~Mini-juegos arrancan antes de la countdown~~ RESUELTO (2026-04-06)
- FeedGame, LoveGame, PlayGame: cambiado `onMounted` por `watch(active)` para iniciar intervalos solo cuando `active=true`

### ~~Estrellas de RestGame con Math.random() en template~~ RESUELTO (2026-04-06)
- Posiciones precalculadas en `onMounted` y guardadas en ref `starPositions`

## Codigo muerto / Limpieza

| Que | Donde | Accion |
|-----|-------|--------|
| `ActionButton.vue` | `src/components/` | No se usa. Eliminar o integrar en CareScreen |
| CSS `.mood-selector`, `.mood-btn` | `src/views/HomeView.vue` lineas 221-249 | Eliminar (residuo de version anterior) |
| Botones de Reset | DashboardView + CareScreen | **Borrar antes de produccion** |
| Rama `claude/refactor-code-modularity-Id0rq` | Git | Ya mergeada, eliminar |

## Mejoras tecnicas pendientes

### Manejo de errores en guardado a Supabase
- **Archivo**: `src/services/mimeService.ts` — `persistCareActionResult()`
- **Problema**: `Promise.all()` sin catch. Si Supabase falla, el usuario ve stats actualizados localmente pero no se guardaron
- **Solucion**: Anadir try/catch, mostrar feedback si falla

### Router guard tiene gap de auth
- **Archivo**: `src/router/index.ts` linea 41
- **Problema**: Mientras `loading = true`, deja pasar a cualquier ruta protegida. Si la init tarda, un usuario no-autenticado puede ver brevemente el dashboard
- **Solucion**: El guard deberia esperar a que `loading = false` antes de decidir

### Picker de dificultad usa Teleport innecesario
- **Archivo**: `src/views/CareScreen.vue`
- **Problema**: Usa `<Teleport to="body">` + estilos no-scoped. MiniGameShell no usa Teleport y funciona igual con `position: fixed`
- **Solucion**: Quitar Teleport, usar scoped styles con `position: fixed`

## Features pendientes (de GAME_DESIGN.md y ARCHITECTURE.md)

### Prioritarias
- [x] **Decay de stats por tiempo**: Implementado como lazy decay — se calcula al cargar el Mime en Dashboard y CareScreen. Usa `applyLazyDecay()` en mimeService que calcula horas desde `last_decay_at` y persiste el resultado (2026-04-06)
- [ ] **Generacion de PM**: Actualmente no hay forma de ganar PM. Necesita: PM por tus mimes bien cuidados (fuente principal)
- [x] **Abandono automatico**: `checkAbandon()` en mimeService — se ejecuta al cargar el Dashboard. Si afinidad < 10%, limpia `cuidador_id` y el Mime vuelve al dueno (2026-04-06)

### Plataforma
- [ ] **Configurar Capacitor** (iOS + Android)
- [ ] **Push notifications** cuando un Mime necesita cuidado
- [ ] **Modo offline** con sincronizacion posterior

### Social
- [ ] **Conexion QR** (presencial) — la tabla `connections` existe pero no se usa. El sistema de share_code es el fallback
- [ ] **Mensajeria Mime** — dueno deja mensajes que el Mime "dice" al cuidador. La tabla `messages` existe pero no hay UI
- [ ] **Supabase Realtime** — en vista "Mis Mimes" para ver cambios en vivo

### Visual
- [ ] **Objetos interactivos** en la habitacion (cama, plato, juguete)
- [ ] **Dia/noche** segun hora real
- [ ] **Decoracion personalizable**
- [ ] **Accesorios/ropa** para vestir al Mime
- [ ] **Sonidos/efectos** al interactuar

### Economia
- [ ] **Tienda de accesorios** con PM
- [ ] **Recompensas diarias** por login
- [ ] **Acciones premium** que suben mas la afinidad (necesarias para llegar al 100%)

## Progreso del Roadmap (de ARCHITECTURE.md)

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 0: Scaffolding | **Completada** | Vue 3 + TS + Vite, MimeCharacter portado, Supabase creado |
| Fase 1: Loop local | **Completada** | MimeModel, CareScreen, StatBar, mini-juegos, movimiento |
| Fase 2: Backend + Auth | **Parcial** | Auth OK, schema OK, RLS OK, lazy decay OK, abandono auto OK. Falta: PM generation |
| Fase 3: Core Social | **Parcial** | Compartir OK (via codigo), vista mimes a cargo OK. Falta: QR, realtime, abandono auto |
| Fase 4: Mensajeria | No iniciada | |
| Fase 5: Lanzamiento | No iniciada | |
