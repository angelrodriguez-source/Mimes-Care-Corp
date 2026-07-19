<script setup lang="ts">
/**
 * WhackToyGame.vue — Mini-juego facil de jugar
 *
 * Mecanica: whack-a-mole con juguetes. Grid 3x3 de madrigueras;
 * un juguete (🐹🎾🧸 alternando) asoma en una casilla aleatoria
 * ~900ms y se esconde. Tocarlo TARGET veces = victoria.
 * Tocar una casilla vacia no penaliza: la presion es el tiempo
 * del shell (8s). No hay derrota interna.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Toques necesarios para ganar */
const TARGET = 8
/** Numero de madrigueras (grid 3x3) */
const CELLS = 9
/** Tiempo que el juguete permanece visible en una casilla */
const MOVE_MS = 900
/** Duracion del efecto pop al acertar */
const POP_MS = 300
/** Pausa mostrando el overlay antes de llamar a onComplete */
const END_DELAY_MS = 700

/** Juguetes que van alternando en cada aparicion */
const TOYS = ['🐹', '🎾', '🧸'] as const

// --- ESTADO ---
const hits = ref(0)
/** Casilla donde asoma el juguete actualmente */
const toyCell = ref(0)
/** Emoji del juguete actual (precomputado, nunca Math.random en template) */
const toyEmoji = ref<string>(TOYS[0])
/** Casilla donde se muestra el efecto pop tras acertar */
const popCell = ref<number | null>(null)
/** Evita doble onComplete */
const done = ref(false)
/** Contador de apariciones para alternar el juguete */
let appearances = 0

// --- TIMERS (registrados para limpiarlos) ---
let moveTimer: number | null = null
const timeouts: number[] = []

function after(ms: number, fn: () => void) {
  timeouts.push(window.setTimeout(fn, ms))
}

function clearAllTimers() {
  if (moveTimer !== null) {
    clearInterval(moveTimer)
    moveTimer = null
  }
  timeouts.forEach(id => clearTimeout(id))
  timeouts.length = 0
}

// --- LOGICA ---

/** Mueve el juguete a otra casilla y alterna el emoji */
function moveToy() {
  let next = Math.floor(Math.random() * CELLS)
  if (next === toyCell.value) next = (next + 1) % CELLS
  toyCell.value = next
  appearances++
  toyEmoji.value = TOYS[appearances % TOYS.length] ?? '🐹'
}

/** Reinicia el intervalo de movimiento automatico */
function restartMoveTimer() {
  if (moveTimer !== null) clearInterval(moveTimer)
  moveTimer = window.setInterval(() => {
    if (!done.value) moveToy()
  }, MOVE_MS)
}

/** Resetea todo el estado y arranca la partida */
function start() {
  clearAllTimers()
  done.value = false
  hits.value = 0
  popCell.value = null
  appearances = 0
  toyCell.value = Math.floor(Math.random() * CELLS)
  toyEmoji.value = TOYS[0]
  restartMoveTimer()
}

/** Toque sobre la casilla idx */
function onCellTap(idx: number) {
  if (!props.active || done.value) return
  // Casilla vacia: no pasa nada
  if (idx !== toyCell.value) return

  hits.value++

  // Efecto pop en la casilla acertada
  popCell.value = idx
  after(POP_MS, () => {
    if (popCell.value === idx) popCell.value = null
  })

  if (hits.value >= TARGET) {
    win()
    return
  }

  // Cambia de casilla inmediatamente y reinicia el ciclo
  moveToy()
  restartMoveTimer()
}

function win() {
  if (done.value) return
  done.value = true
  if (moveTimer !== null) {
    clearInterval(moveTimer)
    moveTimer = null
  }
  after(END_DELAY_MS, () => props.onComplete(true))
}

// --- CICLO DE VIDA ---
watch(
  () => props.active,
  v => {
    if (v) start()
    else clearAllTimers()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearAllTimers()
})
</script>

<template>
  <div class="whack-game">
    <!-- HUD: progreso de toques -->
    <div v-if="active" class="hud">
      <span class="hud-count">{{ hits }}/{{ TARGET }}</span>
      <span class="hud-label">¡Atrapa el juguete!</span>
    </div>

    <!-- Grid 3x3 de madrigueras -->
    <div class="burrow-grid">
      <div
        v-for="i in CELLS"
        :key="i - 1"
        class="burrow"
        @touchstart.prevent="onCellTap(i - 1)"
        @mousedown="onCellTap(i - 1)"
      >
        <span
          v-if="toyCell === i - 1 && !done"
          :key="'toy-' + hits + '-' + appearances"
          class="toy"
        >{{ toyEmoji }}</span>
        <span v-if="popCell === i - 1" class="pop-fx">✨</span>
      </div>
    </div>

    <!-- Victoria -->
    <div v-if="done" class="overlay overlay-win">
      <span class="overlay-icon">🎉</span>
      <span class="overlay-text">¡Bien jugado!</span>
    </div>
  </div>
</template>

<style scoped>
.whack-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #1b3d1a 0%, #245422 55%, #1e4d2b 100%);
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* === HUD === */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  z-index: 20;
}

.hud-count {
  color: #ffd54f;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 600;
}

/* === GRID DE MADRIGUERAS === */
.burrow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  width: min(80vw, 320px);
  aspect-ratio: 1;
}

.burrow {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #0d1f0c 0%, #142e12 70%);
  border: 3px solid rgba(0, 0, 0, 0.35);
  border-radius: 50%;
  box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.toy {
  font-size: clamp(34px, 11vw, 50px);
  line-height: 1;
  pointer-events: none;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.5));
  animation: toy-peek 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Juguete asomando desde la madriguera */
@keyframes toy-peek {
  0% { transform: translateY(45%) scale(0.4); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* Efecto pop al acertar */
.pop-fx {
  position: absolute;
  font-size: 34px;
  pointer-events: none;
  animation: pop-out 0.3s ease-out forwards;
}

@keyframes pop-out {
  0% { transform: scale(0.4); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* === OVERLAY DE VICTORIA === */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  pointer-events: none;
  animation: overlay-in 0.25s ease;
}

.overlay-win {
  background: rgba(174, 234, 0, 0.18);
}

.overlay-icon {
  font-size: 76px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  color: #f0f4c3;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlay-pop {
  0% { transform: scale(0) rotate(-15deg); }
  60% { transform: scale(1.25) rotate(6deg); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
