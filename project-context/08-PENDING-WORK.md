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

### ~~vue-tsc: 14 errores de tipos bloqueando `npm run build`~~ RESUELTO (2026-04-11)
- `e.touches[0]` sin guardar en `MimeCharacter.vue` y `CleanGame.vue` — anadido early return
- Acceso aleatorio a arrays (`FOODS[...]`, `HEARTS[...]`, `CLOTHES[...]`, `EMOJIS[...]`, `WRONG_COLORS[...]`) devolvia `string | undefined` bajo strict. Anadido fallback `?? '<emoji-default>'` en FeedGame, LoveGame, PlayGame, DressGame
- `el.textContent = emojis[...]` en `useHeartBurst.ts` esperaba `string | null`. Fix: `?? ''`
- `applyLazyDecay` en `mimeService.ts` tipado como `MimeFromDB → MimeFromDB` destruia la propiedad `cuidador_name` de `MimeWithNames` en `DashboardView.vue`. Fix: generico `<T extends MimeFromDB>(mime: T): Promise<T>`
- `activeGame` en `CareScreen.vue` usaba `ReturnType<typeof Object.values<typeof ACTION_GAMES>>` (tipo array absurdo). Fix: `shallowRef<Component | null>(null)` importando `Component` de vue

## Codigo muerto / Limpieza

| Que | Donde | Accion |
|-----|-------|--------|
| `ActionButton.vue` | `src/components/` | No se usa. Eliminar o integrar en CareScreen |
| CSS `.mood-selector`, `.mood-btn` | `src/views/HomeView.vue` lineas 221-249 | Eliminar (residuo de version anterior) |
| Botones de Reset | DashboardView + CareScreen | **Borrar antes de produccion** |
| Botones debug crecimiento (+/-) | CareScreen cabecera | **Borrar antes de produccion** |

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
- [x] **Generacion de PM**: Implementado via sistema de cesion — al terminar 7 dias, cuidador recibe afinidad * 100 PM (2026-04-07)
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
- [x] **Objetos interactivos** en la habitacion — MimeRoom + RoomObject con objetos por personalidad (2026-04-07)
- [x] **Dia/noche** segun hora real — useDayNight composable con 4 fases (2026-04-07)
- [x] **Habitaciones tematicas** por personalidad — aventurero=verde, tranquilo=lila, picaro=naranja (2026-04-07)
- [x] **Crecimiento visual** del Mime segun dia de cesion — 40% dia 1 a 100% dia 6-7 (2026-04-07)
- [x] **Renombrar Mimes** — boton editar en MimeCard, modal en Dashboard (2026-04-07)
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
| Fase 2: Backend + Auth | **Completada** | Auth OK, schema OK, RLS OK, lazy decay OK, abandono auto OK, PM via cesion OK |
| Fase 3: Core Social | **Parcial** | Compartir OK, vista mimes a cargo OK, cesion 7 dias OK. Falta: QR, realtime |
| Fase 4: Mensajeria | No iniciada | |
| Fase 5: Lanzamiento | No iniciada | |
