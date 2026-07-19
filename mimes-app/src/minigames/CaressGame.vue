<script setup lang="ts">
/**
 * CaressGame.vue — Mini-juego facil de cariño
 *
 * Mecanica: "Mimitos". Un Mime feliz espera en el centro y el jugador
 * lo acaricia arrastrando el dedo/raton por la pantalla. Cada pixel
 * recorrido con el puntero pulsado llena la barra de cariño; al llegar
 * al objetivo, victoria. No hay derrota: la presion es el tiempo del shell.
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
/** Pixeles de caricia necesarios en una pantalla de 375px de ancho */
const BASE_TARGET_PX = 2500
/** Ancho de referencia para escalar el objetivo */
const BASE_WIDTH = 375
/** Cada cuantos px de caricia brota un corazoncito */
const HEART_EVERY_PX = 170
/** Maximo de corazoncitos simultaneos (se reciclan los mas viejos) */
const MAX_HEARTS = 10
/** Vida de cada corazoncito antes de retirarlo del DOM */
const HEART_LIFE_MS = 1300
/** Pausa mostrando el overlay final antes de llamar a onComplete */
const END_DELAY_MS = 700

// --- ESTADO ---
interface MiniHeart {
  id: number
  x: number
  y: number
}

const root = ref<HTMLElement | null>(null)
/** Distancia de caricia acumulada (px) */
const dist = ref(0)
/** Objetivo escalado al ancho real de la pantalla */
const targetPx = ref(BASE_TARGET_PX)
/** Corazoncitos flotantes activos */
const floatHearts = ref<MiniHeart[]>([])
/** El Mime "vibra" mientras lo acarician */
const petting = ref(false)
const won = ref(false)
/** Evita doble onComplete */
const done = ref(false)

let dragging = false
let lastX = 0
let lastY = 0
/** Acumulador de px hasta el siguiente corazoncito */
let heartAcc = 0
let nextHeartId = 0

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
const progressPct = computed(() =>
  Math.min(100, (dist.value / targetPx.value) * 100),
)

// --- LOGICA ---

/** Resetea todo el estado y calcula el objetivo segun el ancho real */
function start() {
  clearAllTimers()
  done.value = false
  won.value = false
  dist.value = 0
  floatHearts.value = []
  petting.value = false
  dragging = false
  heartAcc = 0
  const w = root.value?.clientWidth || window.innerWidth || BASE_WIDTH
  targetPx.value = Math.round((BASE_TARGET_PX * w) / BASE_WIDTH)
}

function onPointerDown(e: PointerEvent) {
  if (!props.active || done.value) return
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
}

function onPointerMove(e: PointerEvent) {
  if (!dragging || !props.active || done.value) return
  const d = Math.hypot(e.clientX - lastX, e.clientY - lastY)
  lastX = e.clientX
  lastY = e.clientY
  if (d <= 0) return

  dist.value += d
  petting.value = true

  // Corazoncitos cada cierto tramo de caricia
  heartAcc += d
  if (heartAcc >= HEART_EVERY_PX) {
    heartAcc = 0
    spawnHeart(e.clientX, e.clientY)
  }

  if (dist.value >= targetPx.value) win()
}

function onPointerUp() {
  dragging = false
  petting.value = false
}

/** Crea un corazoncito en la posicion del puntero (coords relativas al root) */
function spawnHeart(clientX: number, clientY: number) {
  const rect = root.value?.getBoundingClientRect()
  if (!rect) return
  const id = nextHeartId++
  // Jitter precomputado aqui, nunca en el template
  const jx = (Math.random() - 0.5) * 30
  floatHearts.value.push({
    id,
    x: clientX - rect.left + jx,
    y: clientY - rect.top - 10,
  })
  // Recicla los mas viejos si superamos el maximo
  if (floatHearts.value.length > MAX_HEARTS) floatHearts.value.shift()
  // Retirada tras terminar su animacion
  after(HEART_LIFE_MS, () => {
    floatHearts.value = floatHearts.value.filter(h => h.id !== id)
  })
}

function win() {
  if (done.value) return
  done.value = true
  won.value = true
  dragging = false
  petting.value = false
  after(END_DELAY_MS, () => props.onComplete(true))
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
    ref="root"
    class="caress-game"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- HUD: barra de cariño -->
    <div v-if="active" class="hud">
      <span class="hud-label">Cariño</span>
      <div class="bar">
        <div class="bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>

    <!-- El Mime a acariciar -->
    <div class="mime" :class="{ petting }">🐣</div>

    <!-- Pista inicial -->
    <div v-if="active && progressPct < 5 && !done" class="hint">
      ✋ Acaricia al Mime!
    </div>

    <!-- Corazoncitos flotantes (reciclados) -->
    <span
      v-for="h in floatHearts"
      :key="h.id"
      class="mini-heart"
      :style="{ left: h.x + 'px', top: h.y + 'px' }"
    >♥</span>

    <!-- Victoria -->
    <div v-if="won" class="overlay overlay-win">
      <span class="overlay-icon">🥰</span>
      <span class="overlay-text">Que gustito!</span>
    </div>
  </div>
</template>

<style scoped>
.caress-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(165deg, #4e2038 0%, #6d2a4a 55%, #8c3a5a 100%);
  touch-action: none;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
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
  gap: 6px;
  z-index: 20;
  pointer-events: none;
}

.hud-label {
  color: #ffd54f;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.bar {
  width: min(60vw, 240px);
  height: 14px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.25);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, #ff80ab, #ff4081);
  box-shadow: 0 0 10px rgba(255, 64, 129, 0.7);
  transition: width 0.1s linear;
}

/* === MIME === */
.mime {
  font-size: 90px;
  line-height: 1;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
  pointer-events: none;
  animation: mime-idle 2.2s ease-in-out infinite;
}

/* Vibracion feliz mientras lo acarician */
.mime.petting {
  animation: mime-happy 0.35s ease-in-out infinite;
}

@keyframes mime-idle {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes mime-happy {
  0%, 100% { transform: scale(1.1) rotate(-4deg); }
  50% { transform: scale(1.14) rotate(4deg); }
}

/* === PISTA === */
.hint {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: 16px;
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

/* === CORAZONCITOS === */
.mini-heart {
  position: absolute;
  color: #ff80ab;
  font-size: 24px;
  pointer-events: none;
  transform: translate(-50%, -50%);
  text-shadow: 0 0 8px rgba(255, 128, 171, 0.8);
  animation: heart-rise 1.2s ease-out forwards;
  z-index: 10;
}

@keyframes heart-rise {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
  100% { transform: translate(-50%, -180%) scale(1.3); opacity: 0; }
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

.overlay-win {
  background: rgba(255, 182, 213, 0.25);
}

.overlay-icon {
  font-size: 76px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  color: #fce4ec;
  font-size: 22px;
  font-weight: 700;
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
