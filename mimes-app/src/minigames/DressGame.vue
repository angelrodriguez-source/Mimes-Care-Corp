<script setup lang="ts">
/**
 * DressGame.vue — Mini-juego de vestir
 *
 * Mecánica: aparecen prendas de distintos colores.
 * El jugador debe tocar SOLO las que coincidan con
 * el color del Mime. Si toca una incorrecta, pierde.
 * Debe acertar 4 correctas para ganar.
 */
import { ref, onMounted } from 'vue'
import type { ColorTheme } from '../models/MimeModel'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
  colorTheme?: ColorTheme
}>()

interface ClothingItem {
  id: number
  emoji: string
  color: string
  isCorrect: boolean
  x: number
  y: number
  tapped: boolean
}

const TARGET = 4
const correct = ref(0)
const items = ref<ClothingItem[]>([])

const CLOTHES = ['👕', '👖', '🧢', '👗', '🧣', '🧤', '👟', '🎩']

const COLOR_MAP: Record<ColorTheme, { name: string; hex: string }> = {
  celeste: { name: 'azul', hex: '#1565c0' },
  lila: { name: 'morado', hex: '#6a1b9a' },
  melocoton: { name: 'naranja', hex: '#e65100' },
}

const WRONG_COLORS = [
  { name: 'rojo', hex: '#c62828' },
  { name: 'verde', hex: '#2e7d32' },
  { name: 'rosa', hex: '#ad1457' },
  { name: 'gris', hex: '#546e7a' },
]

function generateItems() {
  const theme = props.colorTheme || 'celeste'
  const correctColor = COLOR_MAP[theme]
  const allItems: ClothingItem[] = []

  // 5 correctas
  for (let i = 0; i < 5; i++) {
    allItems.push({
      id: i,
      emoji: CLOTHES[Math.floor(Math.random() * CLOTHES.length)] ?? '👕',
      color: correctColor.hex,
      isCorrect: true,
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 75,
      tapped: false,
    })
  }

  // 7 incorrectas
  for (let i = 5; i < 12; i++) {
    const wrongColor = WRONG_COLORS[Math.floor(Math.random() * WRONG_COLORS.length)] ?? WRONG_COLORS[0]!
    allItems.push({
      id: i,
      emoji: CLOTHES[Math.floor(Math.random() * CLOTHES.length)] ?? '👕',
      color: wrongColor.hex,
      isCorrect: false,
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 75,
      tapped: false,
    })
  }

  // Mezclar
  items.value = allItems.sort(() => Math.random() - 0.5)
}

function tapItem(id: number) {
  if (!props.active) return
  const item = items.value.find(i => i.id === id)
  if (!item || item.tapped) return

  item.tapped = true

  if (item.isCorrect) {
    correct.value++
    if (correct.value >= TARGET) {
      props.onComplete(true)
    }
  } else {
    // Tocó una incorrecta → pierde
    props.onComplete(false)
  }
}

onMounted(generateItems)
</script>

<template>
  <div class="dress-game">
    <!-- Color objetivo -->
    <div class="target-color" v-if="active">
      <span class="target-swatch" :style="{ background: COLOR_MAP[colorTheme || 'celeste'].hex }"></span>
      <span class="target-text">Toca solo {{ COLOR_MAP[colorTheme || 'celeste'].name }}</span>
    </div>

    <div
      v-for="item in items"
      :key="item.id"
      class="clothing-item"
      :class="{ tapped: item.tapped, wrong: item.tapped && !item.isCorrect }"
      :style="{
        left: item.x + '%',
        top: item.y + '%',
        filter: `drop-shadow(0 0 6px ${item.color})`,
      }"
      @touchstart.prevent="tapItem(item.id)"
      @mousedown="tapItem(item.id)"
    >
      <span class="item-emoji">{{ item.emoji }}</span>
      <span class="item-dot" :style="{ background: item.color }"></span>
    </div>

    <div class="dress-counter" v-if="active">
      <span class="counter-num">{{ correct }}/{{ TARGET }}</span>
      <span class="counter-label">correctos</span>
    </div>
  </div>
</template>

<style scoped>
.dress-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.target-color {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 16px;
  border-radius: 20px;
  z-index: 5;
}

.target-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.target-text {
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.clothing-item {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: item-float 2s ease-in-out infinite alternate;
}

.clothing-item:nth-child(even) { animation-delay: -1s; }

.clothing-item.tapped {
  pointer-events: none;
}

.clothing-item.tapped:not(.wrong) {
  transform: translate(-50%, -50%) scale(1.5);
  opacity: 0;
  transition: all 0.3s;
}

.clothing-item.wrong {
  animation: wrong-shake 0.4s ease-in-out !important;
}

.item-emoji { font-size: 36px; }

.item-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: -4px;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
}

@keyframes item-float {
  0% { transform: translate(-50%, -50%) translateY(-3px); }
  100% { transform: translate(-50%, -50%) translateY(3px); }
}

@keyframes wrong-shake {
  0%, 100% { transform: translate(-50%, -50%); opacity: 1; }
  25% { transform: translate(calc(-50% - 8px), -50%); }
  50% { opacity: 0.5; }
  75% { transform: translate(calc(-50% + 8px), -50%); }
}

.dress-counter {
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
