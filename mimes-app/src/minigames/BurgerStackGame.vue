<script setup lang="ts">
/**
 * BurgerStackGame.vue — Mini-juego avanzado "Torre de burger" (alimentar)
 *
 * Apilador clasico: el pan base 🍞 esta fijo abajo-centro. Cada nueva
 * pieza (🥬🍅🧀🥩 alternando, y 🍞 de remate) se desplaza de lado a lado
 * cada vez mas rapido. Tocar = soltarla: cae sobre la pila. Si queda
 * suficientemente alineada con la pieza superior, se apila donde cayo
 * (la torre se ve torcida si apuras). Si no, la pieza cae fuera y la
 * torre se derrumba (derrota). Apilar 6 piezas = victoria.
 *
 * Escala con el tamano de pantalla (baseline 375 de ancho).
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const TOTAL = 6
const INGREDIENTES = ['🥬', '🍅', '🧀', '🥩'] as const
const TOLERANCE = 34       // tolerancia horizontal para apilar (px, baseline 375)
const PIECE_H = 30         // alto visual de cada piso (px, baseline 375)
const BASE_SPEED = 2.6     // velocidad horizontal inicial (px/frame, baseline 375)
const SPEED_PER_FLOOR = 0.8 // incremento de velocidad por piso apilado
const FALL_SPEED = 16      // velocidad de caida al soltar (px/frame, baseline 375)
const EDGE_MARGIN = 45     // margen lateral del recorrido (px, baseline 375)

// --- STATE ---
const containerRef = ref<HTMLElement | null>(null)
const W = ref(375)
const H = ref(667)

// Piezas ya apiladas (x real donde cayeron; y se deriva del indice)
const stack = ref<{ emoji: string; x: number }[]>([])

// Pieza en juego
const pieceX = ref(0)
const pieceY = ref(0)
const pieceState = ref<'moving' | 'falling' | 'lost'>('moving')
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')

// Fisica interna (no reactiva)
let dir = 1
let lastTime = 0
let animFrame = 0
let endTimeout = 0

// --- ESCALADO ---
const sX = () => W.value / 375

// Geometria de la torre
function baseY() { return H.value * 0.88 }
function pieceHpx() { return PIECE_H * sX() }
function movingY() { return H.value * 0.18 }
// X de la pieza superior (o del pan base si aun no hay pisos)
function topX() {
  const top = stack.value[stack.value.length - 1]
  return top ? top.x : W.value / 2
}
// Y del piso `i` (0 = primer piso sobre el pan base)
function floorY(i: number) { return baseY() - (i + 1) * pieceHpx() }

// Emoji del piso `i`: 4 ingredientes alternando, ultimo piso pan de remate
function emojiForFloor(i: number): string {
  if (i === TOTAL - 1) return '🍞'
  return INGREDIENTES[i % INGREDIENTES.length]!
}

const currentEmoji = computed(() => emojiForFloor(stack.value.length))

// --- CICLO DE JUEGO ---
function start() {
  measureContainer()
  stack.value = []
  done.value = false
  result.value = 'none'
  dir = 1
  lastTime = 0
  cancelAnimationFrame(animFrame)
  clearTimeout(endTimeout)
  spawnPiece()
  animFrame = requestAnimationFrame(tick)
}

function spawnPiece() {
  pieceState.value = 'moving'
  pieceX.value = EDGE_MARGIN * sX()
  pieceY.value = movingY()
  dir = 1
}

function tick(now: number) {
  if (!props.active) return
  if (lastTime === 0) lastTime = now
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const frames = dt * 60 // normalizado a 60fps

  if (pieceState.value === 'moving' && !done.value) {
    // Desplazamiento lateral con rebote, mas rapido por cada piso
    const speed = (BASE_SPEED + stack.value.length * SPEED_PER_FLOOR) * sX()
    pieceX.value += dir * speed * frames
    const minX = EDGE_MARGIN * sX()
    const maxX = W.value - EDGE_MARGIN * sX()
    if (pieceX.value >= maxX) { pieceX.value = maxX; dir = -1 }
    if (pieceX.value <= minX) { pieceX.value = minX; dir = 1 }
  } else if (pieceState.value === 'falling') {
    // Caida rapida hacia la cima de la torre
    pieceY.value += FALL_SPEED * sX() * frames
    const targetY = floorY(stack.value.length)
    if (pieceY.value >= targetY) {
      pieceY.value = targetY
      resolveDrop()
    }
  } else if (pieceState.value === 'lost') {
    // La pieza fallida sigue cayendo fuera de la torre
    pieceY.value += FALL_SPEED * sX() * frames
    if (pieceY.value > H.value + 80) {
      lose()
    }
  }

  animFrame = requestAnimationFrame(tick)
}

function resolveDrop() {
  const offset = Math.abs(pieceX.value - topX())
  if (offset <= TOLERANCE * sX()) {
    // Apilada donde cayo: offset visual real (torre torcida si apuras)
    stack.value.push({ emoji: currentEmoji.value, x: pieceX.value })
    if (stack.value.length >= TOTAL) {
      win()
      return
    }
    spawnPiece()
  } else {
    // Demasiado desviada: cae fuera y se acabo
    pieceState.value = 'lost'
  }
}

function win() {
  if (done.value) return
  done.value = true
  result.value = 'win'
  pieceState.value = 'moving' // oculta la pieza en juego
  cancelAnimationFrame(animFrame)
  endTimeout = window.setTimeout(() => {
    props.onComplete(true)
  }, 700)
}

function lose() {
  if (done.value) return
  done.value = true
  result.value = 'lose'
  cancelAnimationFrame(animFrame)
  endTimeout = window.setTimeout(() => {
    props.onComplete(false)
  }, 700)
}

// --- INPUT ---
function onTap() {
  if (!props.active || done.value) return
  if (pieceState.value !== 'moving') return
  pieceState.value = 'falling'
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
})
</script>

<template>
  <div
    ref="containerRef"
    class="burger-game"
    @touchstart.prevent="onTap"
    @mousedown="onTap"
  >
    <!-- HUD -->
    <div class="hud" v-if="active">Piso {{ stack.length }}/{{ TOTAL }}</div>

    <!-- Mostrador -->
    <div class="counter"></div>

    <!-- Pan base fijo -->
    <div
      class="piece base"
      :style="{ left: W / 2 + 'px', top: baseY() + 'px' }"
    >
      🍞
    </div>

    <!-- Piezas apiladas (cada una donde cayo) -->
    <div
      v-for="(p, i) in stack"
      :key="'piso-' + i"
      class="piece"
      :style="{ left: p.x + 'px', top: floorY(i) + 'px' }"
    >
      {{ p.emoji }}
    </div>

    <!-- Pieza en juego (moviendose o cayendo) -->
    <div
      v-if="!done || pieceState === 'lost'"
      class="piece current"
      :class="{ tumbling: pieceState === 'lost' }"
      :style="{ left: pieceX + 'px', top: pieceY + 'px' }"
    >
      {{ currentEmoji }}
    </div>

    <!-- Overlay de resultado -->
    <div v-if="result !== 'none'" class="result-overlay">
      <div class="result-emoji">{{ result === 'win' ? '🍔' : '🍔💥' }}</div>
      <div class="result-text">
        {{ result === 'win' ? '¡Burger perfecta!' : '¡Se cayo la torre!' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.burger-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #263238 0%, #37474f 50%, #455a64 100%);
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

/* --- MOSTRADOR --- */
.counter {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 9%;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border-top: 3px solid #8d6e63;
}

/* --- PIEZAS --- */
.piece {
  position: absolute;
  font-size: 42px;
  line-height: 1;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.45));
  pointer-events: none;
  z-index: 10;
}

.piece.base {
  z-index: 9;
}

.piece.current {
  z-index: 11;
}

.piece.tumbling {
  animation: tumble 0.6s linear infinite;
}

@keyframes tumble {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
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
