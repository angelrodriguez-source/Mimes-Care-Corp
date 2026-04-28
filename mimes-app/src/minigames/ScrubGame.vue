<script setup lang="ts">
/**
 * ScrubGame.vue — Mini-juego avanzado de limpieza
 *
 * Mecanica: pantalla sucia con minas escondidas (💣).
 * Arrastra la esponja para limpiar sin tocar las minas.
 * Grid fino (20x28) con minas espaciadas para que sea
 * dificil pero siempre posible.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

const COLS = 20
const ROWS = 28
const TOTAL_CELLS = COLS * ROWS
const MINE_COUNT = 25
const MIN_MINE_DIST = 3.5
const WIN_PERCENT = 85
const SPONGE_RADIUS = 1.2

type CellType = 'dirt' | 'mine'

const containerRef = ref<HTMLElement | null>(null)
const cellTypes = ref<CellType[]>([])
const cleaned = ref<boolean[]>([])
const spongeX = ref(50)
const spongeY = ref(50)
const spongeVisible = ref(false)
const done = ref(false)
const hitMine = ref(false)

const safeCells = computed(() => cellTypes.value.filter(c => c === 'dirt').length)
const cleanedSafe = computed(() => {
  let count = 0
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (cellTypes.value[i] === 'dirt' && cleaned.value[i]) count++
  }
  return count
})
const cleanedPercent = computed(() =>
  safeCells.value > 0 ? Math.round((cleanedSafe.value / safeCells.value) * 100) : 0
)

function generateLevel() {
  const types: CellType[] = new Array(TOTAL_CELLS).fill('dirt')
  const mines: { col: number; row: number }[] = []

  let placed = 0
  let attempts = 0
  while (placed < MINE_COUNT && attempts < 2000) {
    attempts++
    const col = Math.floor(Math.random() * COLS)
    const row = Math.floor(Math.random() * ROWS)
    const idx = row * COLS + col
    if (types[idx] === 'mine') continue

    // Ensure minimum distance from all other mines
    let tooClose = false
    for (const m of mines) {
      const dx = col - m.col
      const dy = row - m.row
      if (dx * dx + dy * dy < MIN_MINE_DIST * MIN_MINE_DIST) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    types[idx] = 'mine'
    mines.push({ col, row })
    placed++
  }

  cellTypes.value = types
  cleaned.value = new Array(TOTAL_CELLS).fill(false)
}

function processAt(pxPercent: number, pyPercent: number) {
  const col = (pxPercent / 100) * COLS
  const row = (pyPercent / 100) * ROWS

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dx = c + 0.5 - col
      const dy = r + 0.5 - row
      if (dx * dx + dy * dy > SPONGE_RADIUS * SPONGE_RADIUS) continue

      const idx = r * COLS + c
      if (cellTypes.value[idx] === 'mine') {
        if (!done.value) {
          done.value = true
          hitMine.value = true
          props.onComplete(false)
        }
        return
      }
      cleaned.value[idx] = true
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
  processAt(pos.px, pos.py)
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
  processAt(pos.px, pos.py)
}

function onPointerEnd() {
  spongeVisible.value = false
}

watch(() => props.active, (val) => {
  if (val) {
    generateLevel()
    done.value = false
    hitMine.value = false
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
    <!-- Clean background -->
    <div class="clean-bg"></div>

    <!-- Dirt grid overlay -->
    <div class="dirt-grid">
      <div
        v-for="(type, idx) in cellTypes"
        :key="idx"
        class="dirt-cell"
        :class="{
          cleaned: cleaned[idx],
          mine: type === 'mine',
        }"
      >
        <span v-if="type === 'mine'" class="mine-icon">💣</span>
      </div>
    </div>

    <!-- Sponge cursor -->
    <div
      v-if="spongeVisible && !done"
      class="sponge"
      :style="{ left: spongeX + '%', top: spongeY + '%' }"
    >
      🧽
    </div>

    <!-- Hit mine feedback -->
    <div v-if="hitMine" class="mine-flash">
      <span class="mine-boom">💥</span>
      <span class="mine-text">Pisaste una mina!</span>
    </div>

    <!-- Progress display -->
    <div class="progress-display" v-if="active && !hitMine">
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill"
          :style="{ width: cleanedPercent + '%' }"
          :class="{ winning: cleanedPercent >= WIN_PERCENT }"
        ></div>
      </div>
      <span class="progress-text">{{ cleanedPercent }}%</span>
    </div>

    <!-- Hint -->
    <div class="hint" v-if="active && cleanedSafe === 0 && !hitMine">
      Limpia sin tocar las 💣
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
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(28, 1fr);
  z-index: 1;
}

.dirt-cell {
  background: #6d4c41;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  transition: opacity 0.15s ease-out;
  position: relative;
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

.dirt-cell.mine {
  background: #5d4037;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mine-icon {
  font-size: 12px;
  line-height: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.4));
}

.dirt-cell.cleaned {
  opacity: 0;
  pointer-events: none;
}

/* --- SPONGE --- */
.sponge {
  position: absolute;
  font-size: 36px;
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

/* --- MINE HIT --- */
.mine-flash {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(40, 40, 40, 0.7);
  animation: flash-in 0.3s ease;
}

.mine-boom {
  font-size: 72px;
  animation: boom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mine-text {
  color: #ff7043;
  font-size: 22px;
  font-weight: 700;
  margin-top: 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

@keyframes flash-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes boom {
  0% { transform: scale(0) rotate(-30deg); }
  60% { transform: scale(1.3) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); }
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
  color: rgba(255, 255, 255, 0.9);
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
