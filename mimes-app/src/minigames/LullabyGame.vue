<script setup lang="ts">
/**
 * LullabyGame.vue — Mini-juego avanzado de descansar
 *
 * Mecanica: juego de timing nocturno. Un marcador oscila de lado a lado
 * sobre una barra con una zona verde centrada. Toca la pantalla cuando el
 * marcador este dentro de la zona para "arropar" al Mime (3 aciertos = gana).
 * Tras cada acierto la zona se encoge y el marcador acelera.
 * Primer fallo = aviso (casi se despierta); segundo fallo = derrota.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const REQUIRED = 3            // aciertos necesarios
const MAX_FAILS = 2           // fallos permitidos (el segundo pierde)
const ZONE_START = 0.28       // ancho inicial de la zona verde (fraccion de la barra)
const ZONE_SHRINK = 0.65      // factor de encogimiento por acierto
const SPEED_START = 0.8       // ciclos por segundo iniciales
const SPEED_BOOST = 1.25      // factor de aceleracion por acierto

// Estrellas decorativas: posiciones precomputadas (nada de Math.random en template)
const STARS = [
  { left: '15%', top: '12%', delay: '0s' },
  { left: '72%', top: '8%', delay: '0.7s' },
  { left: '40%', top: '22%', delay: '1.4s' },
] as const

// --- STATE ---
const hits = ref(0)
const fails = ref(0)
const markerPos = ref(0.5)        // posicion normalizada 0..1 del marcador
const zoneWidth = ref(ZONE_START) // ancho actual de la zona verde
const angry = ref(false)          // aviso tras el primer fallo
const won = ref(false)
const lost = ref(false)
const done = ref(false)
const zzzs = ref<{ id: number; left: string }[]>([]) // Zzz flotantes por acierto

let speed = SPEED_START // ciclos/segundo
let phase = 0           // fase del seno acumulada
let rafId = 0
let lastTs = 0
let angryTimeout = 0
let endTimeout = 0
let zzzCounter = 0

// Desplazamientos horizontales para los Zzz (uno por acierto)
const ZZZ_OFFSETS = ['46%', '54%', '50%'] as const

// --- BUCLE DE ANIMACION (oscilacion senoidal del marcador) ---
function tick(ts: number) {
  if (done.value) return
  if (lastTs > 0) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05) // dt acotado por si se pausa la pestana
    phase += speed * dt * Math.PI * 2
    markerPos.value = 0.5 + 0.5 * Math.sin(phase)
  }
  lastTs = ts
  rafId = requestAnimationFrame(tick)
}

// --- INICIO / RESET ---
function start() {
  hits.value = 0
  fails.value = 0
  zoneWidth.value = ZONE_START
  markerPos.value = 0.5
  angry.value = false
  won.value = false
  lost.value = false
  done.value = false
  zzzs.value = []
  speed = SPEED_START
  phase = 0
  lastTs = 0
  cancelAnimationFrame(rafId)
  clearTimeout(angryTimeout)
  clearTimeout(endTimeout)
  rafId = requestAnimationFrame(tick)
}

// --- INPUT: toque en cualquier parte de la pantalla ---
function onTap() {
  if (!props.active || done.value) return

  const half = zoneWidth.value / 2
  const inZone = markerPos.value >= 0.5 - half && markerPos.value <= 0.5 + half

  if (inZone) {
    handleHit()
  } else {
    handleMiss()
  }
}

function handleHit() {
  hits.value++

  // Zzz flotante sobre el Mime
  zzzs.value.push({
    id: zzzCounter++,
    left: ZZZ_OFFSETS[(hits.value - 1) % ZZZ_OFFSETS.length] ?? '50%',
  })

  if (hits.value >= REQUIRED) {
    // Victoria: dormido del todo
    done.value = true
    won.value = true
    cancelAnimationFrame(rafId)
    endTimeout = window.setTimeout(() => props.onComplete(true), 700)
    return
  }

  // La zona se encoge y el marcador acelera
  zoneWidth.value *= ZONE_SHRINK
  speed *= SPEED_BOOST
}

function handleMiss() {
  fails.value++

  if (fails.value >= MAX_FAILS) {
    // Derrota: se ha despertado
    done.value = true
    lost.value = true
    cancelAnimationFrame(rafId)
    endTimeout = window.setTimeout(() => props.onComplete(false), 700)
    return
  }

  // Primer fallo: aviso breve (cara enfadada + shake)
  angry.value = true
  clearTimeout(angryTimeout)
  angryTimeout = window.setTimeout(() => {
    angry.value = false
  }, 900)
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(angryTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div
    class="lullaby-game"
    @touchstart.prevent="onTap"
    @mousedown="onTap"
  >
    <!-- Luna con glow suave -->
    <div class="moon">🌙</div>

    <!-- Estrellas decorativas con twinkle -->
    <span
      v-for="(star, i) in STARS"
      :key="'star-' + i"
      class="star"
      :style="{ left: star.left, top: star.top, animationDelay: star.delay }"
    >✨</span>

    <!-- HUD: progreso + fallos restantes -->
    <div class="hud">
      <span class="hud-count">{{ hits }}/{{ REQUIRED }}</span>
      <span class="hud-hearts">
        <span v-for="i in MAX_FAILS" :key="'heart-' + i" class="heart" :class="{ off: i > MAX_FAILS - fails }">💛</span>
      </span>
    </div>

    <!-- Mime dormido (o enfadado tras el primer fallo) -->
    <div class="mime" :class="{ angry }">{{ angry ? '😠' : '😴' }}</div>

    <!-- Aviso del primer fallo -->
    <p v-if="angry" class="warning-text">Casi se despierta!</p>

    <!-- Zzz flotantes por cada acierto -->
    <span
      v-for="z in zzzs"
      :key="z.id"
      class="zzz"
      :style="{ left: z.left }"
    >Zzz</span>

    <!-- Barra de timing: zona verde centrada + marcador oscilante -->
    <div class="timing-bar">
      <div
        class="zone"
        :style="{
          left: ((0.5 - zoneWidth / 2) * 100) + '%',
          width: (zoneWidth * 100) + '%',
        }"
      ></div>
      <div class="marker" :style="{ left: (markerPos * 100) + '%' }"></div>
    </div>

    <p v-if="!done" class="instruction">Toca cuando el marcador este en la zona verde</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">🌙</div>
      <p class="overlay-text win">Dormido!</p>
    </div>

    <!-- Overlay de derrota -->
    <div v-if="lost" class="overlay">
      <div class="overlay-emoji">😱</div>
      <p class="overlay-text lose">Se ha despertado!</p>
    </div>
  </div>
</template>

<style scoped>
.lullaby-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #050914 0%, #0a1428 55%, #101f3c 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

/* --- LUNA --- */
.moon {
  position: absolute;
  top: 8%;
  right: 14%;
  font-size: 44px;
  filter: drop-shadow(0 0 14px rgba(255, 241, 178, 0.55));
  animation: moon-glow 3.5s ease-in-out infinite;
}

@keyframes moon-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 241, 178, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 241, 178, 0.75)); }
}

/* --- ESTRELLAS --- */
.star {
  position: absolute;
  font-size: 13px;
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
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 20;
}

.hud-count {
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.heart {
  font-size: 16px;
  margin-left: 2px;
}

.heart.off {
  opacity: 0.25;
  filter: grayscale(1);
}

/* --- MIME --- */
.mime {
  position: absolute;
  top: 34%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 84px;
  animation: breathe 3s ease-in-out infinite;
  pointer-events: none;
}

.mime.angry {
  animation: shake 0.4s ease-in-out;
}

@keyframes breathe {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -52%) scale(1.03); }
}

@keyframes shake {
  0%, 100% { transform: translate(-50%, -50%); }
  25% { transform: translate(calc(-50% - 10px), -50%); }
  75% { transform: translate(calc(-50% + 10px), -50%); }
}

.warning-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(-50%);
  color: #ff8a65;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  animation: warning-pop 0.9s ease-out forwards;
  pointer-events: none;
  white-space: nowrap;
}

@keyframes warning-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
  20% { opacity: 1; transform: translateX(-50%) scale(1.1); }
  80% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(1); }
}

/* --- ZZZ FLOTANTES --- */
.zzz {
  position: absolute;
  top: 26%;
  color: #7986cb;
  font-size: 24px;
  font-weight: 700;
  animation: zzz-rise 1.6s ease-out forwards;
  pointer-events: none;
}

@keyframes zzz-rise {
  0% { opacity: 0; transform: translateY(0) rotate(-8deg); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-60px) rotate(12deg); }
}

/* --- BARRA DE TIMING --- */
.timing-bar {
  position: absolute;
  bottom: 25%;
  left: 10%;
  width: 80%;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 9px;
  z-index: 10;
}

.zone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(102, 187, 106, 0.75);
  border-radius: 9px;
  transition: left 0.25s ease, width 0.25s ease;
}

.marker {
  position: absolute;
  top: -7px;
  width: 6px;
  height: 32px;
  background: #ffd54f;
  border-radius: 3px;
  transform: translateX(-50%);
  box-shadow: 0 0 8px rgba(255, 213, 79, 0.8);
}

.instruction {
  position: absolute;
  bottom: 14%;
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
  background: rgba(5, 9, 20, 0.75);
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
