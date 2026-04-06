# 05 - Sistema de Mini-juegos

## Arquitectura

El sistema de mini-juegos usa un patron **shell + slot**: un componente wrapper gestiona el flujo comun (countdown, timer, resultado) y cada juego individual solo implementa su mecanica especifica.

```
CareScreen.vue
  └── MiniGameShell.vue (overlay fullscreen, z-index 200)
        └── <slot :active :onComplete>
              └── [FeedGame | CleanGame | PlayGame | LoveGame | RestGame | DressGame]
```

## Tipos (`src/minigames/types.ts`)

```typescript
interface MiniGameResult { success: boolean }

interface MiniGameConfig {
  title: string       // "Alimentar"
  icon: string        // emoji
  instruction: string // "Atrapa la comida!"
  duration: number    // 5000 (ms)
}
```

`GAME_CONFIGS`: Record<CareAction, MiniGameConfig> — mapea cada accion a su config. Todas tienen duracion 5000ms.

## Barrel Export (`src/minigames/index.ts`)

```typescript
export const ACTION_GAMES: Record<CareAction, Component> = {
  alimentar: FeedGame,
  limpiar: CleanGame,
  jugar: PlayGame,
  carino: LoveGame,
  descansar: RestGame,
  vestir: DressGame,
}
```

Exporta tambien: MiniGameShell, GAME_CONFIGS, tipos.

## MiniGameShell.vue

**Fases**:
1. **Countdown** (3 numeros, 600ms cada uno): Muestra icono, titulo, instruccion, numero grande amarillo con pop-in
2. **Playing** (5000ms): Timer bar verde (roja < 30%), area de juego via scoped slot
3. **Result** (1500ms): Emoji (victoria/derrota) + mensaje. Auto-cierra y emite `done`

**Scoped slot** expone a los juegos hijos:
- `active: boolean` — true solo durante fase playing
- `onComplete(success: boolean)` — funcion para terminar el juego

**Fondo**: `#1a1a2e` (oscuro). User-select deshabilitado. Touch-action manipulation.

**Timer**: actualiza cada 50ms para suavidad visual. Cuando llega a 0 = derrota automatica.

## Los 6 Mini-juegos

Todos reciben las mismas props via scoped slot: `active` y `onComplete`. Todos usan `@touchstart.prevent` + `@mousedown` para funcionar en movil y desktop.

### FeedGame.vue — Alimentar
**Mecanica**: Atrapa comida que cae desde arriba.
- Items spawneados cada 400ms con emojis aleatorios (🍖🍕🍎🍩🌮🍪🧁🍌)
- Caen con velocidad variable (0.8-1.4), movimiento cada 30ms
- Tocar un item lo atrapa (escala a 0, desaparece)
- **Objetivo**: Atrapar 5 items
- ~~Problema anterior~~: Items spawneaban durante countdown. Resuelto: usa `watch(active)` en vez de `onMounted`

### CleanGame.vue — Limpiar
**Mecanica**: Limpia manchas pasando el dedo/raton.
- 10 manchas generadas en posiciones aleatorias (10%-85%)
- 3 variantes visuales (marron, verde, marron oscuro via nth-child)
- Deteccion: distancia al centro < `spot.size/2 + 5` pixeles
- Touch: `touchmove` para arrastrar, `touchstart` para tocar directo
- Mouse: `mousemove` con boton presionado
- **Objetivo**: Limpiar las 10 manchas
- Animacion splat-in al aparecer, scale(0) al limpiar

### PlayGame.vue — Jugar
**Mecanica**: Toca al emoji que rebota.
- Emoji aparece en posicion aleatoria (15%-85%)
- Al tocarlo, se mueve a nueva posicion
- Si no lo tocas, se mueve solo cada 1.2s
- Emojis rotativos: 🎾⚽🏀🎯⭐
- **Objetivo**: 8 toques
- Animacion target-appear con rotacion al mover

### LoveGame.vue — Carino
**Mecanica**: Recoge corazones que flotan hacia arriba.
- Hearts spawn cada 500ms desde abajo (y=105%)
- Flotan arriba con wobble horizontal (sin() basado en Y)
- Velocidad variable 0.4-0.8, movimiento cada 30ms
- Emojis: ❤️💛💖🧡💜💗💕
- Al tocar: scale(2) + fadeout
- **Objetivo**: Recoger 6 corazones
- Animacion heart-pulse (scale 1-1.15)

### RestGame.vue — Descansar
**Mecanica**: NO toques la pantalla. El Mime duerme.
- Escena nocturna: fondo oscuro, luna (🌙) con glow, emoji 😴 con respiracion, zzZ flotantes, estrellas (✨) con twinkle
- Si tocas: muestra 😱 con shake, fallo inmediato
- **Objetivo**: No tocar durante los 5 segundos completos
- **Unico juego donde el timer llegar a 0 = VICTORIA**. Resuelto con `timeoutIsWin: true` en la config de `descansar` — el shell usa ese flag para llamar `endGame(true)` en vez de `endGame(false)`

### DressGame.vue — Vestir
**Mecanica**: Toca solo la ropa del color correcto.
- 12 items: 5 del color correcto + 7 de colores incorrectos
- Color correcto determinado por prop `colorTheme`:
  - celeste -> azul (#1565c0)
  - lila -> morado (#6a1b9a)
  - melocoton -> naranja (#e65100)
- Colores incorrectos: rojo, verde, rosa, gris
- Cada item tiene un dot de color debajo + drop-shadow
- Emojis ropa: 👕👖🧢👗🧣🧤👟🎩
- Tocar correcto: desaparece con scale. Tocar incorrecto: shake + fallo inmediato
- **Objetivo**: 4 aciertos sin errores
- Indicador arriba: swatch de color + texto "Toca solo [color]"

## Sistema de Dificultad

**Estado actual**: Implementado el selector, pendientes los juegos avanzados.

Cuando el usuario pulsa una accion de cuidado, aparece un modal (Teleport al body) con dos opciones:
- **Facil** (estrella, fondo verde): Lanza el mini-juego actual
- **Avanzado** (fuego, fondo naranja): Dice "Proximamente", lanza el facil por ahora

**Plan**: El usuario definira los juegos avanzados uno a uno. Cuando esten listos, se creara un `ACTION_GAMES_ADVANCED: Record<CareAction, Component>` y `selectDifficulty('advanced')` usara ese mapeo en vez de `ACTION_GAMES`.

**Estilos del picker**: En bloque `<style>` no-scoped (por el Teleport). Clases con prefijo `.picker-*`.

## Flujo Completo (CareScreen -> MiniGame -> Supabase)

```
1. Usuario pulsa FAB (ej: 🍖 Alimentar, coste 5 PM)
2. handleAction('alimentar') -> muestra picker de dificultad
3. selectDifficulty('easy') ->
   a. Cobra 5 PM localmente (puntosMimes -= cost)
   b. Setea pendingAction = 'alimentar'
   c. activeGame = FeedGame, activeGameConfig = { title: 'Alimentar', ... }
4. MiniGameShell se monta ->
   a. Countdown: 3... 2... 1...
   b. Playing: FeedGame activo, timer 5s
   c. FeedGame llama onComplete(true) al atrapar 5
   d. O timer llega a 0 -> endGame(false)
   e. Result: 1.5s de "Bien hecho!" o "Has fallado!"
   f. Emite done({ success })
5. onMiniGameDone(result) ->
   Si success:
     - applyCareAction(stats, 'alimentar') -> hambre +25, energia +3, carino +3
     - updateAffinity()
     - Emoji flotante 🍖
     - Guarda en Supabase: stats, care_action, PM
   Si fail:
     - Solo guarda PM gastados en Supabase
6. userStore.fetchProfile() -> refresca PM del header
```
