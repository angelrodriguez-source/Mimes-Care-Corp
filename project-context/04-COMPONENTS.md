# 04 - Componentes y Vistas

## Jerarquia de Componentes

```
App.vue
├── LoginView.vue              — Login / Registro
├── HomeView.vue               — Preview publica (explore) / Mis Mimes
├── DashboardView.vue          — Hub principal tras login
│   ├── MimeCard.vue (x N)    — Tarjeta de Mime en dashboard
│   │   └── MimeCharacter.vue  — Avatar del Mime (escala 0.45)
│   └── DailyRewardModal.vue   — Modal de recompensa diaria (condicional)
├── CareScreen.vue             — Pantalla de cuidado
│   ├── MimeRoom.vue           — Habitacion tematica (pared, suelo, objetos, dia/noche)
│   │   └── RoomObject.vue (x N) — Objeto interactivo/decorativo
│   ├── MimeCharacter.vue      — Mime en la habitacion
│   ├── StatBar.vue (x6)       — Barras de stats
│   └── MiniGameShell.vue      — Overlay de mini-juego
│       └── [Game].vue         — Juego individual
└── TutorialOverlay.vue        — Overlay global del tutorial (se monta una vez, sobrevive a cambios de ruta)
```

---

## Vistas (`src/views/`)

### LoginView.vue
**Ruta**: `/` | **Archivo**: `src/views/LoginView.vue`

Pantalla de autenticacion con toggle login/registro.

**Funcionalidad**:
- Modo login: email + password -> `userStore.signIn()` -> redirect a `/dashboard`
- Modo registro: nombre + email + password -> `userStore.signUp()` -> intenta login directo
- Si el registro requiere confirmacion de email, muestra mensaje
- Link "Explore Mimes" fijado abajo (`position: fixed; bottom: 24px`)

**UI**: Card blanca centrada con sombra, inputs con borde redondeado, boton morado `#5c6bc0`.

### HomeView.vue
**Ruta**: `/explore` | **Archivo**: `src/views/HomeView.vue`

**Dos modos**:
1. **Explore** (sin login): 3 Mimes hardcoded (aventurero/celeste, tranquilo/lila, picaro/melocoton) como demo
2. **Logueado**: Carga mimes reales del usuario desde Supabase con mood calculado

**Nota**: Tiene CSS residual (`.mood-selector`, `.mood-btn`) que no se usa en el template actual.

### DashboardView.vue
**Ruta**: `/dashboard` | **Archivo**: `src/views/DashboardView.vue`

Hub principal despues de login. Usa `mimeService.loadDashboardData()` para cargar datos.

**Secciones**:
1. **Header sticky**: titulo "Mimes Care Corp", saludo, badge de PM (`data-tutorial="pm-badge"`), boton `?` (relanza tutorial), boton "Salir"
2. **Mis Mimes** (`data-tutorial="my-mimes-section"`): MimeCard por cada mime propio. La primera card lleva `data-tutorial="share-btn-first"`. Boton "Compartir" si no tiene cuidador
3. **Mimes a mi cargo**: MimeCard por cada mime que cuidas. Botones "Cuidar" y "Soltar"
4. **Adoptar Mime** (`data-tutorial="adopt-section"`): Input de codigo de 6 chars + boton "Adoptar"
5. **Reset (pruebas)**: Boton dashed rojo que resetea todo (borrar antes de produccion)

**Modal de compartir**: Muestra codigo generado con boton "Copiar". Se cierra pulsando fuera o "Cerrar".

**Modal de renombrar**: Input con nombre actual, max 20 chars, Guardar/Cancelar. Solo para Mimes propios.

**Modal de recompensa diaria** (`DailyRewardModal.vue`): Tras `loadData()` en `onMounted`, `computeNextDailyReward(userStore.profile)` comprueba si toca reclamo hoy (compara `last_daily_claim_date` con la fecha local calculada en `sv-SE` TZ del navegador). Si toca, se abre el modal en fase `offer`.

**Tutorial interactivo**: Tras `loadData()`, si `profile.tutorial_completed === false` llama a `tutorialStore.start()` y SALTA la recompensa diaria ese ciclo (se pueden solapar overlays). Tambien expone `startTutorial()` en el boton `?` del header para relanzarlo manualmente. Si el tutorial ya esta activo al entrar (p. ej. se volvio desde CareScreen durante el recorrido), no hace nada. Ademas, tras `loadData()` se llama a `tutorialStore.setCareMimeId(myMimes[0]?.id ?? null)` para que el tutorial sepa a que Mime navegar cuando llegue al capitulo de cuidado.

**Funciones principales**:
- `handleShare(mimeId, nombre)` -> `generateShareCode()` RPC -> muestra modal
- `handleClaim()` -> `claimMime()` RPC -> recarga datos
- `handleRelease(mimeId)` -> `releaseMime()` RPC -> recarga datos
- `handleReset()` -> `resetAllMimes()` -> recarga todo
- `openRename(mimeId, nombre)` -> abre modal -> `renameMime()` -> recarga datos
- `handleClaimDaily()` -> `claimDailyReward()` RPC -> `userStore.fetchProfile()` (actualiza badge del header) -> transiciona el modal a fase `claimed`
- **Cesion check**: al cargar, `checkCesionExpiry()` se ejecuta para Mimes propios y a cargo. Si expirada, devuelve Mime + da PM al cuidador

### CareScreen.vue
**Ruta**: `/care/:id` | **Archivo**: `src/views/CareScreen.vue`

Pantalla principal de gameplay. Carga un Mime por su UUID desde la URL.

**Estructura visual**:
- **Habitacion**: Componente `MimeRoom.vue` con tema por personalidad (aventurero=verde, tranquilo=lila, picaro=naranja). Incluye objetos interactivos y ciclo dia/noche. Mime se mueve horizontalmente (20%-80%)
- **Crecimiento**: `mimeScale` se calcula segun dia de cesion (dia 1=40%, dia 7=100%). Botones debug +/- 10% para preview
- **Cabecera** (z-index 30): Boton back, nombre del Mime, boton Reset, botones debug crecimiento, badge de PM
- **Menu acciones** (izquierda, z-index 20, `data-tutorial="actions-menu"`): 6 FABs circulares con icono + coste. Deshabilitados si no hay PM suficiente
- **Resumen de estado** (derecha, z-index 25, `data-tutorial="status-summary"`): Afinidad, mood, media de stats. Click abre drawer
- **Stats drawer** (derecha, z-index 40): Panel deslizante con 6 StatBar
- **Emoji flotante**: Aparece brevemente tras accion exitosa

**Flujo de accion de cuidado**:
1. Usuario pulsa FAB -> `handleAction(action)`
2. Aparece picker de dificultad (Facil / Avanzado)
3. `selectDifficulty()` -> cobra PM, lanza mini-juego
4. MiniGameShell gestiona countdown -> playing -> result
5. `onMiniGameDone(result)`:
   - Exito: aplica stats, calcula afinidad, feedback visual, guarda en Supabase
   - Fallo: solo guarda PM gastados

**Efectos especiales**:
- Accion `carino`: `mimeCharRef.showKissBurst()` (explosion de besos)
- Accion `descansar`: para movimiento del Mime durante 5 segundos

**Selector de dificultad** (anadido recientemente):
- Modal con Teleport al body (estilos no-scoped)
- Dos opciones: "Facil" (verde, juego actual) y "Avanzado" (naranja, "Proximamente")
- Ambas lanzan actualmente el juego facil — avanzado pendiente de definir

---

## Componentes (`src/components/`)

### MimeCharacter.vue
**Archivo**: `src/components/MimeCharacter.vue` (~1250 lineas)

Componente visual principal. Renderiza el Mime completo con CSS puro (sin imagenes).

**Props**:
| Prop | Tipo | Default | Descripcion |
|------|------|---------|-------------|
| `personality` | 'aventurero' \| 'tranquilo' \| 'picaro' | (requerido) | Estilo de pelo |
| `colorTheme` | 'celeste' \| 'lila' \| 'melocoton' | (requerido) | Paleta de colores |
| `mood` | Mood | '' | Expresion facial |
| `scale` | number | 1 | Factor de escala (1 = 150x180px) |

**Partes del cuerpo** (DOM):
- Orejas (izq/der) con interior coloreado
- Pelo: 5 strands posicionados segun personalidad (punk/curly/quiff)
- Cuerpo (ovalado) con barriga
- Ojos con pupilas (siguen el cursor), parpados (blink cada 4s)
- Mejillas rosadas (blush)
- Boca estilo `:3` de gato (nariz + W + lengua)
- Collar
- Manos con corazones (wave animation)
- Pies
- Sombra en el suelo

**CSS Variables por color theme**:
```css
.mime-celeste  { --body-color: #1565c0; --belly-color: #e3f2fd; --hair-color: #0d47a1; ... }
.mime-lila     { --body-color: #6a1b9a; --belly-color: #f3e5f5; --hair-color: #4a148c; ... }
.mime-melocoton { --body-color: #e65100; --belly-color: #fff3e0; --hair-color: #bf360c; ... }
```

**Expresiones por mood** (modifican boca y ojos via CSS):
- **feliz**: boca mas ancha, lengua visible
- **euforico**: boca muy ancha, animacion rapida, blush maximo
- **triste**: boca invertida (frown), blush minimo
- **dormido**: boca pequena (bostezando), ojos 70% cerrados, zzZ flotantes
- **hambriento**: lengua lamiendo, boca palpitante

**Interacciones**:
- **Eye tracking**: pupilas siguen raton/dedo (`mousemove` + `touchmove` en document)
- **Click**: explosion de corazones via `useHeartBurst` (o codigo directo)
- **Hover**: orejas se levantan, manos saludan rapido

**defineExpose**: `{ showKissBurst }` — accesible desde padre via template ref

**Dos bloques `<style>`**:
- `scoped`: todo el CSS del personaje
- No-scoped: `.heart-burst`, `.mini-heart`, `.zzz-container`, `.zzz-letter` (elementos creados con `document.createElement()` no reciben data-v-xxxx)

### MimeCard.vue
**Archivo**: `src/components/MimeCard.vue`

Tarjeta compacta para el dashboard.

**Props**: id, nombre, personalidad, colorTheme, stats, afinidad, cuidadorName?, duenoName?, daysLeft?, mode ('own' | 'caring')

**Emits**: share, care, release, rename

**Muestra**: Mini MimeCharacter (escala 0.45), nombre con boton de editar (lapiz, solo mode=own), personalidad, barra de salud, mood, info cuidador/dueno, afinidad, dias restantes de cesion (icono reloj), botones de accion segun modo.

**Borde izquierdo coloreado** segun colorTheme (celeste=#1565c0, lila=#6a1b9a, melocoton=#e65100).

### StatBar.vue
**Archivo**: `src/components/StatBar.vue`

Barra visual de una estadistica.

**Props**: label, value (0-100), icon (emoji)

**Color de barra**: >= 60 verde, >= 30 naranja, < 30 rojo. Transition CSS de 0.5s.

### ActionButton.vue
**Archivo**: `src/components/ActionButton.vue`

**NOTA**: Este componente EXISTE pero NO SE USA actualmente. CareScreen usa botones FAB directos en su template. Candidato a eliminar o integrar.

**Props**: label, icon, cost, disabled. **Emits**: action.

### MimeRoom.vue
**Archivo**: `src/components/MimeRoom.vue`

Habitacion tematica modular. Renderiza pared, suelo, objetos y overlay dia/noche segun personalidad.

**Props**: personality (Personality)

**Emits**: objectInteract (action: CareAction) — cuando se toca un objeto interactivo

**Usa**: `useDayNight` composable, `ROOM_THEMES` config, `RoomObject.vue` para cada objeto.

**Slot default**: para el Mime y elementos como feedback emoji.

**Temas por personalidad**:
- Aventurero: pared verde (#e8f5e9 -> #66bb6a), objetos: comida, pelota, mochila, cama, mapa
- Tranquilo: pared lila (#ede7f6 -> #b39ddb), objetos: te, libros, planta, sofa, cuadro
- Picaro: pared naranja (#fff3e0 -> #ffcc80), objetos: pizza, dados, cofre, cama, espejo

**Ciclo dia/noche**: overlay con tinte + oscuridad + indicador (estrellas/sol/atardecer).

### RoomObject.vue
**Archivo**: `src/components/RoomObject.vue`

Objeto posicionado absolutamente dentro de MimeRoom.

**Props**: emoji, label, x (% izquierda), y (% desde abajo), size (px), action? (CareAction)

**Emits**: interact (action) — solo si tiene action asociada

Si tiene action, es clickable y muestra tooltip con label al hover/tap.

### DailyRewardModal.vue
**Archivo**: `src/components/DailyRewardModal.vue`

Modal de recompensa diaria por login. Aparece una vez al dia en el dashboard (controlado por el padre).

**Props**:
| Prop | Tipo | Descripcion |
|------|------|-------------|
| `streakPreview` | number (1..7) | Dia de racha que se obtendria (o la racha confirmada en fase claimed) |
| `rewardPreview` | number | PM de la recompensa |
| `phase` | `'offer' \| 'claimed'` | Fase del modal: oferta inicial o celebracion post-reclamo |
| `loading` | boolean | Deshabilita el boton mientras se reclama |

**Emits**: `claim`, `close`

**UI**:
- Titulo "Recompensa diaria" (fase offer) o "Reclamado" (fase claimed)
- Tracker visual de 7 circulos, los primeros `streakPreview` rellenos en naranja
- Monto grande destacado (`+N PM`)
- Fase `offer`: botones "Mas tarde" (cierra sin reclamar) y "Reclamar" (emite `claim`)
- Fase `claimed`: mensaje de exito + boton "Cerrar"

**Estilos scoped** autonomos (copia el lenguaje visual de los modales de DashboardView: `modal-overlay`, `modal-card`, fuente Baloo 2, color primario `#5c6bc0`, PM en naranja `#e65100`).

### TutorialOverlay.vue
**Archivo**: `src/components/TutorialOverlay.vue`

Overlay global del tutorial interactivo. Se monta una sola vez en `App.vue` (fuera del `<RouterView />`) para sobrevivir a los cambios de ruta: el tutorial puede navegar del dashboard a CareScreen y volver sin reiniciarse.

**Props / emits**: ninguno — lee todo del `tutorialStore` (Pinia).

**Estado reactivo**:
- `targetRect`: `DOMRect | null` — posicion del elemento destacado o null si no hay target
- `tooltipStyle`: computed con `left`/`top` del tooltip (o `transform` centrado si no hay target)
- `spotlightStyle`: computed con `left/top/width/height` del halo luminoso

**Logica**:
1. `watch(tutorial.currentStep, ...)` con `immediate: true` reacciona a cambios de paso
2. Si el paso tiene `route`, `navigateIfNeeded()` hace `router.push` (solo si no estamos ya alli). Para `route: 'care'` usa `tutorial.careMimeId`
3. `locateTarget()` hace hasta 40 intentos (nextTick + 100ms) de `document.querySelector('[data-tutorial="..."]')` — necesario porque CareScreen tiene un estado `loading` y el target no existe hasta que `loadMime()` termina
4. Si el target esta fuera de pantalla, hace `scrollIntoView({ block: 'center' })` y recalcula
5. Resize/scroll globales recalculan el rect

**Template**:
- Si hay spotlight: 4 bandas oscuras (`rgba(0,0,0,0.6)`) rodeando el target + halo luminoso con `box-shadow` pulsante morado (`#5c6bc0`)
- Si no hay target o placement es `center`: un overlay completo oscuro + tooltip centrado
- Tooltip: card blanca 300px con progreso "Paso N/M", titulo, body, boton "Saltar" + botones "Atras"/"Siguiente" (o "Terminar" en el ultimo paso)

**Estilos scoped**. `z-index: 1000` para quedar sobre cualquier modal. `Teleport to="body"` para escapar stacking contexts.

**Targets declarados en la app**:
| data-tutorial | Donde | Paso del tutorial |
|---------------|-------|-------------------|
| `my-mimes-section` | DashboardView, seccion Mis Mimes | `my-mimes` |
| `share-btn-first` | DashboardView, primera MimeCard (fallthrough attr) | `share` |
| `adopt-section` | DashboardView, seccion Adoptar | `adoptar` |
| `pm-badge` | DashboardView, badge de PM en header | `pm-dashboard` |
| `actions-menu` | CareScreen, menu lateral de 6 FABs | `care-actions` |
| `status-summary` | CareScreen, resumen derecho (afinidad/mood/avg) | `care-stats` |

**Tutorial flow** (10 pasos, definidos en `src/constants/tutorialSteps.ts`):
1. `welcome` — centrado, bienvenida
2. `my-mimes` — spotlight en seccion Mis Mimes
3. `share` — spotlight en primera card (explica que los cuida otro)
4. `cesion-info` — centrado, explica cesion de 7 dias
5. `adoptar` — spotlight en input de adopcion
6. `care-intro` — centrado, transicion
7. `care-actions` — navega a `/care/:id`, spotlight en FABs
8. `care-stats` — spotlight en resumen derecho
9. `pm-dashboard` — vuelve a dashboard, spotlight en PM badge
10. `finale` — centrado, llama a `finish()` que persiste `tutorial_completed = true`
