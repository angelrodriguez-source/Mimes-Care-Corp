<script setup lang="ts">
/**
 * HushGame.vue — Mini-juego facil de descansar
 *
 * Mecanica: "Silencio". El Mime duerme en el centro (😴). Aparecen ruidos
 * (📢🔔🐕🚗) de uno en uno en posiciones aleatorias, rodeados de un anillo
 * de cuenta atras que se vacia en 1.6s. Toca el ruido antes de que el anillo
 * se agote para silenciarlo (💤, +1). Si un ruido expira, el Mime despierta
 * (😱) y pierdes. 6 ruidos silenciados = victoria.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const REQUIRED = 6          // ruidos a silenciar
const RING_TIME = 1.6       // segundos antes de que el ruido despierte al Mime
const SPAWN_DELAY = 900     // ms tras silenciar el anterior
const FIRST_DELAY = 600     // ms hasta el primer ruido

const NOISES = ['📢', '🔔', '🐕', '🚗'] as const

// Estrellas decorativas precomputadas (nada de Math.random en template)
const STARS = [
  { left: '12%', top: '10%', delay: '0s' },
  { left: '78%', top: '14%', delay: '0.6s' },
  { left: '30%', top: '6%', delay: '1.2s' },
  { left: '60%', top: '20%', delay: '1.8s' },
] as const

interface Noise { id: number; emoji: string; x: number; y: number }
interface Hush { id: number; x: number; y: number }

// --- STATE ---
const silenced = ref(0)
const noise = ref<Noise | null>(null)   // ruido activo (solo uno a la vez)
const remaining = ref(RING_TIME)        // segundos que le quedan al anillo
const hushes = ref<Hush[]>([])          // 💤 flotantes por cada silenciado
const won = ref(false)
const lost = ref(false)
const done = ref(false)

let rafId = 0
let lastTs = 0
let spawnTimeout = 0
let endTimeout = 0
let idCounter = 0

// Grados del anillo de cuenta atras (360 → 0)
const ringDeg = computed(() => Math.max(0, remaining.value / RING_TIME) * 360)

// --- POSICION ALEATORIA (evitando la zona central del Mime) ---
function randomPos(): { x: number; y: number } {
  for (let i = 0; i < 12; i++) {
    const x = 14 + Math.random() * 72
    const y = 18 + Math.random() * 58
    if (Math.abs(x - 50) > 22 || Math.abs(y - 44) > 24) return { x, y }
  }
  return { x: 18, y: 22 } // fallback improbable
}

// --- SPAWN DE RUIDOS ---
function spawnNoise() {
  if (done.value) return
  const { x, y } = randomPos()
  const emoji = NOISES[Math.floor(Math.random() * NOISES.length)] ?? '📢'
  noise.value = { id: idCounter++, emoji, x, y }
  remaining.value = RING_TIME
}

// --- BUCLE: vaciar el anillo del ruido activo ---
function tick(ts: number) {
  if (done.value) return
  if (lastTs > 0 && noise.value) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05)
    remaining.value -= dt
    if (remaining.value <= 0) {
      // El ruido ha sonado: el Mime despierta
      lose()
      return
    }
  }
  lastTs = ts
  rafId = requestAnimationFrame(tick)
}

// --- INICIO / RESET ---
function start() {
  silenced.value = 0
  noise.value = null
  remaining.value = RING_TIME
  hushes.value = []
  won.value = false
  lost.value = false
  done.value = false
  lastTs = 0
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimeout)
  clearTimeout(endTimeout)
  rafId = requestAnimationFrame(tick)
  spawnTimeout = window.setTimeout(spawnNoise, FIRST_DELAY)
}

// --- INPUT: tocar el ruido activo ---
function tapNoise() {
  if (!props.active || done.value || !noise.value) return

  // 💤 flotante donde estaba el ruido
  hushes.value.push({ id: idCounter++, x: noise.value.x, y: noise.value.y })
  noise.value = null
  silenced.value++

  if (silenced.value >= REQUIRED) {
    win()
    return
  }
  clearTimeout(spawnTimeout)
  spawnTimeout = window.setTimeout(spawnNoise, SPAWN_DELAY)
}

function win() {
  done.value = true
  won.value = true
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimeout)
  endTimeout = window.setTimeout(() => props.onComplete(true), 700)
}

function lose() {
  done.value = true
  lost.value = true
  noise.value = null
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimeout)
  endTimeout = window.setTimeout(() => props.onComplete(false), 700)
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(spawnTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="hush-game">
    <!-- Luna y estrellas decorativas -->
    <div class="moon">🌙</div>
    <span
      v-for="(star, i) in STARS"
      :key="'star-' + i"
      class="star"
      :style="{ left: star.left, top: star.top, animationDelay: star.delay }"
    >✨</span>

    <!-- HUD: progreso -->
    <div class="hud">{{ silenced }}/{{ REQUIRED }}</div>

    <!-- Mime dormido (o despierto si has perdido) -->
    <div class="mime">{{ lost ? '😱' : '😴' }}</div>

    <!-- Ruido activo con anillo de cuenta atras -->
    <div
      v-if="noise"
      :key="noise.id"
      class="noise"
      :style="{ left: noise.x + '%', top: noise.y + '%' }"
      @touchstart.prevent="tapNoise"
      @mousedown="tapNoise"
    >
      <div
        class="ring"
        :style="{ background: `conic-gradient(#ffd54f ${ringDeg}deg, rgba(255, 255, 255, 0.12) ${ringDeg}deg)` }"
      ></div>
      <span class="noise-emoji">{{ noise.emoji }}</span>
    </div>

    <!-- 💤 flotantes por cada ruido silenciado -->
    <span
      v-for="h in hushes"
      :key="h.id"
      class="hush"
      :style="{ left: h.x + '%', top: h.y + '%' }"
    >💤</span>

    <p v-if="!done" class="instruction">Toca los ruidos antes de que suenen</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">😴</div>
      <p class="overlay-text win">Que paz...</p>
    </div>

    <!-- Overlay de derrota -->
    <div v-if="lost" class="overlay">
      <div class="overlay-emoji">😱</div>
      <p class="overlay-text lose">Se ha despertado!</p>
    </div>
  </div>
</template>

<style scoped>
.hush-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #040812 0%, #0a1226 55%, #0f1d38 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* --- DECORACION --- */
.moon {
  position: absolute;
  top: 7%;
  right: 12%;
  font-size: 42px;
  filter: drop-shadow(0 0 14px rgba(255, 241, 178, 0.5));
  pointer-events: none;
}

.star {
  position: absolute;
  font-size: 12px;
  animation: twinkle 2.2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 20;
}

/* --- MIME --- */
.mime {
  position: absolute;
  top: 44%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  animation: breathe 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -52%) scale(1.03); }
}

/* --- RUIDO CON ANILLO --- */
.noise {
  position: absolute;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  animation: noise-pop 0.2s ease-out;
}

@keyframes noise-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

/* Anillo de cuenta atras (conic-gradient que se vacia via rAF) */
.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  /* Mascara para dejar solo un aro de ~5px */
  -webkit-mask: radial-gradient(circle, transparent 26px, #000 27px);
  mask: radial-gradient(circle, transparent 26px, #000 27px);
}

.noise-emoji {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  animation: noise-wiggle 0.5s ease-in-out infinite;
}

@keyframes noise-wiggle {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

/* --- 💤 FLOTANTES --- */
.hush {
  position: absolute;
  font-size: 22px;
  transform: translate(-50%, -50%);
  animation: hush-rise 1.2s ease-out forwards;
  pointer-events: none;
}

@keyframes hush-rise {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
  25% { opacity: 1; transform: translate(-50%, -60%) scale(1.1); }
  100% { opacity: 0; transform: translate(-50%, -140%) scale(1); }
}

.instruction {
  position: absolute;
  bottom: 10%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  pointer-events: none;
}

/* --- OVERLAYS --- */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(4, 8, 18, 0.75);
  z-index: 50;
  animation: overlay-in 0.3s ease;
}

.overlay-emoji {
  font-size: 72px;
}

.overlay-text {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.overlay-text.win { color: #ffd54f; }
.overlay-text.lose { color: #f44336; }

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
