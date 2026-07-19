<script setup lang="ts">
/**
 * BubblePopGame.vue — Mini-juego facil de limpiar (explotar pompas)
 *
 * Mecanica: pompas de jabon suben desde abajo a distintas velocidades.
 * El jugador toca las pompas para explotarlas. Con POPS_TO_WIN explotadas
 * gana. No hay derrota directa: la presion la pone el tiempo del shell.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Pompas que hay que explotar para ganar */
const POPS_TO_WIN = 10
/** Intervalo de aparicion de pompas (ms) */
const SPAWN_MS = 450
/** Velocidad vertical minima/maxima (% de pantalla por segundo) */
const SPEED_MIN = 16
const SPEED_MAX = 34
/** Tamano minimo/maximo de pompa (px) */
const SIZE_MIN = 40
const SIZE_MAX = 68
/** Tiempo que dura la animacion de explosion antes de retirar la pompa (ms) */
const POP_ANIM_MS = 280
/** Pausa del overlay de victoria antes de avisar al shell (ms) */
const FEEDBACK_DELAY_MS = 700

interface Bubble {
  id: number
  /** Centro X base (%) — el balanceo se suma encima */
  baseX: number
  /** Posicion X actual (%) tras aplicar el balanceo */
  x: number
  /** Posicion Y del centro (%) — 0 arriba, 100 abajo */
  y: number
  size: number
  /** Velocidad de subida (%/s) */
  speed: number
  /** Parametros del balanceo lateral (precomputados, nada de random en template) */
  wobbleAmp: number
  wobbleFreq: number
  wobblePhase: number
  popped: boolean
  poppedAt: number
}

// --- ESTADO ---
const bubbles = ref<Bubble[]>([])
const pops = ref(0)
const won = ref(false)

let done = false
let nextId = 0
let rafId: number | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null
let lastTs = 0
let spawnAccum = 0
/** Tiempo total de juego (s), para el balanceo sinusoidal */
let elapsed = 0

// --- CICLO DE JUEGO ---

function spawnBubble() {
  bubbles.value.push({
    id: nextId++,
    baseX: 10 + Math.random() * 80,
    x: 0,
    y: 108,
    size: SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN),
    speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
    wobbleAmp: 2 + Math.random() * 4,
    wobbleFreq: 1.5 + Math.random() * 2,
    wobblePhase: Math.random() * Math.PI * 2,
    popped: false,
    poppedAt: 0,
  })
}

function tick(ts: number) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05)
  lastTs = ts
  elapsed += dt
  spawnAccum += dt * 1000

  // Aparicion periodica de pompas
  while (spawnAccum >= SPAWN_MS) {
    spawnAccum -= SPAWN_MS
    spawnBubble()
  }

  const now = performance.now()
  for (const b of bubbles.value) {
    if (b.popped) continue
    b.y -= b.speed * dt
    b.x = b.baseX + Math.sin(elapsed * b.wobbleFreq + b.wobblePhase) * b.wobbleAmp
  }

  // Retira pompas que salieron por arriba o ya terminaron su explosion
  bubbles.value = bubbles.value.filter(
    b => (b.popped ? now - b.poppedAt < POP_ANIM_MS : b.y > -12),
  )

  rafId = requestAnimationFrame(tick)
}

function popBubble(b: Bubble) {
  if (!props.active || done || b.popped) return
  b.popped = true
  b.poppedAt = performance.now()
  pops.value++
  if (pops.value >= POPS_TO_WIN) win()
}

function win() {
  if (done) return
  done = true
  won.value = true
  stopLoop()
  feedbackTimer = setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

// --- CICLO DE VIDA ---

function stopLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
}

function start() {
  stopLoop()
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = null
  bubbles.value = []
  pops.value = 0
  won.value = false
  done = false
  nextId = 0
  spawnAccum = 0
  elapsed = 0
  lastTs = performance.now()
  rafId = requestAnimationFrame(tick)
}

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(() => {
  stopLoop()
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

<template>
  <div class="bubble-game">
    <!-- Pompas -->
    <div
      v-for="b in bubbles"
      :key="b.id"
      class="bubble"
      :class="{ popped: b.popped }"
      :style="{
        left: b.x + '%',
        top: b.y + '%',
        width: b.size + 'px',
        height: b.size + 'px',
      }"
      @touchstart.prevent="popBubble(b)"
      @mousedown="popBubble(b)"
    ></div>

    <!-- HUD de progreso -->
    <div v-if="active" class="hud">🫧 {{ pops }} / {{ POPS_TO_WIN }}</div>

    <!-- Victoria -->
    <div v-if="won" class="overlay">
      <span class="overlay-icon">✨</span>
      <span class="overlay-text">Burbujeante!</span>
    </div>
  </div>
</template>

<style scoped>
.bubble-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  touch-action: none;
  cursor: pointer;
  /* Fondo azul agua */
  background: linear-gradient(180deg, #4fc3f7 0%, #29b6f6 40%, #0277bd 100%);
}

/* === POMPAS === */
.bubble {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 30%,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.35) 28%,
    rgba(179, 229, 252, 0.12) 60%,
    rgba(255, 255, 255, 0.45) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.35);
  transition: transform 0.25s ease-out, opacity 0.25s ease-out;
}

/* Explosion: escala rapida + desvanecimiento */
.bubble.popped {
  transform: translate(-50%, -50%) scale(1.7);
  opacity: 0;
  pointer-events: none;
}

/* === HUD === */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  color: #ffd54f;
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(0, 0, 0, 0.45);
  padding: 6px 16px;
  border-radius: 20px;
  pointer-events: none;
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
  background: rgba(255, 255, 255, 0.25);
  pointer-events: none;
  animation: overlay-in 0.25s ease;
}

.overlay-icon {
  font-size: 72px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  color: #01579b;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8);
}

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
