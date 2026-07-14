<script setup lang="ts">
/**
 * FeedCatchGame.vue — Mini-juego avanzado de alimentar
 *
 * Mecanica: una cesta en la parte baja sigue horizontalmente el dedo/raton
 * (arrastrando en cualquier parte de la pantalla). Caen alimentos desde
 * arriba en posiciones X aleatorias: comida buena y podrida (~25%).
 * Atrapar comida buena suma 1 punto (objetivo: 10). Atrapar una podrida
 * es derrota inmediata. Dejar caer comida buena no penaliza — la presion
 * la pone el timer del shell.
 *
 * Detalles de implementacion:
 * - Bucle con requestAnimationFrame y delta de tiempo (dt).
 * - Velocidad de caida proporcional a la altura de pantalla, con un
 *   ligero aumento progresivo durante la partida.
 * - Captura: cuando un item cruza la altura de la cesta se comprueba
 *   |itemX - cestaX| < anchura de captura (escalada al ancho de pantalla).
 * - Pointer Events unificados (raton + tactil) con captura de puntero.
 */
import { ref, watch, onUnmounted, onMounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Puntos necesarios para ganar */
const GOAL = 10
/** Intervalo de aparicion de items (ms) */
const SPAWN_MS = 700
/** Probabilidad de que un item sea comida podrida */
const BAD_CHANCE = 0.25
/** Semi-anchura de captura en px (baseline 375 de ancho) */
const CATCH_HALF = 48
/** Velocidad base de caida (fraccion de la altura de pantalla por segundo) */
const FALL_SPEED = 0.4
/** Aceleracion progresiva (por ms) — ~+2% de velocidad por segundo */
const ACCEL = 0.00002
/** Distancia de la linea de captura al borde inferior (px) */
const BASKET_BOTTOM = 72
/** Pausa para mostrar el overlay de resultado antes de cerrar */
const FEEDBACK_DELAY_MS = 700

const GOOD_FOODS = ['🍎', '🍖', '🥕', '🍌', '🧀', '🍇']
const BAD_FOODS = ['🤢', '🦠', '🗑️']

// --- ESTADO ---
interface FoodItem {
  id: number
  x: number
  y: number
  emoji: string
  bad: boolean
  /** Ya paso por la linea de captura (evita comprobar dos veces) */
  checked: boolean
}

const containerRef = ref<HTMLElement | null>(null)
const W = ref(375)
const H = ref(667)

const items = ref<FoodItem[]>([])
const score = ref(0)
const basketX = ref(187)

type Outcome = 'playing' | 'won' | 'lost'
const outcome = ref<Outcome>('playing')
const done = ref(false)

/** Feedback visual al atrapar comida buena (key cambia y reinicia la animacion) */
const catchFx = ref<{ id: number; x: number } | null>(null)

// Internos del bucle (no reactivos)
let rafId = 0
let completeTimer = 0
let lastTs = 0
let elapsed = 0
let spawnAcc = 0
let nextId = 0
let pointerActive = false

// --- MEDICION ---
function measure() {
  if (containerRef.value) {
    W.value = containerRef.value.clientWidth
    H.value = containerRef.value.clientHeight
  }
}

// --- SPAWN ---
function spawnItem() {
  const bad = Math.random() < BAD_CHANCE
  const pool = bad ? BAD_FOODS : GOOD_FOODS
  const emoji = pool[Math.floor(Math.random() * pool.length)] ?? '🍎'
  const margin = 30
  const x = margin + Math.random() * Math.max(1, W.value - margin * 2)
  items.value.push({ id: nextId++, x, y: -40, emoji, bad, checked: false })
}

// --- BUCLE PRINCIPAL ---
function tick(ts: number) {
  if (done.value || !props.active) return
  if (lastTs === 0) lastTs = ts
  const dt = Math.min(ts - lastTs, 50) // limita saltos si la pestana se pausa
  lastTs = ts
  elapsed += dt

  // Aparicion periodica de items
  spawnAcc += dt
  while (spawnAcc >= SPAWN_MS) {
    spawnAcc -= SPAWN_MS
    spawnItem()
  }

  // Velocidad en px/ms: proporcional a la altura y creciente con el tiempo
  const speed = (H.value * FALL_SPEED * (1 + elapsed * ACCEL)) / 1000
  const catchY = H.value - BASKET_BOTTOM
  const halfW = CATCH_HALF * (W.value / 375)

  const remaining: FoodItem[] = []
  for (const it of items.value) {
    const prevY = it.y
    it.y += speed * dt

    // Cruce de la linea de captura
    if (!it.checked && prevY < catchY && it.y >= catchY) {
      it.checked = true
      if (Math.abs(it.x - basketX.value) < halfW) {
        if (it.bad) {
          lose()
          return
        }
        score.value++
        catchFx.value = { id: nextId++, x: it.x }
        if (score.value >= GOAL) {
          win()
          return
        }
        continue // atrapado: se retira de la pantalla
      }
    }

    // Los no atrapados siguen cayendo hasta salir de pantalla
    if (it.y < H.value + 60) remaining.push(it)
  }
  items.value = remaining

  rafId = requestAnimationFrame(tick)
}

// --- RESULTADO ---
function win() {
  if (done.value) return
  done.value = true
  outcome.value = 'won'
  cancelAnimationFrame(rafId)
  completeTimer = window.setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

function lose() {
  if (done.value) return
  done.value = true
  outcome.value = 'lost'
  cancelAnimationFrame(rafId)
  completeTimer = window.setTimeout(() => props.onComplete(false), FEEDBACK_DELAY_MS)
}

// --- ENTRADA (Pointer Events) ---
function moveBasket(clientX: number) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const x = clientX - rect.left
  basketX.value = Math.min(Math.max(x, 30), rect.width - 30)
}

function onPointerDown(e: PointerEvent) {
  if (!props.active || done.value) return
  containerRef.value?.setPointerCapture(e.pointerId)
  pointerActive = true
  moveBasket(e.clientX)
}

function onPointerMove(e: PointerEvent) {
  if (!pointerActive || !props.active || done.value) return
  moveBasket(e.clientX)
}

function onPointerUp() {
  pointerActive = false
}

// --- CICLO DE VIDA ---
function start() {
  cancelAnimationFrame(rafId)
  clearTimeout(completeTimer)
  measure()
  items.value = []
  score.value = 0
  outcome.value = 'playing'
  done.value = false
  catchFx.value = null
  basketX.value = W.value / 2
  lastTs = 0
  elapsed = 0
  spawnAcc = 0
  pointerActive = false
  rafId = requestAnimationFrame(tick)
}

onMounted(measure)

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(completeTimer)
})
</script>

<template>
  <div
    ref="containerRef"
    class="feed-game"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- HUD: progreso -->
    <div v-if="active" class="hud">{{ score }}/{{ GOAL }}</div>

    <!-- Pista inicial -->
    <div v-if="active && score === 0 && outcome === 'playing'" class="hint">
      Atrapa la comida buena, esquiva la podrida!
    </div>

    <!-- Items cayendo -->
    <div
      v-for="it in items"
      :key="it.id"
      class="food-item"
      :style="{ left: it.x + 'px', top: it.y + 'px' }"
    >
      {{ it.emoji }}
    </div>

    <!-- Feedback al atrapar buena -->
    <div
      v-if="catchFx"
      :key="catchFx.id"
      class="catch-fx"
      :style="{ left: catchFx.x + 'px', top: H - BASKET_BOTTOM + 'px' }"
    >
      +1
    </div>

    <!-- Cesta -->
    <div class="basket" :style="{ left: basketX + 'px' }">🧺</div>

    <!-- Derrota: comida podrida -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">🤮</span>
      <span class="overlay-text">Comida podrida!</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">🎉</span>
      <span class="overlay-text">Buen provecho!</span>
    </div>
  </div>
</template>

<style scoped>
.feed-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #4e342e 0%, #5d4037 55%, #6d4c41 100%);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

/* === HUD === */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
  z-index: 20;
  pointer-events: none;
}

/* === PISTA === */
.hint {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.95);
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  z-index: 15;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  animation: hint-pulse 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* === ITEMS === */
.food-item {
  position: absolute;
  font-size: 34px;
  line-height: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 5;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
}

/* === CESTA === */
.basket {
  position: absolute;
  bottom: 36px;
  font-size: 52px;
  line-height: 1;
  transform: translate(-50%, 50%);
  pointer-events: none;
  z-index: 10;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.45));
}

/* === FEEDBACK DE CAPTURA === */
.catch-fx {
  position: absolute;
  transform: translate(-50%, -50%);
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  z-index: 12;
  animation: fx-float 0.6s ease-out forwards;
}

@keyframes fx-float {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.6); }
  60% { opacity: 1; transform: translate(-50%, -110%) scale(1.15); }
  100% { opacity: 0; transform: translate(-50%, -160%) scale(1); }
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

.overlay-lose { background: rgba(30, 20, 20, 0.65); }
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
