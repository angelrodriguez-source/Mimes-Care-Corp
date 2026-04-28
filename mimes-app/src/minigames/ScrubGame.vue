<script setup lang="ts">
/**
 * ScrubGame.vue — Mini-juego avanzado de limpieza
 *
 * Mecanica: la pantalla esta cubierta de suciedad (grid de celdas).
 * El jugador arrastra una esponja para limpiar. Necesita limpiar
 * al menos el 90% de la superficie para ganar.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

const COLS = 10
const ROWS = 14
const TOTAL_CELLS = COLS * ROWS
const WIN_PERCENT = 90
const SPONGE_RADIUS = 1.8

const containerRef = ref<HTMLElement | null>(null)
const cells = ref<boolean[]>(new Array(TOTAL_CELLS).fill(false))
const spongeX = ref(50)
const spongeY = ref(50)
const spongeVisible = ref(false)
const done = ref(false)

const cleanedCount = computed(() => cells.value.filter(c => c).length)
const cleanedPercent = computed(() => Math.round((cleanedCount.value / TOTAL_CELLS) * 100))

function getCellIndex(col: number, row: number): number {
  return row * COLS + col
}

function cleanCellsAround(pxPercent: number, pyPercent: number) {
  const col = (pxPercent / 100) * COLS
  const row = (pyPercent / 100) * ROWS

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = getCellIndex(c, r)
      if (cells.value[idx]) continue
      const dx = c + 0.5 - col
      const dy = r + 0.5 - row
      if (dx * dx + dy * dy <= SPONGE_RADIUS * SPONGE_RADIUS) {
        cells.value[idx] = true
      }
    }
  }

  checkWin()
}

function checkWin() {
  if (done.value) return
  if (cleanedPercent.value >= WIN_PERCENT) {
    done.value = true
    props.onComplete(true)
  }
}

function getEventPercent(e: MouseEvent | TouchEvent): { px: number; py: number } | null {
  if (!containerRef.value) return null
  const rect = containerRef.value.getBoundingClientRect()
  let clientX: number, clientY: number

  if ('touches' in e) {
    const t = e.touches[0]
    if (!t) return null
    clientX = t.clientX
    clientY = t.clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }

  const px = ((clientX - rect.left) / rect.width) * 100
  const py = ((clientY - rect.top) / rect.height) * 100
  return { px, py }
}

function onPointerStart(e: MouseEvent | TouchEvent) {
  if (!props.active || done.value) return
  spongeVisible.value = true
  const pos = getEventPercent(e)
  if (!pos) return
  spongeX.value = pos.px
  spongeY.value = pos.py
  cleanCellsAround(pos.px, pos.py)
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  if (!props.active || done.value || !spongeVisible.value) return
  if ('buttons' in e && e.buttons === 0) {
    spongeVisible.value = false
    return
  }
  const pos = getEventPercent(e)
  if (!pos) return
  spongeX.value = pos.px
  spongeY.value = pos.py
  cleanCellsAround(pos.px, pos.py)
}

function onPointerEnd() {
  spongeVisible.value = false
}

watch(() => props.active, (val) => {
  if (val) {
    cells.value = new Array(TOTAL_CELLS).fill(false)
    done.value = false
    spongeVisible.value = false
  }
}, { immediate: true })

onUnmounted(() => {
  // cleanup
})
</script>

<template>
  <div
    ref="containerRef"
    class="scrub-game"
    @touchstart.prevent="onPointerStart"
    @touchmove.prevent="onPointerMove"
    @touchend="onPointerEnd"
    @touchcancel="onPointerEnd"
    @mousedown="onPointerStart"
    @mousemove="onPointerMove"
    @mouseup="onPointerEnd"
    @mouseleave="onPointerEnd"
  >
    <!-- Clean background (visible where cells are cleaned) -->
    <div class="clean-bg"></div>

    <!-- Dirt grid overlay -->
    <div class="dirt-grid">
      <div
        v-for="(cleaned, idx) in cells"
        :key="idx"
        class="dirt-cell"
        :class="{ cleaned }"
      ></div>
    </div>

    <!-- Sponge cursor -->
    <div
      v-if="spongeVisible"
      class="sponge"
      :style="{ left: spongeX + '%', top: spongeY + '%' }"
    >
      🧽
    </div>

    <!-- Progress display -->
    <div class="progress-display" v-if="active">
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill"
          :style="{ width: cleanedPercent + '%' }"
          :class="{ winning: cleanedPercent >= WIN_PERCENT }"
        ></div>
      </div>
      <span class="progress-text">{{ cleanedPercent }}%</span>
    </div>

    <!-- Instruction hint -->
    <div class="hint" v-if="active && cleanedCount === 0">
      Arrastra para limpiar
    </div>
  </div>
</template>

<style scoped>
.scrub-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: none;
  touch-action: none;
}

.clean-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #e1f5fe 100%);
  z-index: 0;
}

.dirt-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(14, 1fr);
  z-index: 1;
}

.dirt-cell {
  background: #6d4c41;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}

.dirt-cell:nth-child(odd) {
  background: #5d4037;
}

.dirt-cell:nth-child(3n) {
  background: #4e342e;
}

.dirt-cell:nth-child(7n) {
  background: #795548;
}

.dirt-cell.cleaned {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
}

/* --- SPONGE --- */
.sponge {
  position: absolute;
  font-size: 48px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
  animation: sponge-wobble 0.3s ease-in-out infinite alternate;
}

@keyframes sponge-wobble {
  0% { transform: translate(-50%, -50%) rotate(-5deg); }
  100% { transform: translate(-50%, -50%) rotate(5deg); }
}

/* --- PROGRESS --- */
.progress-display {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 14px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.progress-bar-bg {
  width: 120px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #ffd54f;
  border-radius: 4px;
  transition: width 0.2s ease;
}

.progress-bar-fill.winning {
  background: #66bb6a;
}

.progress-text {
  color: white;
  font-size: 14px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

/* --- HINT --- */
.hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  font-weight: 700;
  z-index: 15;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  animation: hint-pulse 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
</style>
