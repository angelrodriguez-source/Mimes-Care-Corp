# 08 - Trabajo Pendiente, Issues Conocidos y Proximos Pasos

## Ramas remotas por borrar

Al borrar desde la CLI con `git push origin --delete` el servidor devuelve 403
(restriccion del entorno de Claude Code). Hay que borrarlas manualmente desde
la UI de GitHub en Settings > Branches o desde la vista de ramas del repo:

- [ ] `claude/select-project-idea-KsKVH` — mergeada en main (feature: recompensas diarias por login, v5)
- [ ] `claude/tutorial-interactivo` — mergeada en main (feature: tutorial interactivo con spotlight, v6)

## Accion requerida del usuario

- [ ] **Ejecutar `supabase/migration_v7_social.sql`** en el SQL Editor de Supabase.
  Sin ella: mensajeria no persiste el "leido", realtime no emite, la tienda
  de accesorios falla al comprar, y los PM siguen con el metodo antiguo
  (el frontend degrada con fallbacks, pero la v7 es necesaria para todo lo social)
- [ ] **Crear el secret `SUPABASE_DB_URL`** en GitHub (Settings > Secrets and
  variables > Actions > New repository secret) con la connection string de
  Supabase Dashboard > Settings > Database > Connection string (URI).
  Con el secret creado, las migraciones futuras en `supabase/migrations/`
  se aplican solas al hacer push (ver 07-DEPLOYMENT)

## Inmediato (en progreso)

### Mini-juegos avanzados — COMPLETO (2026-07-14)
Las 6 acciones tienen juego avanzado (recompensa x1.5 stats, afinidad peso 0.15):
- [x] `alimentar` → FeedCatchGame (cesta que atrapa comida, evita la podrida)
- [x] `limpiar` → ScrubGame (campo minado con esponja)
- [x] `jugar` → BasketGame (tirachinas con fisica parabolica)
- [x] `carino` → SimonHeartsGame (Simon dice con corazones, 3 rondas)
- [x] `descansar` → LullabyGame (timing en barra oscilante, 3 aciertos)
- [x] `vestir` → OutfitMemoryGame (memoriza 3 prendas y eligelas en grid 3x3)

### Pools aleatorios de mini-juegos (2026-07-19)
- [x] Motor `pickGame(action, difficulty)` con anti-repeticion — elige al azar del pool
- [x] Segunda tanda: 12 juegos nuevos → 2 por pool
- [x] Tercera tanda: 12 juegos mas → **3 por pool, 36 en total**
- [x] Carga perezosa: cada juego es un chunk que se descarga al elegirlo (defineAsyncComponent + precarga en pickGame)
- [ ] Cuarta tanda (si algun dia se quiere mas variedad): anadir un juego = crear el .vue + una linea en el pool

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

Resuelto (2026-07-14):
- Eliminados `ActionButton.vue` (sin uso) y el CSS residual `.mood-selector`/`.mood-btn` de HomeView
- Botones de Reset y debug de crecimiento ahora solo visibles en desarrollo (`import.meta.env.DEV`) — en el build de produccion desaparecen solos

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

### ~~Escrituras de PM con valor absoluto (race condition)~~ RESUELTO (2026-07-14)
- Migracion v7: RPC `add_points(p_delta)` (delta atomico) y RPC `expire_cesion(p_mime_id)` (cierre de cesion con FOR UPDATE que paga una sola vez)
- `addPoints()` y `checkCesionExpiry()` usan los RPCs con fallback al metodo antiguo si la v7 no esta ejecutada
- `updateUserPoints()` (absoluto) queda solo para los resets de pruebas

### Auditoria de seguridad (2026-07-19) — resuelto y asumido
Corregido en migracion v9 (`202607192030_harden_rls.sql`):
- [x] ALTA: un cuidador podia robar un Mime (update de `dueno_id`) — trigger `protect_mime_identity` (dueno_id inmutable; cesion solo la toca el dueno o los RPCs)
- [x] MEDIA: `profiles` era legible sin login (rol anon) — policy SELECT restringida a `authenticated`
- [x] BAJA: un participante podia editar el texto de los mensajes — trigger `protect_message_update` (solo `read`)
- [x] BAJA: interpolacion de nombre de archivo en apply-migrations.sh — validacion de caracteres

Riesgos evaluados y ASUMIDOS (juego casual, solo afectan al propio tramposo):
- `add_points` sin limite de delta y columnas `puntos_mimes`/`owned_accessories` escribibles por el propio usuario (coherente con el truco MIMESTATS)
- Un cuidador puede inflar la `afinidad` de un Mime que cuida (max ~100 PM por cesion)
- `claim_mime` sin rate-limit de intentos de codigo (ventana corta, reversible)

### Tests automatizados (parcial)
- [x] `MimeModel` cubierto con Vitest — 20 tests (`npm run test`) (2026-07-14)
- [ ] Pendiente: tests de `helpers.ts` y de los RPCs (contra un Supabase local)

## Features pendientes (de GAME_DESIGN.md y ARCHITECTURE.md)

### Prioritarias
- [x] **Decay de stats por tiempo**: Implementado como lazy decay — se calcula al cargar el Mime en Dashboard y CareScreen. Usa `applyLazyDecay()` en mimeService que calcula horas desde `last_decay_at` y persiste el resultado (2026-04-06)
- [x] **Generacion de PM**: Implementado via sistema de cesion — al terminar 7 dias, cuidador recibe afinidad * 100 PM (2026-04-07)
- [x] **Abandono automatico**: `checkAbandon()` en mimeService — se ejecuta al cargar el Dashboard. Si afinidad < 10%, limpia `cuidador_id` y el Mime vuelve al dueno (2026-04-06)

### Plataforma
- [x] **PWA instalable** — manifest + icono SVG + service worker (red-primero para HTML, cache-primero para assets con hash). Instalable en movil con icono propio (2026-07-14)
- [ ] **Configurar Capacitor** (iOS + Android) — la PWA cubre gran parte; Capacitor solo si hacen falta APIs nativas
- [ ] **Push notifications** cuando un Mime necesita cuidado — requiere backend de push (Edge Function + VAPID); como paliativo, las tarjetas muestran badge ❗ cuando la media de stats < 30
- [ ] **Modo offline** con sincronizacion posterior — el SW ya da shell offline; falta cola de escrituras

### Social
- [ ] **Conexion QR** (presencial) — la tabla `connections` existe pero no se usa. El sistema de share_code es el fallback
- [x] **Mensajeria Mime** — el dueno escribe desde su MimeCard (boton 💬) y el Mime lo "dice" al cuidador en CareScreen con burbuja tocable. Cola de no-leidos + marca de leido (policy v7) (2026-07-14)
- [x] **Supabase Realtime** — "Mis Mimes" se actualiza en vivo (UPDATE de mimes via publicacion v7) y la burbuja de mensajes llega en vivo al cuidador (2026-07-14)

### Visual
- [x] **Objetos interactivos** en la habitacion — MimeRoom + RoomObject con objetos por personalidad (2026-04-07)
- [x] **Dia/noche** segun hora real — useDayNight composable con 4 fases (2026-04-07)
- [x] **Habitaciones tematicas** por personalidad — aventurero=verde, tranquilo=lila, picaro=naranja (2026-04-07)
- [x] **Crecimiento visual** del Mime segun dia de cesion — 40% dia 1 a 100% dia 6-7 (2026-04-07)
- [x] **Renombrar Mimes** — boton editar en MimeCard, modal en Dashboard (2026-04-07)
- [ ] **Decoracion personalizable**
- [x] **Accesorios/ropa** para vestir al Mime — 5 accesorios equipables sobre el pelo (MimeCharacter prop `accessory`), visibles en care screen y tarjetas (2026-07-14)
- [x] **Sonidos/efectos** al interactuar — useSfx con Web Audio sintetizado (tap/success/fail/coin) + vibracion, toggle 🔊/🔇 persistido (2026-07-14)

### Economia
- [x] **Tienda de accesorios** con PM — 5 items (30-150 PM) en modal del dashboard (boton 🛍️), compra atomica con devolucion si falla (2026-07-14)
- [x] **Recompensas diarias** por login — modal al entrar al dashboard con recompensa por racha (10/15/20/25/35/50/75 PM segun dia 1..7+). RPC `claim_daily_reward` atomica e idempotente. Migracion v5 (2026-04-10)
- [ ] **Acciones premium** que suben mas la afinidad (necesarias para llegar al 100%)

### Onboarding
- [x] **Tutorial interactivo** — overlay global con spotlight y tooltip flotante que guia al usuario por dashboard y care screen. 15 pasos cubriendo bienvenida, mis mimes, compartir, cesion, adoptar, acciones de cuidado, dificultad avanzada, accesorios, mensajes, stats, economia, tienda y sonido (ampliado 2026-07-17). Auto-arranque la primera vez (`profile.tutorial_completed = false`) o relanzable con el boton `?` del header. Persistencia via RPC `mark_tutorial_completed`. Migracion v6 (2026-04-11)

## Progreso del Roadmap (de ARCHITECTURE.md)

| Fase | Estado | Notas |
|------|--------|-------|
| Fase 0: Scaffolding | **Completada** | Vue 3 + TS + Vite, MimeCharacter portado, Supabase creado |
| Fase 1: Loop local | **Completada** | MimeModel, CareScreen, StatBar, mini-juegos, movimiento |
| Fase 2: Backend + Auth | **Completada** | Auth OK, schema OK, RLS OK, lazy decay OK, abandono auto OK, PM via cesion OK |
| Fase 3: Core Social | **Parcial** | Compartir OK, vista mimes a cargo OK, cesion 7 dias OK. Falta: QR, realtime |
| Fase 4: Mensajeria | No iniciada | |
| Fase 5: Lanzamiento | No iniciada | |
