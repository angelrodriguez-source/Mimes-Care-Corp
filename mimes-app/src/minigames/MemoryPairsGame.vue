<script setup lang="ts">
/**
 * MemoryPairsGame.vue — Mini-juego avanzado de jugar
 *
 * Mecanica: memoria de parejas. 6 cartas boca abajo en grid 3x2
 * (3 parejas de juguetes 🎾🧸🪀, barajadas en start()). Se tocan
 * 2 cartas: si coinciden quedan fijas boca arriba; si no, se
 * ocultan tras un momento (input bloqueado mientras). Encontrar
 * las 3 parejas = victoria. Al 6º fallo (pareja no coincidente),
 * derrota. El shell da 25 segundos.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Emojis de las 3 parejas */
const TOYS = ['🎾', '🧸', '🪀'] as const
/** Parejas necesarias para ganar */
const TOTAL_PAIRS = TOYS.length
/** Fallos tolerados: al superar este numero (6º fallo), derrota */
const MAX_FAILS = 5
/** Tiempo que las cartas no coincidentes permanecen visibles */
const HIDE_MS = 700
/** Pausa mostrando el overlay final antes de llamar a onComplete */
const END_DELAY_MS = 700

// --- ESTADO ---
type Outcome = 'playing' | 'won' | 'lost'

/** Emoji de cada carta segun su posicion (barajado en start()) */
const cards = ref<string[]>([])
/** Indices de las cartas volteadas de la jugada actual (0, 1 o 2) */
const flipped = ref<number[]>([])
/** Indices de cartas ya emparejadas (fijas boca arriba) */
const matched = ref<Set<number>>(new Set())
/** Fallos acumulados (parejas no coincidentes) */
const fails = ref(0)
const outcome = ref<Outcome>('playing')
/** Input bloqueado mientras se ocultan cartas no coincidentes */
const locked = ref(false)
/** Evita doble onComplete */
const done = ref(false)

// --- TIMEOUTS (registrados para limpiarlos) ---
const timers: number[] = []

function after(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms))
}

function clearAllTimers() {
  timers.forEach(id => clearTimeout(id))
  timers.length = 0
}

// --- COMPUTED ---
const pairsFound = computed(() => matched.value.size / 2)
const failsLeft = computed(() => Math.max(0, MAX_FAILS - fails.value))

function isFaceUp(idx: number): boolean {
  return flipped.value.includes(idx) || matched.value.has(idx)
}

// --- LOGICA ---

/** Baraja in-place (Fisher-Yates) */
function shuffle(arr: string[]): string[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i] ?? ''
    arr[i] = arr[j] ?? ''
    arr[j] = tmp
  }
  return arr
}

/** Resetea todo el estado y reparte las cartas barajadas */
function start() {
  clearAllTimers()
  done.value = false
  outcome.value = 'playing'
  flipped.value = []
  matched.value = new Set()
  fails.value = 0
  locked.value = false
  cards.value = shuffle([...TOYS, ...TOYS])
}

/** Toque sobre la carta idx */
function onCardTap(idx: number) {
  if (!props.active || done.value || locked.value) return
  if (isFaceUp(idx)) return

  flipped.value = [...flipped.value, idx]
  if (flipped.value.length < 2) return

  // Segunda carta: comprobar pareja
  const a = flipped.value[0] ?? -1
  const b = flipped.value[1] ?? -1
  locked.value = true

  if (cards.value[a] === cards.value[b]) {
    // Pareja encontrada: quedan fijas boca arriba
    matched.value = new Set([...matched.value, a, b])
    flipped.value = []
    locked.value = false
    if (pairsFound.value >= TOTAL_PAIRS) win()
    return
  }

  // Fallo: mostrar un momento y decidir
  fails.value++
  if (fails.value > MAX_FAILS) {
    // 6º fallo: derrota (se dejan ver las cartas antes del overlay)
    after(HIDE_MS, () => lose())
    return
  }
  after(HIDE_MS, () => {
    flipped.value = []
    locked.value = false
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
  <div class="memory-game">
    <!-- HUD: parejas y fallos restantes -->
    <div v-if="active" class="hud">
      <span class="hud-pairs">Parejas {{ pairsFound }}/{{ TOTAL_PAIRS }}</span>
      <span class="hud-fails" :class="{ danger: failsLeft <= 1 }">
        Fallos restantes: {{ failsLeft }}
      </span>
    </div>

    <!-- Grid 3x2 de cartas -->
    <div class="cards-grid">
      <div
        v-for="(toy, i) in cards"
        :key="i"
        class="card"
        :class="{ up: isFaceUp(i), matched: matched.has(i) }"
        @touchstart.prevent="onCardTap(i)"
        @mousedown="onCardTap(i)"
      >
        <div class="card-inner">
          <div class="card-face card-back">❓</div>
          <div class="card-face card-front">{{ toy }}</div>
        </div>
      </div>
    </div>

    <!-- Derrota -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">😵</span>
      <span class="overlay-text">¡Demasiados intentos!</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">🎉</span>
      <span class="overlay-text">¡Todas las parejas!</span>
    </div>
  </div>
</template>

<style scoped>
.memory-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #311b92 0%, #4a148c 55%, #6a1b9a 100%);
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

.hud-pairs {
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-fails {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 600;
}

.hud-fails.danger {
  color: #ff8a80;
}

/* === GRID DE CARTAS === */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
  width: min(82vw, 330px);
  aspect-ratio: 3 / 2.4;
}

.card {
  perspective: 500px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Volteo 3D de la carta */
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

.card.up .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  font-size: clamp(28px, 9vw, 42px);
  line-height: 1;
}

.card-back {
  background: linear-gradient(145deg, #7e57c2, #5e35b1);
  border: 2px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}

.card-front {
  background: rgba(255, 255, 255, 0.14);
  border: 2px solid rgba(255, 255, 255, 0.35);
  transform: rotateY(180deg);
}

/* Pareja encontrada: brillo fijo */
.card.matched .card-front {
  border-color: #ffd54f;
  box-shadow: 0 0 14px 3px rgba(255, 213, 79, 0.5);
  animation: match-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes match-pop {
  0% { transform: rotateY(180deg) scale(0.85); }
  60% { transform: rotateY(180deg) scale(1.08); }
  100% { transform: rotateY(180deg) scale(1); }
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
  pointer-events: none;
  animation: overlay-in 0.25s ease;
}

.overlay-lose { background: rgba(25, 12, 40, 0.7); }
.overlay-win { background: rgba(255, 213, 79, 0.18); }

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
.overlay-win .overlay-text { color: #fff59d; }

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
