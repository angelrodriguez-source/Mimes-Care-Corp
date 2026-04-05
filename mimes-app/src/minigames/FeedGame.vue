<script setup lang="ts">
/**
 * FeedGame.vue — Mini-juego de alimentar
 *
 * Mecánica: caen alimentos desde arriba. El jugador los
 * toca para atraparlos. Debe atrapar 5 en 5 segundos.
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

interface FoodItem {
  id: number
  x: number
  y: number
  emoji: string
  caught: boolean
  speed: number
}

const TARGET = 5
const caught = ref(0)
const items = ref<FoodItem[]>([])
let spawnTimer: ReturnType<typeof setInterval> | null = null
let moveTimer: ReturnType<typeof setInterval> | null = null
let nextId = 0

const FOODS = ['🍖', '🍕', '🍎', '🍩', '🌮', '🍪', '🧁', '🍌']

function spawnFood() {
  if (!props.active) return
  items.value.push({
    id: nextId++,
    x: 10 + Math.random() * 80,
    y: -5,
    emoji: FOODS[Math.floor(Math.random() * FOODS.length)],
    caught: false,
    speed: 0.8 + Math.random() * 0.6,
  })
  // Limpiar items fuera de pantalla
  items.value = items.value.filter(i => i.y < 110 && !i.caught)
}

function moveItems() {
  for (const item of items.value) {
    if (!item.caught) {
      item.y += item.speed
    }
  }
}

function catchFood(id: number) {
  if (!props.active) return
  const item = items.value.find(i => i.id === id)
  if (item && !item.caught) {
    item.caught = true
    caught.value++
    if (caught.value >= TARGET) {
      props.onComplete(true)
    }
  }
}

onMounted(() => {
  spawnTimer = setInterval(spawnFood, 400)
  moveTimer = setInterval(moveItems, 30)
})

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer)
  if (moveTimer) clearInterval(moveTimer)
})
</script>

<template>
  <div class="feed-game">
    <div
      v-for="item in items"
      :key="item.id"
      class="food-item"
      :class="{ caught: item.caught }"
      :style="{ left: item.x + '%', top: item.y + '%' }"
      @touchstart.prevent="catchFood(item.id)"
      @mousedown="catchFood(item.id)"
    >
      {{ item.emoji }}
    </div>

    <div class="feed-counter" v-if="active">
      <span class="counter-num">{{ caught }}/{{ TARGET }}</span>
      <span class="counter-label">atrapados</span>
    </div>
  </div>
</template>

<style scoped>
.feed-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.food-item {
  position: absolute;
  font-size: 36px;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.15s;
  animation: food-wobble 0.8s ease-in-out infinite alternate;
  user-select: none;
  -webkit-user-select: none;
}

.food-item:active {
  transform: translate(-50%, -50%) scale(1.3);
}

.food-item.caught {
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  transition: transform 0.2s, opacity 0.2s;
  pointer-events: none;
}

@keyframes food-wobble {
  0% { transform: translate(-50%, -50%) rotate(-8deg); }
  100% { transform: translate(-50%, -50%) rotate(8deg); }
}

.feed-counter {
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
