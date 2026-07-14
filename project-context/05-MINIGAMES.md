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

**Estado actual**: Selector implementado y 2 juegos avanzados publicados (jugar, limpiar).

Cuando el usuario pulsa una accion de cuidado, aparece un modal con dos opciones:
- **Facil** (estrella, fondo verde): Lanza el mini-juego clasico
- **Avanzado** (fuego, fondo naranja): Lanza el juego avanzado si existe para esa accion. Si no existe, el boton aparece deshabilitado con texto "Proximamente"

Los juegos avanzados viven en `ACTION_GAMES_ADVANCED` y `GAME_CONFIGS_ADVANCED`
(`Partial<Record<CareAction, ...>>` en `src/minigames/index.ts`). `selectDifficulty('advanced')`
usa esos mapas cuando hay entrada para la accion; si no, cae al juego facil.

**Estilos del picker**: scoped en CareScreen.vue (`position: fixed`, sin Teleport). Clases con prefijo `.picker-*`.

## Juegos Avanzados

Las 6 acciones tienen juego avanzado. Ganar en avanzado da **recompensa x1.5**
(`applyCareAction` con `ADVANCED_REWARD_MULTIPLIER`) y afinidad con peso 0.15
(`ADVANCED_AFFINITY_WEIGHT`). El shell reproduce sonidos de victoria/derrota
via `useSfx`.

### FeedCatchGame.vue — Alimentar (avanzado)
**Mecanica**: Cesta (🧺) que sigue el dedo/raton en horizontal. Caen alimentos: buenos (🍎🍖🥕🍌🧀🍇) y podridos (🤢🦠🗑️, ~25%). Atrapar podrido = derrota inmediata.
- **Objetivo**: atrapar 10 comidas buenas. 25 segundos. Velocidad de caida creciente

### SimonHeartsGame.vue — Cariño (avanzado)
**Mecanica**: "Simon dice" con 4 corazones (❤️💛💙💚) en grid 2x2. Fase "Observa..." (secuencia iluminada) y fase "Tu turno!" (repetirla). Fallo = derrota.
- **Objetivo**: 3 rondas con secuencias de 3, 4 y 5. 30 segundos

### LullabyGame.vue — Descansar (avanzado)
**Mecanica**: Escena nocturna con barra oscilante y zona verde. Tocar cuando el marcador pasa por la zona = acierto (la zona encoge x0.65 y el marcador acelera x1.25). Primer fallo = aviso 😠; segundo = derrota 😱.
- **Objetivo**: 3 aciertos. 20 segundos

### OutfitMemoryGame.vue — Vestir (avanzado)
**Mecanica**: Se muestran 3 prendas 2.5s, luego grid 3x3 con 6 distractoras. Tocar las 3 correctas en cualquier orden; una incorrecta = derrota.
- **Objetivo**: las 3 prendas. 20 segundos

### BasketGame.vue — Jugar (avanzado)
**Mecanica**: Baloncesto tipo tirachinas. Arrastra la pelota (🏀) hacia atras y suelta para lanzarla con trayectoria parabolica hacia la canasta.
- Fisica: gravedad + velocidad proporcional al drag, escalada por tamano de pantalla (baseline 375x667)
- Preview de trayectoria (5 puntos) mientras arrastras
- Deteccion de canasta con interpolacion entre frames (no puede "saltarse" el aro)
- **Objetivo**: encestar 3 de 5 tiros. 20 segundos
- Gana/pierde anticipadamente en cuanto el resultado es matematicamente seguro

### ScrubGame.vue — Limpiar (avanzado)
**Mecanica**: "Campo minado" de limpieza. Grid fino (20x28) de suciedad con 25 minas (💣). Arrastra la esponja (🧽) para limpiar sin tocar las minas.
- Pointer Events unificados (raton + tactil) con captura de puntero
- El trazo se interpola entre eventos: deslizar rapido no atraviesa minas ni deja huecos
- Minas con distancia minima entre si (3.5 celdas) + zona de inicio segura (esquina superior izquierda) — el nivel siempre es navegable
- Al tocar mina: se revelan todas, la detonada brilla, overlay 💥 y derrota
- **Objetivo**: limpiar 85% de las celdas seguras. 25 segundos

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
