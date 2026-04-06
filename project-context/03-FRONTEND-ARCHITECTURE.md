# 03 - Arquitectura Frontend

## Entry Point

**`src/main.ts`** — Crea la app Vue, registra Pinia y Router, monta en `#app`, luego inicializa auth en background.

```
createApp(App) -> app.use(createPinia()) -> app.use(router) -> app.mount('#app') -> userStore.init()
```

Se monta ANTES de inicializar auth para que siempre se muestre algo en pantalla (evita blank page).

**`src/App.vue`** — Solo contiene `<RouterView />`. No tiene navegacion global; cada vista gestiona su propia cabecera.

## Routing (`src/router/index.ts`)

Hash mode (`createWebHashHistory`) para compatibilidad con GitHub Pages.

| Ruta | Nombre | Vista | Protegida | Descripcion |
|------|--------|-------|-----------|-------------|
| `/` | login | LoginView | No* | Login/registro. Redirige a /dashboard si ya logueado |
| `/dashboard` | dashboard | DashboardView | Si | Hub principal: mis mimes, mimes a cargo, adoptar |
| `/care/:id` | care | CareScreen | Si | Cuidar un Mime especifico (por UUID) |
| `/explore` | explore | HomeView | No | Preview de 3 mimes demo sin login |

*Guard*: `router.beforeEach` comprueba auth via `userStore`. Rutas protegidas redirigen a login si no hay sesion. Login redirige a dashboard si ya hay sesion.

**Problema conocido**: Mientras `userStore.loading = true` (auth inicializando), el guard deja pasar a cualquier ruta. Un usuario no autenticado podria ver brevemente el dashboard.

## Estado Global (`src/stores/userStore.ts`)

Pinia store con Composition API (`defineStore('user', () => {...})`).

### State
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `user` | `User \| null` | Usuario Supabase Auth (email, id) |
| `profile` | `{ display_name, puntos_mimes } \| null` | Datos del juego |
| `loading` | `boolean` | True mientras se comprueba sesion inicial |

### Computed
- `isLoggedIn`: `!!user`

### Actions
| Accion | Que hace |
|--------|----------|
| `init()` | Comprueba sesion en localStorage, escucha cambios de auth |
| `fetchProfile()` | Carga profile desde tabla `profiles` |
| `signUp(email, pass, name)` | Registro (trigger crea profile + 3 mimes) |
| `signIn(email, pass)` | Login |
| `signOut()` | Cierra sesion, limpia state |

### Flujo de Auth
1. `main.ts` llama `userStore.init()`
2. `init()` hace `supabase.auth.getSession()` (comprueba localStorage)
3. Si hay sesion, setea `user` y llama `fetchProfile()`
4. Registra `onAuthStateChange` para reaccionar a login/logout/token refresh
5. Pone `loading = false`

## Modelo de Datos (`src/models/MimeModel.ts`)

Archivo de **logica pura** (sin side-effects, sin DOM, sin Supabase). Solo tipos, constantes y funciones.

### Tipos exportados
```typescript
type Personality = 'aventurero' | 'tranquilo' | 'picaro'
type ColorTheme = 'celeste' | 'lila' | 'melocoton'
type StatName = 'hambre' | 'higiene' | 'diversion' | 'carino' | 'energia' | 'apariencia'
type CareAction = 'alimentar' | 'limpiar' | 'jugar' | 'carino' | 'descansar' | 'vestir'
type Mood = 'euforico' | 'feliz' | '' | 'triste' | 'dormido' | 'hambriento'
interface MimeStats { hambre, higiene, diversion, carino, energia, apariencia: number }
interface Mime { id, duenoId, cuidadorId, nombre, personalidad, colorTheme, stats, afinidad, lastDecayAt }
```

### Constantes exportadas
| Constante | Descripcion |
|-----------|-------------|
| `DECAY_PER_HOUR = 2` | Puntos que pierde cada stat por hora (base) |
| `PERSONALITY_MODIFIERS` | Multiplicadores de decay por personalidad (>1 = decae mas rapido) |
| `ACTION_PRIMARY_STAT` | Mapa accion -> stat principal (alimentar -> hambre) |
| `ACTION_EFFECTS` | Cuanto sube: primary (+18 a +30) y secondary (+1 a +5) |
| `ACTION_COSTS` | Coste en PM: 3-8 por accion |
| `ACTION_SECONDARY_STATS` | Stats secundarios que sube cada accion |
| `MOOD_THRESHOLDS` | Promedio >= 80 euforico, >= 55 feliz, >= 30 normal, < 30 triste |

### Funciones exportadas
| Funcion | Input | Output | Descripcion |
|---------|-------|--------|-------------|
| `getStatsAverage(stats)` | MimeStats | number | Media de los 6 stats |
| `deriveMood(stats)` | MimeStats | Mood | Mood segun stats (energia<20 = dormido, hambre<20 = hambriento, si no por promedio) |
| `applyDecay(stats, personality, hours)` | ... | MimeStats | Stats tras decay temporal |
| `applyCareAction(stats, action)` | ... | MimeStats | Stats tras accion de cuidado |
| `updateAffinity(current, stats, weight=0.1)` | ... | number | Afinidad nueva (media ponderada lenta) |
| `createInitialStats()` | - | MimeStats | Todos a 70 |
| `shouldAbandon(afinidad)` | number | boolean | True si afinidad < 10% |

## Servicios (`src/services/`)

### `supabase.ts`
Crea y exporta una unica instancia de `createClient(URL, ANON_KEY)`.

### `mimeService.ts`
Centraliza TODAS las llamadas a Supabase para Mimes. Los componentes no usan `supabase.from()` directamente.

| Funcion | Descripcion |
|---------|-------------|
| `fetchMimeById(id)` | Carga un Mime por UUID |
| `updateMimeStats(mimeId, stats, afinidad)` | Actualiza stats de un Mime |
| `logCareAction(mimeId, cuidadorId, action, cost)` | Registra accion en care_actions |
| `updateUserPoints(userId, puntos)` | Actualiza PM del usuario |
| `resetMime(mimeId, userId)` | Reset stats a 70, PM a 100 |
| `resetAllMimes(userId)` | Reset de TODOS los mimes del usuario |
| `loadDashboardData(userId)` | Carga mimes propios + a cargo + nombres |
| `generateShareCode(mimeId)` | RPC para generar codigo |
| `claimMime(code)` | RPC para adoptar |
| `releaseMime(mimeId)` | RPC para soltar |
| `loadAllMimes()` | Carga todos los mimes (para HomeView) |
| `persistCareActionResult(...)` | Guarda resultado completo de mini-juego (stats + action + PM) |

**Tipos exportados**: `MimeFromDB`, `MimeWithNames` — interfaces que mapean las columnas de la tabla.

## Composables (`src/composables/`)

### `useCharacterMovement.ts`
Logica de movimiento del Mime por la habitacion.

| Retorna | Tipo | Descripcion |
|---------|------|-------------|
| `mimeX` | ref(number) | Posicion X en % (20-80) |
| `mimeDirection` | ref(1\|-1) | Direccion de caminar |
| `isWalking` | ref(boolean) | Si esta caminando (para animacion bobble) |
| `startWalking()` | function | Inicia intervalo de movimiento |
| `stopWalking()` | function | Para el intervalo |
| `pauseWalking(ms)` | function | Para y reanuda tras N ms |

Configuracion por defecto: tick cada 100ms, rango 20%-80%, paso 0.5, 3% chance de girar, 60% chance de caminar.

### `useHeartBurst.ts`
Animacion de explosion de emojis (corazones, besos).

| Retorna | Descripcion |
|---------|-------------|
| `showKissBurst()` | Explosion de besos (accion carino) |
| `showClickBurst(event)` | Explosion de corazones (click en Mime) |

Crea elementos DOM dinamicos con animacion CSS (`heart-fly`). Se auto-eliminan tras 1200ms.

## Constantes (`src/constants/gameConstants.ts`)

Centraliza etiquetas, colores y configuraciones usadas en multiples componentes:

| Export | Descripcion |
|--------|-------------|
| `MOOD_LABELS` | Record<string, string> (mood -> etiqueta en espanol) |
| `getMoodLabel(mood)` | Helper que retorna la etiqueta |
| `PERSONALITY_LABELS` | Record<Personality, string> |
| `PERSONALITY_COLORS` | Record<Personality, string> (hex) |
| `getHealthColor(value)` | Verde/naranja/rojo segun valor 0-100 |
| `STAT_CONFIG` | Array de { key, label, icon } para barras de stats |
| `ACTION_CONFIG` | Array de { action, label, icon } para botones de accion |
| `INITIAL_PUNTOS = 100` | PM iniciales / de reset |
| `FEEDBACK_DURATION_MS = 800` | Duracion del emoji flotante |
| `REST_PAUSE_DURATION_MS = 5000` | Pausa de caminar al descansar |

## Utils (`src/utils/helpers.ts`)

| Funcion | Descripcion |
|---------|-------------|
| `toStats(m)` | Convierte registro plano de DB a MimeStats |
| `statsToDbFields(stats)` | Convierte MimeStats a objeto para update de Supabase |
| `copyToClipboard(text)` | Copia al portapapeles con fallback |

## Estilos Globales (`src/assets/`)

### `base.css`
- Font: `Baloo 2` (Google Fonts, importada via @import url)
- Box-sizing: border-box global
- Body: fondo `#fefce8` con gradientes radiales dorados/azules
- `user-select: none` global (es un juego, no un documento)

### `main.css`
- Importa `base.css`
- `#app` a full viewport
