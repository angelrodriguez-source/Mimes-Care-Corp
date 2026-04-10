<script setup lang="ts">
/**
 * PlayGame.vue — Mini-juego de jugar
 *
 * Mecánica: un emoji rebota por la pantalla.
 * El jugador debe tocarlo 8 veces en 5 segundos.
 * Cada vez que lo toca, se mueve a otro sitio.
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

const TARGET = 8
const taps = ref(0)
const targetX = ref(50)
const targetY = ref(50)
const targetEmoji = ref('🎾')
let moveTimer: ReturnType<typeof setInterval> | null = null

const EMOJIS = ['🎾', '⚽', '🏀', '🎯', '⭐']

function moveTarget() {
  targetX.value = 15 + Math.random() * 70
  targetY.value = 15 + Math.random() * 70
  targetEmoji.value = EMOJIS[Math.floor(Math.random() * EMOJIS.length)] ?? '🎾'
}

function tapTarget() {
  if (!props.active) return
  taps.value++
  moveTarget()
  if (taps.value >= TARGET) {
    props.onComplete(true)
  }
}

onMounted(() => {
  moveTarget()
})

watch(() => props.active, (val) => {
  if (val) {
    moveTimer = setInterval(() => {
      moveTarget()
    }, 1200)
  }
}, { immediate: true })

onUnmounted(() => {
  if (moveTimer) clearInterval(moveTimer)
})
</script>

<template>
  <div class="play-game">
    <div
      class="bounce-target"
      :style="{ left: targetX + '%', top: targetY + '%' }"
      @touchstart.prevent="tapTarget"
      @mousedown="tapTarget"
      :key="taps"
    >
      {{ targetEmoji }}
    </div>

    <div class="play-counter" v-if="active">
      <span class="counter-num">{{ taps }}/{{ TARGET }}</span>
      <span class="counter-label">toques</span>
    </div>
  </div>
</template>

<style scoped>
.play-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.bounce-target {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 52px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  animation: target-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: left 0.2s ease-out, top 0.2s ease-out;
}

.bounce-target:active {
  transform: translate(-50%, -50%) scale(0.8);
}

@keyframes target-appear {
  0% { transform: translate(-50%, -50%) scale(0) rotate(-180deg); }
  100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
}

.play-counter {
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
