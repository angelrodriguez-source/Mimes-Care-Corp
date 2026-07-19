<script setup lang="ts">
/**
 * LightsOffGame.vue — Mini-juego facil de descansar
 *
 * Mecanica: "Luces fuera". Hay 6 lamparas encendidas repartidas por la
 * pantalla. Toca cada una para apagarla, pero cada ~1.5s una lampara ya
 * apagada se vuelve a encender. Ganas cuando consigues tenerlas TODAS
 * apagadas a la vez. Sin derrota: la presion la pone el tiempo del shell.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const LAMP_COUNT = 6      // numero de lamparas
const RELIGHT_MS = 1500   // cada cuanto se re-enciende una apagada
const COLS = 3            // cuadricula base 3x2
const JITTER_X = 6        // perturbacion horizontal (%) de cada celda
const JITTER_Y = 6        // perturbacion vertical (%) de cada celda

interface Lamp {
  id: number
  left: string
  top: string
  on: boolean
}

// --- STATE ---
const lamps = ref<Lamp[]>([])
const won = ref(false)
const done = ref(false)

let relightInterval = 0
let endTimeout = 0

// --- HELPERS ---
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Genera posiciones sobre una cuadricula 3x2 perturbada (sin solapes). */
function buildLamps(): Lamp[] {
  const result: Lamp[] = []
  for (let i = 0; i < LAMP_COUNT; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    // Centros de celda: columnas al 20/50/80%, filas al 38/68%
    const baseLeft = 20 + col * 30
    const baseTop = 38 + row * 30
    result.push({
      id: i,
      left: (baseLeft + rand(-JITTER_X, JITTER_X)) + '%',
      top: (baseTop + rand(-JITTER_Y, JITTER_Y)) + '%',
      on: true,
    })
  }
  return result
}

// --- INICIO / RESET ---
function start() {
  won.value = false
  done.value = false
  lamps.value = buildLamps()
  clearInterval(relightInterval)
  clearTimeout(endTimeout)

  // Cada RELIGHT_MS, una lampara apagada al azar se re-enciende
  // (nunca cuando ya estan todas apagadas: ahi ya se ha ganado)
  relightInterval = window.setInterval(() => {
    if (done.value) return
    const offLamps = lamps.value.filter((l) => !l.on)
    if (offLamps.length === 0) return // nada que re-encender
    const pick = offLamps[Math.floor(Math.random() * offLamps.length)]
    if (pick) pick.on = true
  }, RELIGHT_MS)
}

// --- INPUT: tocar una lampara ---
function tapLamp(id: number) {
  if (!props.active || done.value) return
  const lamp = lamps.value.find((l) => l.id === id)
  if (!lamp || !lamp.on) return

  lamp.on = false

  // Victoria: todas apagadas a la vez
  if (lamps.value.every((l) => !l.on)) {
    done.value = true
    won.value = true
    clearInterval(relightInterval)
    endTimeout = window.setTimeout(() => props.onComplete(true), 700)
  }
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  clearInterval(relightInterval)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="lightsoff-game">
    <!-- Luna decorativa con glow -->
    <div class="moon">🌙</div>

    <!-- HUD: lamparas apagadas -->
    <div class="hud">
      Apagadas: {{ lamps.filter((l) => !l.on).length }}/{{ LAMP_COUNT }}
    </div>

    <!-- Lamparas (posiciones precomputadas en start) -->
    <button
      v-for="lamp in lamps"
      :key="lamp.id"
      class="lamp"
      :class="{ on: lamp.on, off: !lamp.on }"
      :style="{ left: lamp.left, top: lamp.top }"
      @touchstart.prevent="tapLamp(lamp.id)"
      @mousedown="tapLamp(lamp.id)"
    >{{ lamp.on ? '💡' : '🌑' }}</button>

    <p v-if="!done" class="instruction">Apaga todas las luces a la vez!</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">😴</div>
      <p class="overlay-text">A dormir!</p>
    </div>
  </div>
</template>

<style scoped>
.lightsoff-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #04070f 0%, #0a1226 55%, #12203e 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* --- LUNA --- */
.moon {
  position: absolute;
  top: 6%;
  right: 10%;
  font-size: 42px;
  filter: drop-shadow(0 0 14px rgba(255, 241, 178, 0.55));
  animation: moon-glow 3.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes moon-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 241, 178, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 241, 178, 0.75)); }
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
  white-space: nowrap;
}

/* --- LAMPARAS --- */
.lamp {
  position: absolute;
  transform: translate(-50%, -50%);
  background: none;
  border: none;
  padding: 8px;
  font-size: 42px;
  cursor: pointer;
  line-height: 1;
  touch-action: manipulation;
}

.lamp.on {
  filter: drop-shadow(0 0 12px rgba(255, 224, 130, 0.85));
  animation: relight-pop 0.35s ease;
}

.lamp.off {
  opacity: 0.4;
  filter: grayscale(0.6);
  animation: turn-off 0.3s ease;
}

/* Pop al (re)encenderse */
@keyframes relight-pop {
  0% { transform: translate(-50%, -50%) scale(0.6); }
  60% { transform: translate(-50%, -50%) scale(1.15); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

/* Encogimiento suave al apagarse */
@keyframes turn-off {
  0% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
}

.instruction {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  pointer-events: none;
}

/* --- OVERLAY --- */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(4, 7, 15, 0.75);
  z-index: 50;
  animation: overlay-in 0.3s ease;
}

.overlay-emoji {
  font-size: 72px;
}

.overlay-text {
  color: #ffd54f;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
