<script setup lang="ts">
/**
 * HugMeterGame.vue — Mini-juego avanzado de cariño
 *
 * Mecanica: "Abrazo perfecto". Un Mime (🥺) espera un abrazo junto a una
 * barra vertical de fuerza. MIENTRAS se mantiene pulsado, la barra sube
 * a velocidad constante (rAF); al soltar se evalua: dentro de la zona
 * ideal (verde) = abrazo perfecto (🤗 + corazones); por debajo = poco
 * apreton (😐); por encima o al llegar la barra al 100% sin soltar =
 * demasiado fuerte (😵 con shake). La zona ideal empieza en 55-80% y se
 * estrecha x0.6 con cada acierto, reposicionandose entre 40-85%.
 * 3 aciertos = victoria; 3 fallos = derrota.
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
/** Velocidad de subida de la barra (% por segundo) */
const FILL_SPEED = 55
/** Zona ideal inicial (55% a 80%) */
const ZONE_START_0 = 55
const ZONE_WIDTH_0 = 25
/** Factor de estrechamiento de la zona por acierto */
const ZONE_SHRINK = 0.6
/** Limites donde puede reposicionarse la zona */
const ZONE_MIN = 40
const ZONE_MAX = 85
/** Duracion del feedback tras cada intento */
const FEEDBACK_MS = 900
/** Aciertos para ganar / fallos para perder */
const HITS_TO_WIN = 3
const FAILS_TO_LOSE = 3
/** Pausa mostrando el overlay final antes de llamar a onComplete */
const END_DELAY_MS = 700

// --- ESTADO ---
type Feedback = 'idle' | 'holding' | 'perfect' | 'low' | 'high'
type Outcome = 'playing' | 'won' | 'lost'

/** Nivel actual de la barra (0-100) */
const fill = ref(0)
const feedback = ref<Feedback>('idle')
const outcome = ref<Outcome>('playing')
const hits = ref(0)
const fails = ref(0)
/** Zona ideal actual (inicio y anchura en %) */
const zoneStart = ref(ZONE_START_0)
const zoneWidth = ref(ZONE_WIDTH_0)
/** Corazones flotantes tras un abrazo perfecto (posiciones precomputadas) */
const floatHearts = ref<{ id: number; left: number; delay: number }[]>([])
/** Evita doble onComplete */
const done = ref(false)

/** Pulsacion en curso */
let holding = false
/** rAF de la subida de la barra */
let rafId = 0
let lastTs = 0
let heartSeq = 0

// --- TIMEOUTS (registrados para limpiarlos) ---
const timers: number[] = []

function after(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms))
}

function clearAllTimers() {
  timers.forEach(id => clearTimeout(id))
  timers.length = 0
}

function stopRaf() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

// --- COMPUTED ---
/** Emoji del Mime segun el estado del intento */
const mimeEmoji = computed(() => {
  if (feedback.value === 'perfect') return '🤗'
  if (feedback.value === 'low') return '😐'
  if (feedback.value === 'high') return '😵'
  return '🥺'
})

// --- LOGICA ---

/** Resetea todo el estado */
function start() {
  clearAllTimers()
  stopRaf()
  done.value = false
  outcome.value = 'playing'
  hits.value = 0
  fails.value = 0
  fill.value = 0
  feedback.value = 'idle'
  zoneStart.value = ZONE_START_0
  zoneWidth.value = ZONE_WIDTH_0
  floatHearts.value = []
  holding = false
}

/** Bucle rAF: la barra sube a velocidad constante mientras se mantiene */
function tick(ts: number) {
  if (!holding || done.value) return
  const dt = lastTs ? (ts - lastTs) / 1000 : 0
  lastTs = ts
  fill.value = Math.min(100, fill.value + FILL_SPEED * dt)
  if (fill.value >= 100) {
    // Llegar al tope sin soltar = fallo automatico (demasiado fuerte)
    holding = false
    resolveAttempt()
    return
  }
  rafId = requestAnimationFrame(tick)
}

function onPointerDown(e: PointerEvent) {
  if (!props.active || done.value || feedback.value !== 'idle') return
  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture(e.pointerId)
  holding = true
  feedback.value = 'holding'
  fill.value = 0
  lastTs = 0
  rafId = requestAnimationFrame(tick)
}

function onPointerUp() {
  if (!props.active || done.value || !holding) return
  holding = false
  resolveAttempt()
}

/** Evalua la fuerza al soltar (o al desbordar la barra) */
function resolveAttempt() {
  stopRaf()
  const v = fill.value
  const lo = zoneStart.value
  const hi = zoneStart.value + zoneWidth.value

  if (v >= lo && v <= hi) {
    // Abrazo perfecto
    hits.value++
    feedback.value = 'perfect'
    spawnHearts()
    shrinkZone()
    if (hits.value >= HITS_TO_WIN) {
      win()
      return
    }
  } else {
    // Poco apreton o demasiado fuerte
    fails.value++
    feedback.value = v < lo ? 'low' : 'high'
    if (fails.value >= FAILS_TO_LOSE) {
      lose()
      return
    }
  }

  // Preparar el siguiente intento
  after(FEEDBACK_MS, () => {
    if (done.value) return
    fill.value = 0
    feedback.value = 'idle'
    floatHearts.value = []
  })
}

/** Estrecha la zona ideal y la recoloca aleatoriamente entre 40-85% */
function shrinkZone() {
  zoneWidth.value = zoneWidth.value * ZONE_SHRINK
  zoneStart.value = ZONE_MIN + Math.random() * (ZONE_MAX - ZONE_MIN - zoneWidth.value)
}

/** Genera corazones flotantes con posiciones aleatorias precomputadas */
function spawnHearts() {
  floatHearts.value = Array.from({ length: 5 }, () => ({
    id: heartSeq++,
    left: 30 + Math.random() * 40,
    delay: Math.random() * 0.3,
  }))
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
  stopRaf()
})
</script>

<template>
  <div
    class="hug-game"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- HUD: aciertos y fallos -->
    <div v-if="active" class="hud">
      <span class="hud-score">{{ hits }}/{{ HITS_TO_WIN }}</span>
      <span class="hud-fails">Fallos: {{ fails }}/{{ FAILS_TO_LOSE }}</span>
    </div>

    <div class="stage">
      <!-- Mime que recibe el abrazo -->
      <div
        class="mime"
        :class="{
          squeeze: feedback === 'holding',
          happy: feedback === 'perfect',
          shake: feedback === 'high',
        }"
      >
        {{ mimeEmoji }}
        <!-- Corazones flotantes tras un abrazo perfecto -->
        <span
          v-for="h in floatHearts"
          :key="h.id"
          class="float-heart"
          :style="{ left: `${h.left}%`, animationDelay: `${h.delay}s` }"
        >💕</span>
      </div>

      <!-- Barra vertical de fuerza de abrazo -->
      <div class="meter">
        <!-- Zona ideal (verde) -->
        <div
          class="zone"
          :style="{ bottom: `${zoneStart}%`, height: `${zoneWidth}%` }"
        ></div>
        <!-- Nivel actual -->
        <div class="level" :style="{ height: `${fill}%` }"></div>
      </div>
    </div>

    <p class="hint">Manten pulsado y suelta en la zona verde</p>

    <!-- Derrota -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">💔</span>
      <span class="overlay-text">El Mime necesitaba mas cariño...</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">💖</span>
      <span class="overlay-text">Abrazo legendario!</span>
    </div>
  </div>
</template>

<style scoped>
.hug-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #1a237e 0%, #4a148c 55%, #880e4f 100%);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.hud-score {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.hud-fails {
  color: #ff8a80;
  font-size: 15px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* === ESCENA === */
.stage {
  display: flex;
  align-items: center;
  gap: clamp(24px, 10vw, 56px);
  pointer-events: none;
}

.mime {
  position: relative;
  font-size: clamp(80px, 24vw, 120px);
  line-height: 1;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
  transition: transform 0.15s ease;
}

/* Apretujado mientras se mantiene pulsado */
.mime.squeeze {
  transform: scale(0.92);
}

/* Salto de alegria en abrazo perfecto */
.mime.happy {
  animation: happy-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes happy-bounce {
  0% { transform: scale(0.8); }
  55% { transform: scale(1.18); }
  100% { transform: scale(1); }
}

/* Sacudida cuando el abrazo es demasiado fuerte */
.mime.shake {
  animation: mime-shake 0.4s ease;
}

@keyframes mime-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px) rotate(-4deg); }
  40% { transform: translateX(10px) rotate(4deg); }
  60% { transform: translateX(-7px) rotate(-3deg); }
  80% { transform: translateX(7px) rotate(3deg); }
}

/* Corazones flotantes del abrazo perfecto */
.float-heart {
  position: absolute;
  top: 0;
  font-size: 26px;
  pointer-events: none;
  animation: heart-rise 0.9s ease-out forwards;
}

@keyframes heart-rise {
  0% { transform: translateY(0) scale(0.5); opacity: 1; }
  100% { transform: translateY(-70px) scale(1.15); opacity: 0; }
}

/* === BARRA DE FUERZA === */
.meter {
  position: relative;
  width: 46px;
  height: clamp(220px, 45vh, 340px);
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 23px;
  overflow: hidden;
}

/* Zona ideal en verde */
.zone {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(105, 240, 174, 0.45);
  border-top: 2px solid #69f0ae;
  border-bottom: 2px solid #69f0ae;
  transition: bottom 0.3s ease, height 0.3s ease;
}

/* Nivel actual de fuerza */
.level {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #ff80ab 0%, #f06292 100%);
  box-shadow: 0 -2px 10px rgba(255, 128, 171, 0.7);
}

/* === PISTA === */
.hint {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  pointer-events: none;
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
  padding: 0 16px;
  text-align: center;
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
