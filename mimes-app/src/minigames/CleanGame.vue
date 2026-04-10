<script setup lang="ts">
/**
 * CleanGame.vue — Mini-juego de limpiar
 *
 * Mecánica: aparecen manchas por la pantalla. El jugador
 * pasa el dedo/ratón sobre ellas para limpiarlas.
 * Debe limpiar todas antes de que se acabe el tiempo.
 */
import { ref, onMounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

interface DirtSpot {
  id: number
  x: number
  y: number
  size: number
  cleaned: boolean
}

const TOTAL_SPOTS = 10
const spots = ref<DirtSpot[]>([])
const gameAreaRef = ref<HTMLElement | null>(null)

function generateSpots() {
  spots.value = Array.from({ length: TOTAL_SPOTS }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 75,
    y: 10 + Math.random() * 75,
    size: 30 + Math.random() * 30,
    cleaned: false,
  }))
}

function checkWin() {
  if (spots.value.every(s => s.cleaned)) {
    props.onComplete(true)
  }
}

function cleanAt(clientX: number, clientY: number) {
  if (!props.active || !gameAreaRef.value) return
  const rect = gameAreaRef.value.getBoundingClientRect()
  const px = ((clientX - rect.left) / rect.width) * 100
  const py = ((clientY - rect.top) / rect.height) * 100

  for (const spot of spots.value) {
    if (spot.cleaned) continue
    const dist = Math.sqrt((px - spot.x) ** 2 + (py - spot.y) ** 2)
    if (dist < spot.size / 2 + 5) {
      spot.cleaned = true
    }
  }
  checkWin()
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  cleanAt(t.clientX, t.clientY)
}

function onMouseMove(e: MouseEvent) {
  if (e.buttons === 0) return
  cleanAt(e.clientX, e.clientY)
}

onMounted(generateSpots)
</script>

<template>
  <div
    ref="gameAreaRef"
    class="clean-game"
    @touchmove.prevent="onTouchMove"
    @mousemove="onMouseMove"
  >
    <div
      v-for="spot in spots"
      :key="spot.id"
      class="dirt-spot"
      :class="{ cleaned: spot.cleaned }"
      :style="{
        left: spot.x + '%',
        top: spot.y + '%',
        width: spot.size + 'px',
        height: spot.size + 'px',
      }"
      @touchstart.prevent="() => { spot.cleaned = true; checkWin() }"
      @mousedown="() => { spot.cleaned = true; checkWin() }"
    />

    <div class="clean-counter" v-if="active">
      <span class="counter-num">{{ spots.filter(s => !s.cleaned).length }}</span>
      <span class="counter-label">manchas</span>
    </div>
  </div>
</template>

<style scoped>
.clean-game {
  width: 100%;
  height: 100%;
  position: relative;
  cursor: crosshair;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px);
}

.dirt-spot {
  position: absolute;
  transform: translate(-50%, -50%);
  border-radius: 50% 45% 55% 40%;
  background: radial-gradient(circle at 40% 40%, #6d4c41, #4e342e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s, opacity 0.3s;
  animation: splat-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.dirt-spot:nth-child(even) {
  border-radius: 45% 50% 40% 55%;
  background: radial-gradient(circle at 60% 40%, #558b2f, #33691e);
}

.dirt-spot:nth-child(3n) {
  border-radius: 55% 40% 50% 45%;
  background: radial-gradient(circle at 40% 60%, #795548, #5d4037);
}

.dirt-spot.cleaned {
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  pointer-events: none;
}

@keyframes splat-in {
  0% { transform: translate(-50%, -50%) scale(0) rotate(-20deg); }
  100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}

.clean-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.counter-num { color: #ffd54f; font-size: 28px; font-weight: 700; }
.counter-label { color: rgba(255, 255, 255, 0.5); font-size: 13px; }
</style>
