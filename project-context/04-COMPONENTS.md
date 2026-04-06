# 04 - Componentes y Vistas

## Jerarquia de Componentes

```
App.vue
├── LoginView.vue              — Login / Registro
├── HomeView.vue               — Preview publica (explore) / Mis Mimes
├── DashboardView.vue          — Hub principal tras login
│   └── MimeCard.vue (x N)    — Tarjeta de Mime en dashboard
│       └── MimeCharacter.vue  — Avatar del Mime (escala 0.45)
└── CareScreen.vue             — Pantalla de cuidado
    ├── MimeCharacter.vue      — Mime en la habitacion
    ├── StatBar.vue (x6)       — Barras de stats
    └── MiniGameShell.vue      — Overlay de mini-juego
        └── [Game].vue         — Juego individual
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
1. **Header sticky**: titulo "Mimes Care Corp", saludo, badge de PM, boton "Salir"
2. **Mis Mimes**: MimeCard por cada mime propio. Boton "Compartir" si no tiene cuidador
3. **Mimes a mi cargo**: MimeCard por cada mime que cuidas. Botones "Cuidar" y "Soltar"
4. **Adoptar Mime**: Input de codigo de 6 chars + boton "Adoptar"
5. **Reset (pruebas)**: Boton dashed rojo que resetea todo (borrar antes de produccion)

**Modal de compartir**: Muestra codigo generado con boton "Copiar". Se cierra pulsando fuera o "Cerrar".

**Funciones principales**:
- `handleShare(mimeId, nombre)` -> `generateShareCode()` RPC -> muestra modal
- `handleClaim()` -> `claimMime()` RPC -> recarga datos
- `handleRelease(mimeId)` -> `releaseMime()` RPC -> recarga datos
- `handleReset()` -> `resetAllMimes()` -> recarga todo

### CareScreen.vue
**Ruta**: `/care/:id` | **Archivo**: `src/views/CareScreen.vue`

Pantalla principal de gameplay. Carga un Mime por su UUID desde la URL.

**Estructura visual**:
- **Habitacion**: Pared con gradiente (#e8eaf6 -> #b39ddb) + suelo marron (#795548). Mime se mueve horizontalmente (20%-80%)
- **Cabecera** (z-index 30): Boton back, nombre del Mime, boton Reset, badge de PM
- **Menu acciones** (izquierda, z-index 20): 6 FABs circulares con icono + coste. Deshabilitados si no hay PM suficiente
- **Resumen de estado** (derecha, z-index 25): Afinidad, mood, media de stats. Click abre drawer
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

**Props**: id, nombre, personalidad, colorTheme, stats, afinidad, cuidadorName?, duenoName?, mode ('own' | 'caring')

**Emits**: share, care, release

**Muestra**: Mini MimeCharacter (escala 0.45), nombre, personalidad, barra de salud, mood, info cuidador/dueno, afinidad, botones de accion segun modo.

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
