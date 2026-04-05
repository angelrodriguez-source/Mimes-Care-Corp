<script setup lang="ts">
/**
 * LoveGame.vue — Mini-juego de cariño
 *
 * Mecánica: corazones flotan hacia arriba desde abajo.
 * El jugador debe tocarlos para recogerlos.
 * Debe recoger 6 antes de que se acabe el tiempo.
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

interface Heart {
  id: number
  x: number
  y: number
  emoji: string
  collected: boolean
  speed: number
  wobble: number
}

const TARGET = 6
const collected = ref(0)
const hearts = ref<Heart[]>([])
let spawnTimer: ReturnType<typeof setInterval> | null = null
let moveTimer: ReturnType<typeof setInterval> | null = null
let nextId = 0

const HEARTS = ['❤️', '💛', '💖', '🧡', '💜', '💗', '💕']

function spawnHeart() {
  if (!props.active) return
  hearts.value.push({
    id: nextId++,
    x: 10 + Math.random() * 80,
    y: 105,
    emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
    collected: false,
    speed: 0.4 + Math.random() * 0.4,
    wobble: Math.random() * 2 - 1,
  })
  hearts.value = hearts.value.filter(h => h.y > -10 && !h.collected)
}

function moveHearts() {
  for (const h of hearts.value) {
    if (!h.collected) {
      h.y -= h.speed
      h.x += Math.sin(h.y * 0.05) * h.wobble * 0.3
    }
  }
}

function collectHeart(id: number) {
  if (!props.active) return
  const heart = hearts.value.find(h => h.id === id)
  if (heart && !heart.collected) {
    heart.collected = true
    collected.value++
    if (collected.value >= TARGET) {
      props.onComplete(true)
    }
  }
}

onMounted(() => {
  spawnTimer = setInterval(spawnHeart, 500)
  moveTimer = setInterval(moveHearts, 30)
})

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer)
  if (moveTimer) clearInterval(moveTimer)
})
</script>

<template>
  <div class="love-game">
    <div
      v-for="heart in hearts"
      :key="heart.id"
      class="float-heart"
      :class="{ collected: heart.collected }"
      :style="{ left: heart.x + '%', top: heart.y + '%' }"
      @touchstart.prevent="collectHeart(heart.id)"
      @mousedown="collectHeart(heart.id)"
    >
      {{ heart.emoji }}
    </div>

    <div class="love-counter" v-if="active">
      <span class="counter-num">{{ collected }}/{{ TARGET }}</span>
      <span class="counter-label">corazones</span>
    </div>
  </div>
</template>

<style scoped>
.love-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.float-heart {
  position: absolute;
  font-size: 34px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  animation: heart-pulse 0.6s ease-in-out infinite alternate;
}

.float-heart:active {
  transform: translate(-50%, -50%) scale(1.4);
}

.float-heart.collected {
  transform: translate(-50%, -50%) scale(2);
  opacity: 0;
  transition: all 0.3s;
  pointer-events: none;
}

@keyframes heart-pulse {
  0% { transform: translate(-50%, -50%) scale(1); }
  100% { transform: translate(-50%, -50%) scale(1.15); }
}

.love-counter {
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
