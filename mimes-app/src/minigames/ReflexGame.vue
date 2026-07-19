<script setup lang="ts">
/**
 * ReflexGame.vue — Mini-juego avanzado de jugar
 *
 * Mecanica: "Semaforo". Cada ronda la pantalla se pone roja (🔴 "Espera...")
 * durante un tiempo aleatorio de 1-3s (precomputado en start()) y despues
 * verde (🟢 "TOCA!"). Tocar en verde en menos de 650ms es acierto (muestra
 * el tiempo de reaccion); tocar en rojo o tardar mas de 650ms es fallo.
 * 5 rondas, se necesitan 4 aciertos; al segundo fallo, derrota inmediata.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const ROUNDS = 5            // rondas totales
const REQUIRED = 4          // aciertos necesarios
const MAX_FAILS = 2         // al segundo fallo, derrota inmediata
const REACT_LIMIT = 650     // ms maximos de reaccion en verde
const WAIT_MIN = 1000       // espera minima en rojo (ms)
const WAIT_MAX = 3000       // espera maxima en rojo (ms)
const GAP_HIT = 750         // pausa tras acierto antes de la siguiente ronda
const GAP_FAIL = 950        // pausa tras primer fallo

type Phase = 'wait' | 'go' | 'feedback'
type FailKind = 'early' | 'slow'

// --- STATE ---
const round = ref(1)
const hits = ref(0)
const fails = ref(0)
const phase = ref<Phase>('wait')
const reactionMs = ref<number | null>(null)  // tiempo de reaccion del ultimo acierto
const failKind = ref<FailKind | null>(null)  // tipo del ultimo fallo (para feedback/overlay)
const won = ref(false)
const lost = ref(false)
const done = ref(false)

let waits: number[] = []    // esperas en rojo por ronda, precomputadas en start()
let greenAt = 0             // timestamp del cambio a verde
let waitTimeout = 0
let slowTimeout = 0
let nextTimeout = 0
let endTimeout = 0

// --- INICIO / RESET ---
function start() {
  round.value = 1
  hits.value = 0
  fails.value = 0
  phase.value = 'wait'
  reactionMs.value = null
  failKind.value = null
  won.value = false
  lost.value = false
  done.value = false
  clearTimeout(waitTimeout)
  clearTimeout(slowTimeout)
  clearTimeout(nextTimeout)
  clearTimeout(endTimeout)
  // Esperas aleatorias precomputadas (nada de Math.random durante el juego/template)
  waits = Array.from({ length: ROUNDS }, () => WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN))
  startRound()
}

// Arranca la fase roja de la ronda actual
function startRound() {
  phase.value = 'wait'
  reactionMs.value = null
  failKind.value = null
  clearTimeout(waitTimeout)
  waitTimeout = window.setTimeout(goGreen, waits[round.value - 1] ?? 2000)
}

// Cambio a verde: empieza a contar la reaccion
function goGreen() {
  phase.value = 'go'
  greenAt = performance.now()
  clearTimeout(slowTimeout)
  slowTimeout = window.setTimeout(() => fail('slow'), REACT_LIMIT)
}

// --- INPUT: toque en cualquier parte de la pantalla ---
function onTap() {
  if (!props.active || done.value) return

  if (phase.value === 'wait') {
    fail('early') // anticipacion: ha tocado en rojo
    return
  }

  if (phase.value === 'go') {
    clearTimeout(slowTimeout)
    hit(Math.round(performance.now() - greenAt))
  }
  // en 'feedback' se ignora el toque
}

// Acierto: guarda el tiempo de reaccion y avanza
function hit(ms: number) {
  hits.value++
  reactionMs.value = ms
  phase.value = 'feedback'

  if (hits.value >= REQUIRED) {
    done.value = true
    won.value = true
    endTimeout = window.setTimeout(() => props.onComplete(true), 700)
    return
  }

  clearTimeout(nextTimeout)
  nextTimeout = window.setTimeout(nextRound, GAP_HIT)
}

// Fallo (anticipacion o lentitud): al segundo, derrota inmediata
function fail(kind: FailKind) {
  clearTimeout(waitTimeout)
  clearTimeout(slowTimeout)
  fails.value++
  failKind.value = kind
  phase.value = 'feedback'

  if (fails.value >= MAX_FAILS) {
    done.value = true
    lost.value = true
    endTimeout = window.setTimeout(() => props.onComplete(false), 700)
    return
  }

  clearTimeout(nextTimeout)
  nextTimeout = window.setTimeout(nextRound, GAP_FAIL)
}

function nextRound() {
  round.value++
  startRound()
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  clearTimeout(waitTimeout)
  clearTimeout(slowTimeout)
  clearTimeout(nextTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div
    class="reflex-game"
    :class="{ red: phase === 'wait' && !done, green: phase === 'go' && !done }"
    @touchstart.prevent="onTap"
    @mousedown="onTap"
  >
    <!-- HUD: ronda actual -->
    <div class="hud">
      <span class="hud-count">Ronda {{ Math.min(round, ROUNDS) }}/{{ ROUNDS }}</span>
    </div>

    <!-- Fase roja: espera -->
    <template v-if="phase === 'wait'">
      <div class="signal">🔴</div>
      <p class="signal-text">Espera...</p>
    </template>

    <!-- Fase verde: toca ya -->
    <template v-else-if="phase === 'go'">
      <div class="signal pulse">🟢</div>
      <p class="signal-text go-text">TOCA!</p>
    </template>

    <!-- Feedback entre rondas -->
    <template v-else-if="!done">
      <template v-if="reactionMs !== null">
        <div class="signal">⚡</div>
        <p class="signal-text hit-text">{{ reactionMs }} ms</p>
      </template>
      <template v-else-if="failKind === 'early'">
        <div class="signal">😅</div>
        <p class="signal-text fail-text">Te has adelantado!</p>
      </template>
      <template v-else>
        <div class="signal">🐌</div>
        <p class="signal-text fail-text">Muy lento!</p>
      </template>
    </template>

    <p v-if="!done" class="instruction">Toca solo cuando la pantalla este en verde</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">⚡</div>
      <p class="overlay-text win">Reflejos de gato!</p>
    </div>

    <!-- Overlay de derrota (segun el tipo del ultimo fallo) -->
    <div v-if="lost" class="overlay">
      <div class="overlay-emoji">{{ failKind === 'early' ? '😅' : '🐌' }}</div>
      <p class="overlay-text lose">{{ failKind === 'early' ? 'Te has adelantado!' : 'Demasiado lento!' }}</p>
    </div>
  </div>
</template>

<style scoped>
.reflex-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #1a1f2e;
  transition: background 0.12s linear;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.reflex-game.red {
  background: radial-gradient(circle at 50% 45%, #7a1f1f 0%, #4a1010 70%);
}

.reflex-game.green {
  background: radial-gradient(circle at 50% 45%, #2e7d32 0%, #1b4d1e 70%);
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

.hud-count {
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

/* --- SEMAFORO --- */
.signal {
  font-size: 84px;
  pointer-events: none;
  filter: drop-shadow(0 0 16px rgba(0, 0, 0, 0.4));
}

.signal.pulse {
  animation: signal-pulse 0.3s ease-in-out infinite;
}

@keyframes signal-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

.signal-text {
  margin-top: 12px;
  font-size: 26px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.go-text {
  color: #b9f6ca;
  animation: signal-pulse 0.3s ease-in-out infinite;
}

.hit-text { color: #ffd54f; }
.fail-text { color: #ff8a65; }

.instruction {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  pointer-events: none;
}

/* --- OVERLAYS --- */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(10, 14, 24, 0.78);
  z-index: 50;
  animation: overlay-in 0.3s ease;
}

.overlay-emoji {
  font-size: 72px;
}

.overlay-text {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.overlay-text.win { color: #ffd54f; }
.overlay-text.lose { color: #f44336; }

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
