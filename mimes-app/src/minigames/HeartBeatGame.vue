<script setup lang="ts">
/**
 * HeartBeatGame.vue — Mini-juego avanzado de ritmo de cariño
 *
 * Mecanica: corazones viajan de derecha a izquierda por una pista
 * horizontal hacia una zona de golpeo fija. El jugador toca en cualquier
 * parte cuando un corazon esta dentro de la zona: acierto (explota en ✨).
 * Tocar sin corazon en zona o dejar pasar un corazon cuenta como fallo.
 * 8 corazones en total; 6 aciertos = victoria; 3 fallos = derrota.
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
/** Corazones totales de la partida */
const TOTAL_HEARTS = 8
/** Aciertos necesarios para ganar */
const HITS_TO_WIN = 6
/** Fallos que provocan la derrota */
const MAX_MISSES = 3
/** Retardo antes del primer corazon */
const FIRST_SPAWN_MS = 900
/** Espaciado entre corazones */
const SPAWN_GAP_MS = 1500
/** Tiempo de viaje de un corazon a lo largo de la pista */
const TRAVEL_MS = 2600
/** Posicion inicial y final (% del ancho de la pista) */
const START_X = 106
const END_X = -8
/** Centro y media anchura de la zona de golpeo (%) */
const ZONE_X = 16
const ZONE_HALF = 9
/** Pausa mostrando el overlay final antes de llamar a onComplete */
const END_DELAY_MS = 700

// --- ESTADO ---
type HeartState = 'pending' | 'moving' | 'hit' | 'missed'
type Outcome = 'playing' | 'won' | 'lost'

interface BeatHeart {
  id: number
  /** Instante de aparicion relativo al inicio de la partida (ms) */
  spawnAt: number
  /** Posicion actual en % del ancho de la pista */
  x: number
  state: HeartState
}

const hearts = ref<BeatHeart[]>([])
const hits = ref(0)
const misses = ref(0)
const outcome = ref<Outcome>('playing')
/** Feedback flotante del ultimo intento (key por id para reanimar) */
const feedback = ref<{ id: number; text: string; ok: boolean } | null>(null)
/** Evita doble onComplete */
const done = ref(false)

let rafId = 0
let startTs = 0
let nextFeedbackId = 0

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
/** Zona de golpeo en CSS (left y width en %) */
const zoneLeft = computed(() => ZONE_X - ZONE_HALF)
const zoneWidth = computed(() => ZONE_HALF * 2)

// --- LOGICA ---

/** Resetea todo el estado y arranca el bucle rAF */
function start() {
  clearAllTimers()
  cancelAnimationFrame(rafId)
  done.value = false
  outcome.value = 'playing'
  hits.value = 0
  misses.value = 0
  feedback.value = null
  startTs = 0
  // Corazones precomputados, espaciados uniformemente
  hearts.value = Array.from({ length: TOTAL_HEARTS }, (_, i) => ({
    id: i,
    spawnAt: FIRST_SPAWN_MS + i * SPAWN_GAP_MS,
    x: START_X,
    state: 'pending' as HeartState,
  }))
  rafId = requestAnimationFrame(loop)
}

/** Bucle principal: mueve corazones y detecta los que cruzan sin tocar */
function loop(ts: number) {
  if (done.value) return
  if (!startTs) startTs = ts
  const t = ts - startTs

  for (const h of hearts.value) {
    if (h.state === 'pending' && t >= h.spawnAt) h.state = 'moving'
    if (h.state === 'moving') {
      const elapsed = t - h.spawnAt
      h.x = START_X - (elapsed / TRAVEL_MS) * (START_X - END_X)
      // Cruzo la zona sin ser tocado: fallo
      if (h.x < ZONE_X - ZONE_HALF) {
        h.state = 'missed'
        registerMiss()
        if (done.value) return
      }
    }
  }

  // Todos los corazones resueltos: decidir resultado
  if (hearts.value.every(h => h.state === 'hit' || h.state === 'missed')) {
    if (hits.value >= HITS_TO_WIN) win()
    else lose()
    return
  }

  rafId = requestAnimationFrame(loop)
}

/** Toque del jugador en cualquier parte de la pantalla */
function onTap() {
  if (!props.active || done.value) return
  // Corazones en movimiento dentro de la zona de golpeo
  const candidates = hearts.value.filter(
    h => h.state === 'moving' && Math.abs(h.x - ZONE_X) <= ZONE_HALF,
  )
  const first = candidates[0]
  if (first) {
    // El mas centrado en la zona
    const best = candidates.reduce(
      (a, b) => (Math.abs(b.x - ZONE_X) < Math.abs(a.x - ZONE_X) ? b : a),
      first,
    )
    best.state = 'hit'
    hits.value++
    showFeedback('Perfecto!', true)
    if (hits.value >= HITS_TO_WIN) win()
  } else {
    registerMiss()
  }
}

function registerMiss() {
  if (done.value) return
  misses.value++
  showFeedback('Fallo', false)
  if (misses.value >= MAX_MISSES) lose()
}

/** Muestra el feedback flotante (la key nueva reinicia la animacion) */
function showFeedback(text: string, ok: boolean) {
  feedback.value = { id: nextFeedbackId++, text, ok }
}

function win() {
  if (done.value) return
  done.value = true
  outcome.value = 'won'
  cancelAnimationFrame(rafId)
  after(END_DELAY_MS, () => props.onComplete(true))
}

function lose() {
  if (done.value) return
  done.value = true
  outcome.value = 'lost'
  cancelAnimationFrame(rafId)
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
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    class="heartbeat-game"
    @touchstart.prevent="onTap"
    @mousedown="onTap"
  >
    <!-- HUD: aciertos y fallos -->
    <div v-if="active" class="hud">
      <span class="hud-score">{{ hits }}/{{ TOTAL_HEARTS }}</span>
      <span class="hud-misses">Fallos: {{ misses }}/{{ MAX_MISSES }}</span>
    </div>

    <!-- Pista horizontal con zona de golpeo -->
    <div class="track">
      <div class="track-line"></div>
      <div
        class="hit-zone"
        :style="{ left: zoneLeft + '%', width: zoneWidth + '%' }"
      ></div>

      <!-- Corazones viajando -->
      <span
        v-for="h in hearts"
        :key="h.id"
        v-show="h.state === 'moving' || h.state === 'hit' || h.state === 'missed'"
        class="beat-heart"
        :class="{ hit: h.state === 'hit', missed: h.state === 'missed' }"
        :style="{ left: h.x + '%' }"
      >{{ h.state === 'hit' ? '✨' : '❤️' }}</span>
    </div>

    <!-- Feedback flotante del ultimo intento -->
    <div
      v-if="feedback"
      :key="feedback.id"
      class="feedback"
      :class="feedback.ok ? 'fb-ok' : 'fb-bad'"
    >{{ feedback.text }}</div>

    <!-- Pista inicial -->
    <div v-if="active && hits === 0 && misses === 0 && !done" class="hint">
      Toca cuando el ❤️ pase por el circulo
    </div>

    <!-- Derrota -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">💔</span>
      <span class="overlay-text">Ritmo perdido...</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">💖</span>
      <span class="overlay-text">Que ritmo de cariño!</span>
    </div>
  </div>
</template>

<style scoped>
.heartbeat-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #4a0e2a 0%, #6b1436 55%, #7d1f42 100%);
  touch-action: manipulation;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
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

.hud-score {
  color: #ffd54f;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-misses {
  color: #ff8a80;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* === PISTA === */
.track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 90px;
  transform: translateY(-50%);
  pointer-events: none;
}

.track-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.18);
  border-radius: 2px;
}

/* Zona de golpeo fija */
.hit-zone {
  position: absolute;
  top: 50%;
  height: 76px;
  transform: translateY(-50%);
  border: 3px solid #ff80ab;
  border-radius: 20px;
  background: rgba(255, 128, 171, 0.12);
  box-shadow: 0 0 16px rgba(255, 128, 171, 0.45);
  animation: zone-pulse 1s ease-in-out infinite;
}

@keyframes zone-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 128, 171, 0.35); }
  50% { box-shadow: 0 0 22px rgba(255, 128, 171, 0.7); }
}

/* === CORAZONES === */
.beat-heart {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  will-change: left;
}

/* Acierto: explosion en destellos */
.beat-heart.hit {
  animation: heart-burst 0.45s ease-out forwards;
}

@keyframes heart-burst {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  60% { transform: translate(-50%, -50%) scale(1.9); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}

/* Fallo por dejarlo pasar: se apaga */
.beat-heart.missed {
  animation: heart-fade 0.4s ease-out forwards;
}

@keyframes heart-fade {
  0% { opacity: 1; filter: grayscale(0); }
  100% { opacity: 0; filter: grayscale(1); transform: translate(-50%, 10%) scale(0.7); }
}

/* === FEEDBACK FLOTANTE === */
.feedback {
  position: absolute;
  top: 32%;
  left: 16%;
  transform: translateX(-50%);
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 25;
  animation: fb-float 0.7s ease-out forwards;
}

.fb-ok { color: #a5d6a7; }
.fb-bad { color: #ff8a80; }

@keyframes fb-float {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 1; }
  100% { transform: translate(-50%, -38px) scale(1.1); opacity: 0; }
}

/* === PISTA INICIAL === */
.hint {
  position: absolute;
  bottom: 14%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: hint-pulse 1.2s ease-in-out infinite;
  white-space: nowrap;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
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

.overlay-lose { background: rgba(30, 10, 20, 0.7); }
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
