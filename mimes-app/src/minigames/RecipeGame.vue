<script setup lang="ts">
/**
 * RecipeGame.vue — Mini-juego avanzado (memoria) de alimentar
 *
 * "La receta": tipo Simon con comida. 2 rondas: se muestra una secuencia
 * de ingredientes uno a uno (ronda 1: 3, ronda 2: 4) y el jugador la
 * repite tocando la despensa (grid fijo 2x3). Un fallo es derrota
 * inmediata; completar las 2 rondas es victoria. El input queda
 * bloqueado durante la fase de muestra. El shell da 25s.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Longitud de la secuencia por ronda */
const ROUNDS = [3, 4]
/** Tiempo por ingrediente durante la muestra (ms) */
const SHOW_STEP_MS = 600
/** Parte visible de cada paso (el resto es hueco entre ingredientes) */
const SHOW_VISIBLE_MS = 450
/** Pausa entre rondas y antes de empezar la muestra (ms) */
const ROUND_PAUSE_MS = 600
/** Pausa para mostrar el overlay de resultado antes de cerrar */
const FEEDBACK_DELAY_MS = 700

/** Despensa fija: grid 2x3 */
const PANTRY = ['🍅', '🧀', '🥕', '🥚', '🍞', '🧅']

// --- ESTADO ---
type Phase = 'show' | 'input' | 'won' | 'lost'

const phase = ref<Phase>('show')
const round = ref(0) // indice 0-based sobre ROUNDS
const sequence = ref<string[]>([]) // receta de la ronda (precomputada, nada de random en template)
const shownEmoji = ref<string | null>(null) // ingrediente visible durante la muestra
const inputIdx = ref(0) // progreso del jugador en la secuencia
const done = ref(false)

// Timers pendientes (se limpian todos en start/unmount)
let timers: number[] = []

function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}

function clearTimers() {
  timers.forEach(t => clearTimeout(t))
  timers = []
}

// --- RONDAS ---
function buildSequence(len: number): string[] {
  const seq: string[] = []
  for (let i = 0; i < len; i++) {
    seq.push(PANTRY[Math.floor(Math.random() * PANTRY.length)] ?? '🍅')
  }
  return seq
}

function startRound() {
  const len = ROUNDS[round.value] ?? 3
  sequence.value = buildSequence(len)
  inputIdx.value = 0
  shownEmoji.value = null
  phase.value = 'show'

  // Muestra secuencial: cada paso enciende y apaga su ingrediente
  sequence.value.forEach((emoji, i) => {
    later(() => { shownEmoji.value = emoji }, ROUND_PAUSE_MS + i * SHOW_STEP_MS)
    later(() => { shownEmoji.value = null }, ROUND_PAUSE_MS + i * SHOW_STEP_MS + SHOW_VISIBLE_MS)
  })

  // Fin de la muestra: turno del jugador
  later(() => { phase.value = 'input' }, ROUND_PAUSE_MS + sequence.value.length * SHOW_STEP_MS)
}

// --- INPUT ---
function onPick(emoji: string) {
  if (!props.active || done.value || phase.value !== 'input') return

  const expected = sequence.value[inputIdx.value] ?? ''
  if (emoji !== expected) {
    lose()
    return
  }

  inputIdx.value++
  if (inputIdx.value < sequence.value.length) return

  // Ronda completada
  if (round.value >= ROUNDS.length - 1) {
    win()
  } else {
    round.value++
    startRound()
  }
}

// --- RESULTADO ---
function win() {
  if (done.value) return
  done.value = true
  phase.value = 'won'
  clearTimers()
  timers.push(window.setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS))
}

function lose() {
  if (done.value) return
  done.value = true
  phase.value = 'lost'
  clearTimers()
  timers.push(window.setTimeout(() => props.onComplete(false), FEEDBACK_DELAY_MS))
}

// --- CICLO DE VIDA ---
function start() {
  clearTimers()
  round.value = 0
  done.value = false
  startRound()
}

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(clearTimers)
</script>

<template>
  <div class="recipe-game">
    <!-- HUD: ronda y fase -->
    <div v-if="active" class="hud">
      <span class="hud-round">Ronda {{ round + 1 }}/{{ ROUNDS.length }}</span>
      <span class="hud-phase">
        {{ phase === 'show' ? 'Memoriza la receta...' : phase === 'input' ? 'Tu turno!' : '' }}
      </span>
    </div>

    <!-- Zona de muestra: la olla y el ingrediente actual -->
    <div class="pot-area">
      <div class="pot-display" :class="{ showing: shownEmoji !== null }">
        <span v-if="shownEmoji" class="pot-emoji">{{ shownEmoji }}</span>
        <span v-else class="pot-idle">🍲</span>
      </div>

      <!-- Progreso de la secuencia (puntos) -->
      <div class="seq-dots">
        <span
          v-for="(_, i) in sequence"
          :key="i"
          class="dot"
          :class="{ filled: phase === 'input' && i < inputIdx }"
        ></span>
      </div>
    </div>

    <!-- Despensa: grid fijo 2x3 -->
    <div class="pantry" :class="{ locked: phase !== 'input' }">
      <button
        v-for="ing in PANTRY"
        :key="ing"
        class="pantry-btn"
        @touchstart.prevent="onPick(ing)"
        @mousedown="onPick(ing)"
      >
        {{ ing }}
      </button>
    </div>

    <!-- Derrota: ingrediente equivocado -->
    <div v-if="phase === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">🙈</span>
      <span class="overlay-text">Esa no era!</span>
    </div>

    <!-- Victoria -->
    <div v-if="phase === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">🍲</span>
      <span class="overlay-text">Receta perfecta!</span>
    </div>
  </div>
</template>

<style scoped>
.recipe-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* Cocina: marrones y naranjas oscuros */
  background: linear-gradient(180deg, #3e2723 0%, #4e342e 45%, #6d4022 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  pointer-events: none;
}

.hud-round {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
}

.hud-phase {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  min-height: 20px;
}

/* === ZONA DE MUESTRA === */
.pot-area {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  z-index: 5;
  pointer-events: none;
}

.pot-display {
  width: 110px;
  height: 110px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 213, 79, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.pot-display.showing {
  border-color: #ffd54f;
  background: rgba(255, 213, 79, 0.12);
}

.pot-emoji {
  font-size: 62px;
  line-height: 1;
  animation: ing-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pot-idle {
  font-size: 44px;
  line-height: 1;
  opacity: 0.45;
}

@keyframes ing-pop {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Puntos de progreso de la secuencia */
.seq-dots {
  display: flex;
  gap: 10px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  transition: background 0.15s ease, transform 0.15s ease;
}

.dot.filled {
  background: #ffd54f;
  transform: scale(1.2);
}

/* === DESPENSA === */
.pantry {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
  z-index: 10;
}

.pantry.locked {
  opacity: 0.45;
  pointer-events: none;
}

.pantry-btn {
  width: 78px;
  height: 78px;
  border-radius: 16px;
  border: 2px solid rgba(255, 213, 79, 0.3);
  background: rgba(0, 0, 0, 0.3);
  font-size: 40px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.1s ease;
}

.pantry-btn:active {
  transform: scale(0.9);
  background: rgba(255, 213, 79, 0.2);
}

/* === OVERLAYS DE RESULTADO === */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: overlay-in 0.25s ease;
  pointer-events: none;
}

.overlay-lose { background: rgba(30, 20, 15, 0.7); }
.overlay-win { background: rgba(255, 255, 255, 0.2); }

.overlay-icon {
  font-size: 72px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.overlay-lose .overlay-text { color: #ff8a65; }
.overlay-win .overlay-text { color: #ffd54f; }

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlay-pop {
  0% { transform: scale(0) rotate(-25deg); }
  60% { transform: scale(1.25) rotate(8deg); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
