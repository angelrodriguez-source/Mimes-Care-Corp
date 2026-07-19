<script setup lang="ts">
/**
 * DustChaseGame.vue — Mini-juego avanzado de limpiar (caza el polvo)
 *
 * Mecanica: MOTE_COUNT motas de polvo rebotan por la pantalla con rumbo
 * erratico (cada ~800ms giran un poco). Si el puntero o el ultimo toque
 * esta cerca (<FLEE_DIST px), la mota HUYE acelerando en direccion
 * contraria. El jugador gana al atrapar todas. Sin derrota directa:
 * la presion la pone el tiempo del shell.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Numero de motas que hay que atrapar */
const MOTE_COUNT = 6
/** Distancia al puntero (px) por debajo de la cual la mota huye */
const FLEE_DIST = 80
/** Velocidad base minima/maxima (px/s) */
const SPEED_MIN = 55
const SPEED_MAX = 95
/** Velocidad al huir del puntero (px/s) */
const FLEE_SPEED = 230
/** Intervalo medio entre cambios de rumbo (ms) */
const TURN_MS = 800
/** Giro maximo por cambio de rumbo (radianes) */
const TURN_MAX = 0.9
/** Margen a los bordes para rebotar (px) */
const EDGE_MARGIN = 26
/** Pausa del overlay de victoria antes de avisar al shell (ms) */
const FEEDBACK_DELAY_MS = 700

interface Mote {
  id: number
  /** Posicion del centro (px, relativa al contenedor) */
  x: number
  y: number
  /** Rumbo actual (radianes) */
  angle: number
  /** Velocidad base propia (px/s) */
  speed: number
  /** Momento (ms de partida) del proximo cambio de rumbo */
  nextTurnAt: number
  caught: boolean
}

// --- ESTADO ---
const containerRef = ref<HTMLElement | null>(null)
const motes = ref<Mote[]>([])
const won = ref(false)
const caughtCount = computed(() => motes.value.filter(m => m.caught).length)

let done = false
let rafId: number | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null
let lastTs = 0
/** Tiempo de partida acumulado (ms), para los cambios de rumbo */
let gameTime = 0
/** Ultima posicion conocida del puntero/toque (px), null si aun no hubo */
let pointer: { x: number; y: number } | null = null

// --- CICLO DE JUEGO ---

/** Dimensiones actuales del contenedor, con fallback por si aun no midio */
function areaSize() {
  const el = containerRef.value
  return { w: el?.clientWidth || 320, h: el?.clientHeight || 480 }
}

function tick(ts: number) {
  const dt = Math.min((ts - lastTs) / 1000, 0.05)
  lastTs = ts
  gameTime += dt * 1000

  const { w, h } = areaSize()

  for (const m of motes.value) {
    if (m.caught) continue

    // Cambio erratico de rumbo cada ~TURN_MS
    if (gameTime >= m.nextTurnAt) {
      m.angle += (Math.random() - 0.5) * 2 * TURN_MAX
      m.nextTurnAt = gameTime + TURN_MS * (0.75 + Math.random() * 0.5)
    }

    // Huida: si el puntero esta cerca, acelera en direccion contraria
    let speed = m.speed
    if (pointer) {
      const dx = m.x - pointer.x
      const dy = m.y - pointer.y
      const dist = Math.hypot(dx, dy)
      if (dist < FLEE_DIST && dist > 0.01) {
        m.angle = Math.atan2(dy, dx)
        speed = FLEE_SPEED
      }
    }

    m.x += Math.cos(m.angle) * speed * dt
    m.y += Math.sin(m.angle) * speed * dt

    // Rebote en los bordes (refleja el rumbo y reencuadra)
    if (m.x < EDGE_MARGIN || m.x > w - EDGE_MARGIN) {
      m.angle = Math.PI - m.angle
      m.x = Math.min(Math.max(m.x, EDGE_MARGIN), w - EDGE_MARGIN)
    }
    if (m.y < EDGE_MARGIN || m.y > h - EDGE_MARGIN) {
      m.angle = -m.angle
      m.y = Math.min(Math.max(m.y, EDGE_MARGIN), h - EDGE_MARGIN)
    }
  }

  rafId = requestAnimationFrame(tick)
}

function catchMote(m: Mote) {
  if (!props.active || done || m.caught) return
  m.caught = true
  pointer = { x: m.x, y: m.y }
  if (caughtCount.value >= MOTE_COUNT) win()
}

function win() {
  if (done) return
  done = true
  won.value = true
  stopLoop()
  feedbackTimer = setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

// --- ENTRADA ---

/** Actualiza la posicion conocida del puntero (las motas huyen de ella) */
function onPointerMove(e: PointerEvent) {
  if (!props.active || done) return
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top }
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
  done = false
  won.value = false
  pointer = null
  gameTime = 0

  // Reparte las motas por el area con rumbos aleatorios
  const { w, h } = areaSize()
  motes.value = Array.from({ length: MOTE_COUNT }, (_, i) => ({
    id: i,
    x: EDGE_MARGIN + Math.random() * (w - EDGE_MARGIN * 2),
    y: EDGE_MARGIN + Math.random() * (h - EDGE_MARGIN * 2),
    angle: Math.random() * Math.PI * 2,
    speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
    nextTurnAt: Math.random() * TURN_MS,
    caught: false,
  }))

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
  <div
    ref="containerRef"
    class="dust-game"
    @pointermove="onPointerMove"
    @pointerdown="onPointerMove"
  >
    <!-- Motas de polvo -->
    <div
      v-for="m in motes"
      :key="m.id"
      class="mote"
      :class="{ caught: m.caught }"
      :style="{ left: m.x + 'px', top: m.y + 'px' }"
      @touchstart.prevent="catchMote(m)"
      @mousedown="catchMote(m)"
    >
      💨
    </div>

    <!-- HUD de progreso -->
    <div v-if="active" class="hud">💨 {{ caughtCount }} / {{ MOTE_COUNT }}</div>

    <!-- Victoria -->
    <div v-if="won" class="overlay">
      <span class="overlay-icon">✨</span>
      <span class="overlay-text">Impoluto!</span>
    </div>
  </div>
</template>

<style scoped>
.dust-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  /* Fondo gris azulado tipo desvan */
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 26px,
      rgba(255, 255, 255, 0.025) 26px,
      rgba(255, 255, 255, 0.025) 52px
    ),
    linear-gradient(180deg, #4a5568 0%, #3a4356 55%, #2c3242 100%);
}

/* === MOTAS === */
.mote {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 34px;
  line-height: 1;
  /* Hitbox generosa alrededor del emoji */
  padding: 12px;
  user-select: none;
  -webkit-user-select: none;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
  animation: mote-drift 1.1s ease-in-out infinite alternate;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

@keyframes mote-drift {
  from { filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)) brightness(0.95); }
  to { filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)) brightness(1.1); }
}

/* Atrapada: se infla y se desvanece */
.mote.caught {
  transform: translate(-50%, -50%) scale(1.8) rotate(25deg);
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
  background: rgba(255, 255, 255, 0.2);
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
  color: #e8eaf6;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
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
