<script setup lang="ts">
/**
 * BalloonBlowGame.vue — Mini-juego facil de jugar
 *
 * Mecanica: "Globos". Manten pulsado para inflar el globo central; un
 * medidor vertical muestra el tamano con una zona verde (70-90%). Suelta
 * dentro de la zona para atar el globo (+1, sale volando). Si te pasas
 * del 100% explota (PUM, sin derrota: aparece otro globo); si sueltas
 * antes de la zona se desinfla. Consigue 3 globos buenos para ganar.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const REQUIRED = 3          // globos buenos necesarios
const ZONE_MIN = 0.70       // inicio de la zona verde (fraccion del medidor)
const ZONE_MAX = 0.90       // fin de la zona verde
const INFLATE_RATE = 1.05   // fraccion de llenado por segundo al pulsar
const DEFLATE_RATE = 2.8    // fraccion de vaciado por segundo al soltar pronto
const FLY_MS = 650          // duracion de la animacion de vuelo
const POP_MS = 700          // duracion del PUM antes del siguiente globo

// Nubes decorativas: posiciones fijas (nada de Math.random en template)
const CLOUDS = [
  { left: '12%', top: '14%', delay: '0s' },
  { left: '68%', top: '9%', delay: '1.2s' },
  { left: '38%', top: '24%', delay: '2.4s' },
] as const

// --- STATE ---
const count = ref(0)          // globos atados
const fill = ref(0)           // inflado actual 0..1 (puede rozar 1 antes del PUM)
const pressing = ref(false)   // el jugador mantiene pulsado
const flying = ref(false)     // globo bueno saliendo volando
const popped = ref(false)     // globo explotado (💥 visible)
const pffff = ref(false)      // aviso de soltar demasiado pronto
const won = ref(false)
const done = ref(false)

let rafId = 0
let lastTs = 0
let flyTimeout = 0
let popTimeout = 0
let pffTimeout = 0
let endTimeout = 0

// Escala visual del globo segun inflado
const balloonScale = computed(() => 0.6 + fill.value * 1.1)

// Altura visible del medidor (recortada al 100%)
const meterFill = computed(() => Math.min(fill.value, 1) * 100)

// El inflado actual esta dentro de la zona verde
const inZone = computed(() => fill.value >= ZONE_MIN && fill.value <= ZONE_MAX)

// --- BUCLE DE ANIMACION (inflado / desinflado) ---
function tick(ts: number) {
  if (done.value) return
  if (lastTs > 0) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05) // dt acotado por si se pausa la pestana
    if (pressing.value) {
      fill.value += INFLATE_RATE * dt
      if (fill.value >= 1) pop() // pasado el 100% → PUM
    } else if (!flying.value && fill.value > 0) {
      // Desinflado rapido tras soltar fuera de la zona
      fill.value = Math.max(0, fill.value - DEFLATE_RATE * dt)
    }
  }
  lastTs = ts
  rafId = requestAnimationFrame(tick)
}

// --- INICIO / RESET ---
function start() {
  count.value = 0
  fill.value = 0
  pressing.value = false
  flying.value = false
  popped.value = false
  pffff.value = false
  won.value = false
  done.value = false
  lastTs = 0
  cancelAnimationFrame(rafId)
  clearTimeout(flyTimeout)
  clearTimeout(popTimeout)
  clearTimeout(pffTimeout)
  clearTimeout(endTimeout)
  rafId = requestAnimationFrame(tick)
}

// --- INPUT: mantener pulsado / soltar ---
function onPress() {
  if (!props.active || done.value) return
  if (flying.value || popped.value) return // espera al siguiente globo
  pffff.value = false
  pressing.value = true
}

function onRelease() {
  if (!props.active || done.value) return
  if (!pressing.value) return
  pressing.value = false

  if (fill.value >= ZONE_MIN && fill.value <= ZONE_MAX) {
    tieBalloon()
  } else if (fill.value > 0) {
    // Soltado antes de la zona: pffff, se desinfla solo (rAF)
    pffff.value = true
    clearTimeout(pffTimeout)
    pffTimeout = window.setTimeout(() => { pffff.value = false }, 900)
  }
}

// Globo bueno: atado, +1 y sale volando
function tieBalloon() {
  count.value++
  flying.value = true

  if (count.value >= REQUIRED) {
    done.value = true
    won.value = true
    cancelAnimationFrame(rafId)
    endTimeout = window.setTimeout(() => props.onComplete(true), 700)
    return
  }

  clearTimeout(flyTimeout)
  flyTimeout = window.setTimeout(() => {
    flying.value = false
    fill.value = 0 // aparece un globo nuevo
  }, FLY_MS)
}

// Globo explotado: PUM y aparece otro (sin derrota)
function pop() {
  pressing.value = false
  popped.value = true
  fill.value = 0
  clearTimeout(popTimeout)
  popTimeout = window.setTimeout(() => { popped.value = false }, POP_MS)
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(flyTimeout)
  clearTimeout(popTimeout)
  clearTimeout(pffTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div
    class="balloon-game"
    @pointerdown.prevent="onPress"
    @pointerup="onRelease"
    @pointercancel="onRelease"
    @pointerleave="onRelease"
  >
    <!-- Nubes decorativas -->
    <span
      v-for="(cloud, i) in CLOUDS"
      :key="'cloud-' + i"
      class="cloud"
      :style="{ left: cloud.left, top: cloud.top, animationDelay: cloud.delay }"
    >☁️</span>

    <!-- HUD: globos conseguidos -->
    <div class="hud">
      <span class="hud-count">{{ count }}/{{ REQUIRED }}</span>
    </div>

    <!-- Globo central: se infla al pulsar, vuela al atarlo, PUM si revienta -->
    <div v-if="popped" class="boom">💥</div>
    <div
      v-else
      class="balloon"
      :class="{ flying }"
      :style="flying ? undefined : { transform: `translate(-50%, -50%) scale(${balloonScale})` }"
    >🎈</div>

    <p v-if="popped" class="pop-text">PUM!</p>
    <p v-if="pffff" class="pff-text">pffff...</p>

    <!-- Medidor vertical con zona verde (70-90%) -->
    <div class="meter">
      <div class="meter-zone"></div>
      <div class="meter-fill" :class="{ good: inZone }" :style="{ height: meterFill + '%' }"></div>
    </div>

    <p v-if="!done" class="instruction">Manten pulsado para inflar y suelta en la zona verde</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">🎈🎈🎈</div>
      <p class="overlay-text win">Fiesta de globos!</p>
    </div>
  </div>
</template>

<style scoped>
.balloon-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #7ec8f2 0%, #a8dcf7 55%, #d3effc 100%);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}

/* --- NUBES --- */
.cloud {
  position: absolute;
  font-size: 26px;
  opacity: 0.85;
  animation: cloud-drift 6s ease-in-out infinite;
  pointer-events: none;
}

@keyframes cloud-drift {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(14px); }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
}

.hud-count {
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* --- GLOBO --- */
.balloon {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  transform-origin: center bottom;
  pointer-events: none;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
}

.balloon.flying {
  animation: fly-away 0.65s ease-in forwards;
}

@keyframes fly-away {
  0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
  100% { transform: translate(-30%, -320%) scale(1.2) rotate(12deg); opacity: 0; }
}

/* --- PUM --- */
.boom {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  animation: boom-pop 0.4s ease-out;
  pointer-events: none;
}

@keyframes boom-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); }
  60% { transform: translate(-50%, -50%) scale(1.3); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

.pop-text,
.pff-text {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  animation: text-pop 0.9s ease-out forwards;
  pointer-events: none;
  white-space: nowrap;
}

.pop-text { color: #e53935; }
.pff-text { color: #607d8b; }

@keyframes text-pop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.7); }
  20% { opacity: 1; transform: translateX(-50%) scale(1.1); }
  80% { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(1); }
}

/* --- MEDIDOR VERTICAL --- */
.meter {
  position: absolute;
  right: 8%;
  top: 22%;
  width: 22px;
  height: 56%;
  background: rgba(255, 255, 255, 0.45);
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-radius: 11px;
  overflow: hidden;
  z-index: 10;
  pointer-events: none;
}

/* Zona verde: 70-90% desde abajo */
.meter-zone {
  position: absolute;
  bottom: 70%;
  left: 0;
  right: 0;
  height: 20%;
  background: rgba(102, 187, 106, 0.85);
}

.meter-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ff8a65;
  transition: background 0.15s ease;
}

.meter-fill.good {
  background: #43a047;
}

.instruction {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
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
  background: rgba(30, 60, 90, 0.7);
  z-index: 50;
  animation: overlay-in 0.3s ease;
}

.overlay-emoji {
  font-size: 56px;
}

.overlay-text {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.overlay-text.win { color: #ffd54f; }

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
