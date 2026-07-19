<script setup lang="ts">
/**
 * DropFeedGame.vue — Mini-juego facil de punteria (alimentar)
 *
 * Un trozo de comida (🍩🍪🍎 alternando) oscila arriba como pendulo
 * (movimiento senoidal). Tocar la pantalla lo suelta: cae recto con
 * gravedad desde su X actual. Si al llegar a la altura de la boca 😋
 * queda lo bastante centrado, cuenta como acierto (la boca hace pop).
 * 5 aciertos = victoria. Fallar no penaliza (solo pierdes tiempo).
 * La velocidad del pendulo sube un poco con cada acierto.
 *
 * Escala con el tamano de pantalla (baseline 375 de ancho).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const REQUIRED = 5
const FOODS = ['🍩', '🍪', '🍎'] as const
const GRAVITY = 0.55        // aceleracion de caida (px/frame, baseline 375)
const HIT_RADIUS = 50       // tolerancia horizontal (px, baseline 375)
const BASE_SPEED = 1.7      // velocidad angular base del pendulo (rad/s)
const SPEED_PER_HIT = 0.3   // incremento de velocidad por acierto
const SWING_AMP = 0.36      // amplitud del pendulo (fraccion del ancho)

// --- STATE ---
const containerRef = ref<HTMLElement | null>(null)
const W = ref(375)
const H = ref(667)

const hits = ref(0)
const foodIndex = ref(0)      // para alternar el emoji de comida
const foodX = ref(0)
const foodY = ref(0)
const dropping = ref(false)   // true mientras la comida cae
const foodVisible = ref(true)
const mouthPop = ref(false)   // animacion scale-pop de la boca
const done = ref(false)
const showResult = ref(false)

// Fisica interna (no reactiva)
let phase = 0        // fase del pendulo
let vy = 0           // velocidad vertical de caida
let missed = false   // el drop actual ya se resolvio como fallo
let lastTime = 0
let animFrame = 0
let endTimeout = 0
let popTimeout = 0

// --- ESCALADO ---
const sX = () => W.value / 375

// Posiciones clave
function mouthX() { return W.value / 2 }
function mouthY() { return H.value * 0.8 }
function swingY() { return H.value * 0.16 }

const currentFood = computed(() => FOODS[foodIndex.value % FOODS.length]!)

// --- CICLO DE JUEGO ---
function start() {
  measureContainer()
  hits.value = 0
  foodIndex.value = 0
  dropping.value = false
  foodVisible.value = true
  mouthPop.value = false
  done.value = false
  showResult.value = false
  phase = 0
  vy = 0
  missed = false
  lastTime = 0
  foodX.value = W.value / 2
  foodY.value = swingY()
  cancelAnimationFrame(animFrame)
  clearTimeout(endTimeout)
  clearTimeout(popTimeout)
  animFrame = requestAnimationFrame(tick)
}

function tick(now: number) {
  if (!props.active || done.value) return
  if (lastTime === 0) lastTime = now
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const frames = dt * 60 // normalizado a 60fps

  if (!dropping.value) {
    // Oscilacion senoidal del pendulo (mas rapida con cada acierto)
    const speed = BASE_SPEED + hits.value * SPEED_PER_HIT
    phase += speed * dt
    foodX.value = W.value / 2 + W.value * SWING_AMP * Math.sin(phase)
    foodY.value = swingY()
  } else {
    // Caida recta con gravedad
    vy += GRAVITY * sX() * frames
    foodY.value += vy * frames

    // Al cruzar la altura de la boca, resolver acierto/fallo (una vez)
    if (!missed && foodY.value >= mouthY()) {
      if (Math.abs(foodX.value - mouthX()) < HIT_RADIUS * sX()) {
        handleHit()
      } else {
        missed = true // sigue cayendo fuera, sin penalizacion
      }
    }

    // Fuera de pantalla → siguiente trozo
    if (missed && foodY.value > H.value + 60) {
      nextFood()
    }
  }

  animFrame = requestAnimationFrame(tick)
}

function handleHit() {
  hits.value++
  foodVisible.value = false
  dropping.value = false
  // Pop de la boca
  mouthPop.value = true
  clearTimeout(popTimeout)
  popTimeout = window.setTimeout(() => { mouthPop.value = false }, 250)

  if (hits.value >= REQUIRED) {
    finish()
    return
  }
  nextFood()
}

function nextFood() {
  foodIndex.value++
  dropping.value = false
  missed = false
  vy = 0
  foodVisible.value = true
  foodY.value = swingY()
}

function finish() {
  if (done.value) return
  done.value = true
  showResult.value = true
  cancelAnimationFrame(animFrame)
  endTimeout = window.setTimeout(() => {
    props.onComplete(true)
  }, 700)
}

// --- INPUT ---
function onTap() {
  if (!props.active || done.value) return
  if (dropping.value || !foodVisible.value) return
  dropping.value = true
  missed = false
  vy = 0
}

// --- LIFECYCLE ---
function measureContainer() {
  if (containerRef.value) {
    W.value = containerRef.value.clientWidth
    H.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  measureContainer()
})

watch(() => props.active, (v) => {
  if (v) {
    start()
  } else {
    cancelAnimationFrame(animFrame)
  }
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  clearTimeout(endTimeout)
  clearTimeout(popTimeout)
})
</script>

<template>
  <div
    ref="containerRef"
    class="dropfeed-game"
    @touchstart.prevent="onTap"
    @mousedown="onTap"
  >
    <!-- HUD -->
    <div class="hud" v-if="active">🍽️ {{ hits }}/{{ REQUIRED }}</div>

    <!-- Comida (pendulo / cayendo) -->
    <div
      v-if="foodVisible"
      class="food"
      :style="{ left: foodX + 'px', top: foodY + 'px' }"
    >
      {{ currentFood }}
    </div>

    <!-- Boca abajo-centro -->
    <div
      class="mouth"
      :class="{ pop: mouthPop }"
      :style="{ left: mouthX() + 'px', top: mouthY() + 'px' }"
    >
      😋
    </div>

    <!-- Overlay de resultado -->
    <div v-if="showResult" class="result-overlay">
      <div class="result-emoji">😋</div>
      <div class="result-text">¡Panza llena!</div>
    </div>
  </div>
</template>

<style scoped>
.dropfeed-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #4a148c 0%, #6a1b9a 45%, #8e24aa 100%);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 20;
  pointer-events: none;
}

/* --- COMIDA --- */
.food {
  position: absolute;
  font-size: 40px;
  line-height: 1;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  pointer-events: none;
  z-index: 10;
}

/* --- BOCA --- */
.mouth {
  position: absolute;
  font-size: 72px;
  line-height: 1;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  pointer-events: none;
  z-index: 5;
  transition: transform 0.12s ease-out;
}

.mouth.pop {
  transform: translate(-50%, -50%) scale(1.3);
}

/* --- OVERLAY RESULTADO --- */
.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.55);
  z-index: 50;
  animation: result-in 0.25s ease-out;
}

.result-emoji {
  font-size: 72px;
  line-height: 1;
}

.result-text {
  color: #ffd54f;
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

@keyframes result-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
