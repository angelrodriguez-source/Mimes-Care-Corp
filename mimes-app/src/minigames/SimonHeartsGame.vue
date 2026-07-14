<script setup lang="ts">
/**
 * SimonHeartsGame.vue — Mini-juego avanzado de cariño
 *
 * Mecanica: "Simon dice" con 4 corazones de colores en grid 2x2.
 * 3 rondas con secuencias de longitud 3, 4 y 5. En cada ronda el juego
 * reproduce la secuencia iluminando los corazones ("Observa...") y
 * despues el jugador debe tocarlos en el mismo orden ("Tu turno!").
 * Un fallo = derrota inmediata. Completar las 3 rondas = victoria.
 *
 * El shell (MiniGameShell) gestiona cuenta atras, timer y resultado;
 * este componente solo avisa via onComplete(success).
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Longitud de la secuencia de cada ronda */
const ROUND_LENGTHS = [3, 4, 5]
/** Tiempo que cada corazon permanece iluminado durante la reproduccion */
const SHOW_MS = 500
/** Pausa entre corazones de la secuencia */
const GAP_MS = 200
/** Retardo antes de empezar a reproducir una secuencia */
const START_DELAY_MS = 600
/** Duracion del brillo al tocar un corazon correcto */
const FLASH_MS = 250
/** Duracion de la celebracion entre rondas */
const CELEBRATION_MS = 900
/** Pausa mostrando el overlay final antes de llamar a onComplete */
const END_DELAY_MS = 700

/** Los 4 corazones: emoji + color del glow */
const HEARTS = [
  { emoji: '❤️', color: '#ff5252' },
  { emoji: '💛', color: '#ffd740' },
  { emoji: '💙', color: '#448aff' },
  { emoji: '💚', color: '#69f0ae' },
] as const

// --- ESTADO ---
type Phase = 'showing' | 'input' | 'celebrating'
type Outcome = 'playing' | 'won' | 'lost'

const phase = ref<Phase>('showing')
const outcome = ref<Outcome>('playing')
const round = ref(1)
/** Corazon iluminado durante la reproduccion (null = ninguno) */
const litIndex = ref<number | null>(null)
/** Corazon que brilla brevemente tras un toque correcto */
const flashIndex = ref<number | null>(null)
/** Posicion del jugador dentro de la secuencia actual */
const inputIdx = ref(0)
/** Evita doble onComplete */
const done = ref(false)

/** Secuencias precomputadas en start() (indices 0-3 de HEARTS) */
let sequences: number[][] = []

// --- TIMEOUTS (todos registrados para limpiarlos) ---
const timers: number[] = []

function after(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms))
}

function clearAllTimers() {
  timers.forEach(id => clearTimeout(id))
  timers.length = 0
}

// --- COMPUTED ---
const phaseText = computed(() => {
  if (phase.value === 'showing') return 'Observa...'
  if (phase.value === 'input') return 'Tu turno!'
  return 'Muy bien!'
})

// --- LOGICA ---

/** Resetea todo el estado y genera las secuencias de las 3 rondas */
function start() {
  clearAllTimers()
  done.value = false
  outcome.value = 'playing'
  round.value = 1
  inputIdx.value = 0
  litIndex.value = null
  flashIndex.value = null
  sequences = ROUND_LENGTHS.map(len =>
    Array.from({ length: len }, () => Math.floor(Math.random() * HEARTS.length)),
  )
  playSequence()
}

/** Reproduce la secuencia de la ronda actual iluminando cada corazon */
function playSequence() {
  phase.value = 'showing'
  litIndex.value = null
  inputIdx.value = 0
  const seq = sequences[round.value - 1] ?? []

  seq.forEach((heartIdx, i) => {
    const t = START_DELAY_MS + i * (SHOW_MS + GAP_MS)
    after(t, () => { litIndex.value = heartIdx })
    after(t + SHOW_MS, () => { litIndex.value = null })
  })

  // Al terminar la reproduccion, turno del jugador
  after(START_DELAY_MS + seq.length * (SHOW_MS + GAP_MS), () => {
    if (done.value) return
    phase.value = 'input'
  })
}

/** Toque del jugador sobre el corazon idx */
function onHeartTap(idx: number) {
  if (!props.active || done.value || phase.value !== 'input') return

  const seq = sequences[round.value - 1] ?? []
  const expected = seq[inputIdx.value] ?? -1

  if (idx !== expected) {
    lose()
    return
  }

  // Correcto: brillo breve
  flashIndex.value = idx
  after(FLASH_MS, () => {
    if (flashIndex.value === idx) flashIndex.value = null
  })

  inputIdx.value++
  if (inputIdx.value < seq.length) return

  // Ronda completada
  if (round.value >= ROUND_LENGTHS.length) {
    win()
    return
  }

  // Pequena celebracion y siguiente ronda
  phase.value = 'celebrating'
  after(CELEBRATION_MS, () => {
    if (done.value) return
    round.value++
    playSequence()
  })
}

function win() {
  if (done.value) return
  done.value = true
  outcome.value = 'won'
  after(END_DELAY_MS, () => props.onComplete(true))
}

function lose() {
  if (done.value) return
  done.value = true
  outcome.value = 'lost'
  after(END_DELAY_MS, () => props.onComplete(false))
}

// --- CICLO DE VIDA ---
watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearAllTimers()
})
</script>

<template>
  <div class="simon-game">
    <!-- HUD: ronda y fase -->
    <div v-if="active" class="hud">
      <span class="hud-round">Ronda {{ round }}/{{ ROUND_LENGTHS.length }}</span>
      <span
        class="hud-phase"
        :class="{ 'phase-input': phase === 'input', 'phase-celebrating': phase === 'celebrating' }"
      >{{ phaseText }}</span>
    </div>

    <!-- Grid 2x2 de corazones -->
    <div class="hearts-grid">
      <div
        v-for="(heart, i) in HEARTS"
        :key="i"
        class="heart-card"
        :class="{
          lit: litIndex === i,
          flash: flashIndex === i,
          waiting: phase !== 'input' || done,
        }"
        :style="{ '--glow': heart.color }"
        @touchstart.prevent="onHeartTap(i)"
        @mousedown="onHeartTap(i)"
      >
        <span class="heart-emoji">{{ heart.emoji }}</span>
      </div>
    </div>

    <!-- Celebracion entre rondas -->
    <div v-if="phase === 'celebrating' && outcome === 'playing'" class="round-clear">
      ✨ Ronda superada!
    </div>

    <!-- Derrota -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">💔</span>
      <span class="overlay-text">Secuencia incorrecta</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">💖</span>
      <span class="overlay-text">Cuanto cariño!</span>
    </div>
  </div>
</template>

<style scoped>
.simon-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #4a148c 0%, #6a1b6e 55%, #880e4f 100%);
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
  gap: 4px;
  z-index: 20;
}

.hud-round {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-phase {
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
  font-weight: 600;
  animation: phase-pulse 1.2s ease-in-out infinite;
}

.hud-phase.phase-input {
  color: #f8bbd0;
}

.hud-phase.phase-celebrating {
  color: #a5d6a7;
  animation: none;
}

@keyframes phase-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* === GRID DE CORAZONES === */
.hearts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 18px;
  width: min(78vw, 340px);
  aspect-ratio: 1;
}

.heart-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 22px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

/* Durante la reproduccion / overlay no hay input */
.heart-card.waiting {
  cursor: default;
}

.heart-emoji {
  font-size: clamp(44px, 14vw, 64px);
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

/* Corazon iluminado en la secuencia: glow + escala */
.heart-card.lit {
  transform: scale(1.12);
  border-color: var(--glow);
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 26px 8px var(--glow);
}

/* Brillo breve al toque correcto */
.heart-card.flash {
  transform: scale(1.06);
  border-color: var(--glow);
  box-shadow: 0 0 18px 5px var(--glow);
}

/* === CELEBRACION ENTRE RONDAS === */
.round-clear {
  position: absolute;
  top: 24%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff59d;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  z-index: 25;
  pointer-events: none;
  animation: clear-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes clear-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
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

.overlay-lose { background: rgba(30, 15, 25, 0.7); }
.overlay-win { background: rgba(255, 182, 213, 0.25); }

.overlay-icon {
  font-size: 76px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.overlay-lose .overlay-text { color: #ff8a80; }
.overlay-win .overlay-text { color: #fce4ec; }

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
