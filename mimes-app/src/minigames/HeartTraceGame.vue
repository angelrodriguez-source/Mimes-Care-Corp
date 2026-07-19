<script setup lang="ts">
/**
 * HeartTraceGame.vue — Mini-juego facil de cariño
 *
 * Mecanica: "Traza el corazon". 8 puntos numerados forman la silueta
 * de un corazon (curva clasica x=16sin³t, y=13cost-5cos2t-2cos3t-cos4t,
 * normalizada al rango 20-80% de pantalla). El jugador arrastra el dedo
 * pasando por los puntos EN ORDEN: cada punto alcanzado se ilumina y se
 * dibuja una linea que lo conecta con el anterior. Tocar puntos en
 * desorden no penaliza. Al unir los 8, el corazon late y es victoria.
 * No hay derrota: solo se pierde si se agota el tiempo del shell.
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
/** Radio de acierto alrededor de cada punto (px) */
const HIT_RADIUS = 30
/** Duracion del latido final antes del overlay */
const BEAT_MS = 700
/** Pausa mostrando el overlay antes de llamar a onComplete */
const END_DELAY_MS = 700

/**
 * Posiciones FIJAS en % de los 8 puntos, precomputadas con la curva
 * parametrica del corazon en t = k·2π/8 (k=0..7) y normalizadas a 20-80%.
 * El orden 1→8 recorre: hendidura superior → lobulo derecho → lado
 * derecho → punta inferior → lado izquierdo → lobulo izquierdo.
 */
const POINTS = [
  { x: 50.0, y: 33.9 }, // t=0     (hendidura superior)
  { x: 60.6, y: 20.0 }, // t=π/4   (lobulo derecho)
  { x: 80.0, y: 36.0 }, // t=π/2   (lateral derecho)
  { x: 60.6, y: 64.5 }, // t=3π/4  (bajada derecha)
  { x: 50.0, y: 80.0 }, // t=π     (punta inferior)
  { x: 39.4, y: 64.5 }, // t=5π/4  (bajada izquierda)
  { x: 20.0, y: 36.0 }, // t=3π/2  (lateral izquierdo)
  { x: 39.4, y: 20.0 }, // t=7π/4  (lobulo izquierdo)
] as const

// --- ESTADO ---
const rootEl = ref<HTMLDivElement | null>(null)
/** Puntos ya alcanzados (el siguiente esperado es el indice `reached`) */
const reached = ref(0)
/** Hay un dedo/puntero arrastrando */
const tracing = ref(false)
/** Corazon completado (dispara el latido) */
const won = ref(false)
/** Overlay de victoria visible */
const showOverlay = ref(false)
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
/** Segmentos ya trazados (cada punto alcanzado con su anterior) */
const segments = computed(() => {
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 1; i < reached.value; i++) {
    const a = POINTS[i - 1]!
    const b = POINTS[i]!
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  // Al completar, se cierra la figura uniendo el 8 con el 1
  if (won.value) {
    const last = POINTS[POINTS.length - 1]!
    const first = POINTS[0]!
    segs.push({ x1: last.x, y1: last.y, x2: first.x, y2: first.y })
  }
  return segs
})

// --- LOGICA ---

/** Resetea todo el estado */
function start() {
  clearAllTimers()
  done.value = false
  won.value = false
  showOverlay.value = false
  reached.value = 0
  tracing.value = false
}

/** Comprueba si el puntero esta sobre el siguiente punto esperado */
function checkPoint(clientX: number, clientY: number) {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return
  // Bucle por si un movimiento rapido alcanza varios puntos seguidos
  while (reached.value < POINTS.length) {
    const target = POINTS[reached.value]!
    const px = rect.left + (target.x / 100) * rect.width
    const py = rect.top + (target.y / 100) * rect.height
    if (Math.hypot(clientX - px, clientY - py) > HIT_RADIUS) break
    reached.value++
  }
  if (reached.value >= POINTS.length) win()
}

function onPointerDown(e: PointerEvent) {
  if (!props.active || done.value) return
  tracing.value = true
  rootEl.value?.setPointerCapture(e.pointerId)
  checkPoint(e.clientX, e.clientY)
}

function onPointerMove(e: PointerEvent) {
  if (!props.active || done.value || !tracing.value) return
  checkPoint(e.clientX, e.clientY)
}

function onPointerUp() {
  tracing.value = false
}

function win() {
  if (done.value) return
  done.value = true
  won.value = true // el corazon entero late
  after(BEAT_MS, () => { showOverlay.value = true })
  after(BEAT_MS + END_DELAY_MS, () => props.onComplete(true))
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
  <div
    ref="rootEl"
    class="trace-game"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- HUD: progreso -->
    <div v-if="active" class="hud">
      <span class="hud-count">{{ reached }}/{{ POINTS.length }}</span>
      <span class="hud-hint">Traza el corazon en orden</span>
    </div>

    <!-- Capa del corazon (late al completarse) -->
    <div class="heart-layer" :class="{ beating: won }">
      <!-- Lineas ya trazadas -->
      <svg class="lines" aria-hidden="true">
        <line
          v-for="(s, i) in segments"
          :key="i"
          :x1="`${s.x1}%`"
          :y1="`${s.y1}%`"
          :x2="`${s.x2}%`"
          :y2="`${s.y2}%`"
          class="trace-line"
        />
      </svg>

      <!-- Puntos numerados -->
      <div
        v-for="(p, i) in POINTS"
        :key="i"
        class="dot"
        :class="{ lit: i < reached, next: i === reached && !done }"
        :style="{ left: `${p.x}%`, top: `${p.y}%` }"
      >
        {{ i + 1 }}
      </div>
    </div>

    <!-- Victoria -->
    <div v-if="showOverlay" class="overlay overlay-win">
      <span class="overlay-icon">💖</span>
      <span class="overlay-text">Corazon completo!</span>
    </div>
  </div>
</template>

<style scoped>
.trace-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #311b92 0%, #6a1b6e 55%, #ad1457 100%);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
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
  pointer-events: none;
}

.hud-count {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-hint {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 600;
}

/* === CAPA DEL CORAZON === */
.heart-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-origin: 50% 50%;
}

/* Latido final al completar los 8 puntos */
.heart-layer.beating {
  animation: heart-beat 0.7s ease-in-out;
}

@keyframes heart-beat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.12); }
  50% { transform: scale(0.96); }
  75% { transform: scale(1.08); }
}

.lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.trace-line {
  stroke: #ff80ab;
  stroke-width: 5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px rgba(255, 128, 171, 0.8));
}

/* === PUNTOS NUMERADOS === */
.dot {
  position: absolute;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.12);
  border: 2px solid rgba(255, 255, 255, 0.4);
  transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

/* Punto ya alcanzado: rosa iluminado */
.dot.lit {
  background: #ff4081;
  border-color: #ff80ab;
  color: #fff;
  box-shadow: 0 0 18px 5px rgba(255, 64, 129, 0.7);
}

/* Siguiente punto esperado: pulso suave para guiar */
.dot.next {
  border-color: #ffd54f;
  animation: next-pulse 1s ease-in-out infinite;
}

@keyframes next-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 213, 79, 0.5); }
  50% { box-shadow: 0 0 14px 6px rgba(255, 213, 79, 0.35); }
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
  animation: overlay-in 0.25s ease;
  pointer-events: none;
}

.overlay-win { background: rgba(255, 182, 213, 0.25); }

.overlay-icon {
  font-size: 76px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  color: #fce4ec;
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
