# 08 - Trabajo Pendiente, Issues Conocidos y Proximos Pasos

## Ramas remotas por borrar

Al borrar desde la CLI con `git push origin --delete` el servidor devuelve 403
(restriccion del entorno de Claude Code). Hay que borrarlas manualmente desde
la UI de GitHub en Settings > Branches o desde la vista de ramas del repo:

- [ ] `claude/select-project-idea-KsKVH` — mergeada en main (feature: recompensas diarias por login, v5)
- [ ] `claude/tutorial-interactivo` — mergeada en main (feature: tutorial interactivo con spotlight, v6)

## Inmediato (en progreso)

### Mini-juegos avanzados
- Selector de dificultad (Facil/Avanzado) implementado en CareScreen.vue, conectado a `ACTION_GAMES_ADVANCED`/`GAME_CONFIGS_ADVANCED`
- [x] `jugar` → BasketGame (tirachinas con fisica parabolica) (2026-07-14)
- [x] `limpiar` → ScrubGame (campo minado con esponja) (2026-07-14)
- [ ] Pendientes: `alimentar`, `carino`, `descansar`, `vestir` — el usuario los define uno a uno

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
| Botones de Reset | DashboardView + CareScreen | **Borrar antes de produccion** |
| Botones debug crecimiento (+/-) | CareScreen cabecera | **Borrar antes de produccion** |

Resuelto (2026-07-14): eliminados `ActionButton.vue` (sin uso) y el CSS residual
`.mood-selector`/`.mood-btn` de HomeView.

## Mejoras tecnicas pendientes

### ~~Manejo de errores en guardado a Supabase~~ RESUELTO (2026-07-14)
- `persistCareActionResult()` ahora devuelve `{ error: string | null }` recogiendo el primer error de las 3 escrituras
- CareScreen muestra un toast rojo ("No se pudo guardar. Revisa tu conexion.") si el guardado falla

### ~~Router guard tiene gap de auth~~ RESUELTO (2026-07-14)
- `userStore` expone `waitUntilReady()` — promesa que se resuelve cuando `init()` termina (con try/finally para no colgarse si Supabase falla)
- El guard hace `await waitUntilReady()` antes de decidir; ya no deja pasar a rutas protegidas durante la carga inicial
- De paso: la redireccion login→dashboard del guard era codigo muerto (el early-return de rutas publicas la saltaba); ahora funciona

### ~~Picker de dificultad usa Teleport innecesario~~ RESUELTO (2026-07-14)
- Quitado el `<Teleport to="body">`; el picker usa `position: fixed` con estilos scoped, igual que MiniGameShell

### Escrituras de PM con valor absoluto (race condition potencial)
- **Archivos**: `mimeService.ts` — `updateUserPoints()`, `checkCesionExpiry()`
- **Problema**: escriben `puntos_mimes` como valor absoluto leido antes; dos operaciones simultaneas (p. ej. cesion expirando en dos pestanas) pueden pisarse
- **Solucion**: migrar a un RPC atomico tipo `add_points(delta)` como ya hace `claim_daily_reward`

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
- [x] **Recompensas diarias** por login — modal al entrar al dashboard con recompensa por racha (10/15/20/25/35/50/75 PM segun dia 1..7+). RPC `claim_daily_reward` atomica e idempotente. Migracion v5 (2026-04-10)
- [ ] **Acciones premium** que suben mas la afinidad (necesarias para llegar al 100%)

### Onboarding
- [x] **Tutorial interactivo** — overlay global con spotlight y tooltip flotante que guia al usuario por dashboard y care screen. 10 pasos cubriendo bienvenida, mis mimes, compartir, cesion, adoptar, acciones de cuidado, stats y economia. Auto-arranque la primera vez (`profile.tutorial_completed = false`) o relanzable con el boton `?` del header. Persistencia via RPC `mark_tutorial_completed`. Migracion v6 (2026-04-11)

## Progreso del Roadmap (de ARCHITECTURE.md)

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 0: Scaffolding | **Completada** | Vue 3 + TS + Vite, MimeCharacter portado, Supabase creado |
| Fase 1: Loop local | **Completada** | MimeModel, CareScreen, StatBar, mini-juegos, movimiento |
| Fase 2: Backend + Auth | **Completada** | Auth OK, schema OK, RLS OK, lazy decay OK, abandono auto OK, PM via cesion OK |
| Fase 3: Core Social | **Parcial** | Compartir OK, vista mimes a cargo OK, cesion 7 dias OK. Falta: QR, realtime |
| Fase 4: Mensajeria | No iniciada | |
| Fase 5: Lanzamiento | No iniciada | |
