<script setup lang="ts">
/**
 * ScrubGame.vue — Mini-juego avanzado de limpieza
 *
 * Mecanica: la pantalla esta cubierta de suciedad (grid de celdas).
 * Algunas celdas son toxicas (rojas) — si las tocas, pierdes.
 * El jugador debe limpiar el 90%+ de las celdas seguras sin
 * tocar ninguna toxica. Hay que pensar el recorrido.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

const COLS = 10
const ROWS = 14
const TOTAL_CELLS = COLS * ROWS
const TOXIC_PERCENT = 15
const WIN_PERCENT = 90
const SPONGE_RADIUS = 1.5

type CellType = 'dirt' | 'toxic'

const containerRef = ref<HTMLElement | null>(null)
const cellTypes = ref<CellType[]>([])
const cleaned = ref<boolean[]>([])
const spongeX = ref(50)
const spongeY = ref(50)
const spongeVisible = ref(false)
const done = ref(false)
const hitToxic = ref(false)

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
  const toxicCount = Math.round(TOTAL_CELLS * TOXIC_PERCENT / 100)

  // Place toxic cells avoiding clusters too tight
  let placed = 0
  const maxAttempts = toxicCount * 20
  let attempts = 0
  while (placed < toxicCount && attempts < maxAttempts) {
    attempts++
    const idx = Math.floor(Math.random() * TOTAL_CELLS)
    if (types[idx] === 'toxic') continue

    // Check neighbors — don't place toxic next to another toxic too often
    const col = idx % COLS
    const row = Math.floor(idx / COLS)
    let toxicNeighbors = 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          if (types[nr * COLS + nc] === 'toxic') toxicNeighbors++
        }
      }
    }
    // Allow max 1 toxic neighbor to avoid impossible-to-navigate clusters
    if (toxicNeighbors > 1) continue

    types[idx] = 'toxic'
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
      if (cellTypes.value[idx] === 'toxic') {
        // Hit toxic — lose!
        if (!done.value) {
          done.value = true
          hitToxic.value = true
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
    hitToxic.value = false
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
        v-for="(type, idx) in cellTypes"
        :key="idx"
        class="dirt-cell"
        :class="{
          cleaned: cleaned[idx],
          toxic: type === 'toxic',
        }"
      ></div>
    </div>

    <!-- Sponge cursor -->
    <div
      v-if="spongeVisible && !done"
      class="sponge"
      :style="{ left: spongeX + '%', top: spongeY + '%' }"
    >
      🧽
    </div>

    <!-- Hit toxic feedback -->
    <div v-if="hitToxic" class="toxic-flash">
      <span class="toxic-icon">☠️</span>
      <span class="toxic-text">Tocaste toxico!</span>
    </div>

    <!-- Progress display -->
    <div class="progress-display" v-if="active && !hitToxic">
      <div class="progress-bar-bg">
        <div
          class="progress-bar-fill"
          :style="{ width: cleanedPercent + '%' }"
          :class="{ winning: cleanedPercent >= WIN_PERCENT }"
        ></div>
      </div>
      <span class="progress-text">{{ cleanedPercent }}%</span>
    </div>

    <!-- Legend -->
    <div class="legend" v-if="active && cleanedSafe === 0 && !hitToxic">
      <div class="legend-item">
        <span class="legend-swatch dirt-swatch"></span>
        <span>Limpia esto</span>
      </div>
      <div class="legend-item">
        <span class="legend-swatch toxic-swatch"></span>
        <span>No tocar!</span>
      </div>
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
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  transition: opacity 0.2s ease-out;
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

.dirt-cell.toxic {
  background: #c62828 !important;
  border-color: rgba(198, 40, 40, 0.3);
  box-shadow: inset 0 0 8px rgba(255, 0, 0, 0.3);
  animation: toxic-pulse 1.5s ease-in-out infinite;
}

.dirt-cell.cleaned {
  opacity: 0;
  pointer-events: none;
}

@keyframes toxic-pulse {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; }
}

/* --- SPONGE --- */
.sponge {
  position: absolute;
  font-size: 44px;
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

/* --- TOXIC HIT --- */
.toxic-flash {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(198, 40, 40, 0.6);
  animation: flash-in 0.3s ease;
}

.toxic-icon {
  font-size: 64px;
  animation: shake 0.4s ease;
}

.toxic-text {
  color: white;
  font-size: 22px;
  font-weight: 700;
  margin-top: 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

@keyframes flash-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
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

/* --- LEGEND --- */
.legend {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 16px;
  backdrop-filter: blur(4px);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.dirt-swatch {
  background: #6d4c41;
}

.toxic-swatch {
  background: #c62828;
  box-shadow: 0 0 4px rgba(255, 0, 0, 0.5);
}
</style>
