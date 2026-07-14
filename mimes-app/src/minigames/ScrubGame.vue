<script setup lang="ts">
/**
 * ScrubGame.vue — Mini-juego avanzado de limpieza ("campo minado")
 *
 * Mecanica: la pantalla esta cubierta por un grid fino de suciedad con
 * minas repartidas. El jugador arrastra la esponja para limpiar celdas.
 * Si la esponja toca una mina, pierde. Gana al limpiar WIN_PERCENT de
 * las celdas seguras antes de que acabe el tiempo del shell.
 *
 * Detalles de implementacion:
 * - Pointer Events unificados (raton + tactil) con captura de puntero.
 * - El trazo se interpola entre eventos consecutivos: un deslizamiento
 *   rapido no puede "saltar" por encima de una mina ni dejar huecos.
 * - La generacion garantiza distancia minima entre minas y una zona de
 *   inicio segura, para que el nivel siempre sea navegable.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION DEL NIVEL ---
const COLS = 20
const ROWS = 28
const TOTAL_CELLS = COLS * ROWS
/** Numero de minas repartidas por el grid */
const MINE_COUNT = 25
/** Distancia minima entre minas (en celdas) — garantiza pasillos navegables */
const MIN_MINE_DIST = 3.5
/** Radio sin minas alrededor de la esquina superior izquierda (zona de inicio) */
const SAFE_START_RADIUS = 3
/** Porcentaje de celdas seguras que hay que limpiar para ganar */
const WIN_PERCENT = 85
/** Radio de limpieza de la esponja (en celdas) */
const SPONGE_RADIUS = 1.2
/** Paso de interpolacion del trazo (en celdas) — menor que SPONGE_RADIUS */
const STROKE_STEP = 0.5
/** Pausa para mostrar el feedback de explosion/victoria antes de cerrar */
const FEEDBACK_DELAY_MS = 900

// --- ESTADO DEL NIVEL ---
interface Cell {
  mine: boolean
  cleaned: boolean
  /** Variacion visual de la suciedad (0-3), fijada al generar el nivel */
  shade: number
}

const cells = ref<Cell[]>([])
const cleanedCount = ref(0)
const safeCellCount = ref(TOTAL_CELLS)

// --- ESTADO DE LA PARTIDA ---
type Outcome = 'playing' | 'won' | 'exploded'
const outcome = ref<Outcome>('playing')
/** Indice de la mina pisada, para resaltarla al explotar */
const explodedIndex = ref<number | null>(null)

// --- ESTADO DE LA ESPONJA ---
const containerRef = ref<HTMLElement | null>(null)
const spongeX = ref(50)
const spongeY = ref(50)
const scrubbing = ref(false)
/** Ultima posicion del puntero en coordenadas de celda, para interpolar */
let lastCellPos: { col: number; row: number } | null = null

let feedbackTimer: ReturnType<typeof setTimeout> | null = null

// --- COMPUTED ---
const cleanedPercent = computed(() =>
  safeCellCount.value > 0
    ? Math.round((cleanedCount.value / safeCellCount.value) * 100)
    : 0,
)
const showHint = computed(
  () => props.active && cleanedCount.value === 0 && outcome.value === 'playing',
)

// --- GENERACION DEL NIVEL ---

function generateLevel() {
  const next: Cell[] = Array.from({ length: TOTAL_CELLS }, () => ({
    mine: false,
    cleaned: false,
    shade: Math.floor(Math.random() * 4),
  }))

  const mines: Array<{ col: number; row: number }> = []
  let attempts = 0

  while (mines.length < MINE_COUNT && attempts < 2000) {
    attempts++
    const col = Math.floor(Math.random() * COLS)
    const row = Math.floor(Math.random() * ROWS)

    // Zona de inicio segura: sin minas cerca de la esquina superior izquierda
    if (Math.hypot(col, row) < SAFE_START_RADIUS + MIN_MINE_DIST) continue

    // Distancia minima respecto al resto de minas
    const tooClose = mines.some(
      m => Math.hypot(col - m.col, row - m.row) < MIN_MINE_DIST,
    )
    if (tooClose) continue

    next[row * COLS + col]!.mine = true
    mines.push({ col, row })
  }

  cells.value = next
  cleanedCount.value = 0
  safeCellCount.value = TOTAL_CELLS - mines.length
}

// --- LOGICA DE LIMPIEZA ---

/**
 * Limpia las celdas dentro del radio de la esponja centrado en (col, row).
 * Devuelve el indice de la mina tocada, o null si la pasada fue segura.
 */
function scrubAt(col: number, row: number): number | null {
  const minC = Math.max(0, Math.floor(col - SPONGE_RADIUS - 1))
  const maxC = Math.min(COLS - 1, Math.ceil(col + SPONGE_RADIUS))
  const minR = Math.max(0, Math.floor(row - SPONGE_RADIUS - 1))
  const maxR = Math.min(ROWS - 1, Math.ceil(row + SPONGE_RADIUS))
  const r2 = SPONGE_RADIUS * SPONGE_RADIUS

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const dx = c + 0.5 - col
      const dy = r + 0.5 - row
      if (dx * dx + dy * dy > r2) continue

      const idx = r * COLS + c
      const cell = cells.value[idx]!
      if (cell.mine) return idx
      if (!cell.cleaned) {
        cell.cleaned = true
        cleanedCount.value++
      }
    }
  }
  return null
}

/**
 * Aplica el trazo desde la ultima posicion conocida hasta (col, row),
 * muestreando cada STROKE_STEP celdas para no atravesar minas en
 * movimientos rapidos.
 */
function applyStroke(col: number, row: number) {
  const from = lastCellPos ?? { col, row }
  const dist = Math.hypot(col - from.col, row - from.row)
  const steps = Math.max(1, Math.ceil(dist / STROKE_STEP))

  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const sc = from.col + (col - from.col) * t
    const sr = from.row + (row - from.row) * t
    const mineIdx = scrubAt(sc, sr)
    if (mineIdx !== null) {
      explode(mineIdx)
      return
    }
  }

  lastCellPos = { col, row }
  if (cleanedPercent.value >= WIN_PERCENT) win()
}

function explode(mineIndex: number) {
  if (outcome.value !== 'playing') return
  outcome.value = 'exploded'
  explodedIndex.value = mineIndex
  scrubbing.value = false
  feedbackTimer = setTimeout(() => props.onComplete(false), FEEDBACK_DELAY_MS)
}

function win() {
  if (outcome.value !== 'playing') return
  outcome.value = 'won'
  scrubbing.value = false
  feedbackTimer = setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS * 0.7)
}

// --- ENTRADA (Pointer Events) ---

/** Convierte un evento de puntero a coordenadas de celda y de pantalla (%) */
function toGameCoords(e: PointerEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0 || rect.height === 0) return null
  const px = ((e.clientX - rect.left) / rect.width) * 100
  const py = ((e.clientY - rect.top) / rect.height) * 100
  return {
    px,
    py,
    col: (px / 100) * COLS,
    row: (py / 100) * ROWS,
  }
}

function onPointerDown(e: PointerEvent) {
  if (!props.active || outcome.value !== 'playing') return
  const pos = toGameCoords(e)
  if (!pos) return

  containerRef.value?.setPointerCapture(e.pointerId)
  scrubbing.value = true
  lastCellPos = null
  spongeX.value = pos.px
  spongeY.value = pos.py
  applyStroke(pos.col, pos.row)
}

function onPointerMove(e: PointerEvent) {
  if (!scrubbing.value || !props.active || outcome.value !== 'playing') return
  const pos = toGameCoords(e)
  if (!pos) return

  spongeX.value = pos.px
  spongeY.value = pos.py
  applyStroke(pos.col, pos.row)
}

function onPointerUp() {
  scrubbing.value = false
  lastCellPos = null
}

// --- CICLO DE VIDA ---

watch(
  () => props.active,
  active => {
    if (active) {
      generateLevel()
      outcome.value = 'playing'
      explodedIndex.value = null
      scrubbing.value = false
      lastCellPos = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
})
</script>

<template>
  <div
    ref="containerRef"
    class="scrub-game"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- Fondo limpio, visible donde se retira la suciedad -->
    <div class="clean-bg" aria-hidden="true"></div>

    <!-- Grid de suciedad + minas -->
    <div class="dirt-grid">
      <div
        v-for="(cell, idx) in cells"
        :key="idx"
        class="dirt-cell"
        :class="[
          `shade-${cell.shade}`,
          {
            cleaned: cell.cleaned,
            mine: cell.mine,
            revealed: cell.mine && outcome === 'exploded',
            detonated: idx === explodedIndex,
          },
        ]"
      >
        <span v-if="cell.mine" class="mine-icon">💣</span>
      </div>
    </div>

    <!-- Esponja -->
    <div
      v-if="scrubbing && outcome === 'playing'"
      class="sponge"
      :style="{ left: spongeX + '%', top: spongeY + '%' }"
    >
      🧽
    </div>

    <!-- HUD de progreso -->
    <div v-if="active && outcome !== 'exploded'" class="hud">
      <div class="hud-bar">
        <div
          class="hud-fill"
          :class="{ winning: cleanedPercent >= WIN_PERCENT }"
          :style="{ width: cleanedPercent + '%' }"
        ></div>
        <span class="hud-goal" :style="{ left: WIN_PERCENT + '%' }"></span>
      </div>
      <span class="hud-text">{{ cleanedPercent }}%</span>
    </div>

    <!-- Pista inicial -->
    <div v-if="showHint" class="hint">Limpia sin tocar las 💣</div>

    <!-- Explosion -->
    <div v-if="outcome === 'exploded'" class="overlay overlay-lose">
      <span class="overlay-icon">💥</span>
      <span class="overlay-text">Pisaste una mina!</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">✨</span>
      <span class="overlay-text">Reluciente!</span>
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
}

/* === GRID DE SUCIEDAD === */
.dirt-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(28, 1fr);
}

.dirt-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.18s ease-out;
}

.shade-0 { background: #6d4c41; }
.shade-1 { background: #5d4037; }
.shade-2 { background: #4e342e; }
.shade-3 { background: #795548; }

.dirt-cell.cleaned {
  opacity: 0;
  pointer-events: none;
}

.mine-icon {
  font-size: 11px;
  line-height: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

/* Al explotar, se revelan todas las minas y se marca la detonada */
.dirt-cell.revealed {
  background: #b71c1c;
  animation: mine-reveal 0.4s ease both;
}

.dirt-cell.detonated {
  background: #ff6f00;
  box-shadow: 0 0 18px 6px rgba(255, 111, 0, 0.8);
  z-index: 2;
}

@keyframes mine-reveal {
  from { filter: brightness(0.6); }
  to { filter: brightness(1); }
}

/* === ESPONJA === */
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
  from { transform: translate(-50%, -50%) rotate(-6deg); }
  to { transform: translate(-50%, -50%) rotate(6deg); }
}

/* === HUD === */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.55);
  padding: 6px 14px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.hud-bar {
  position: relative;
  width: 130px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.hud-fill {
  height: 100%;
  background: #ffd54f;
  border-radius: 4px;
  transition: width 0.15s ease-out;
}

.hud-fill.winning {
  background: #66bb6a;
}

/* Marca del objetivo (85%) sobre la barra */
.hud-goal {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 1px;
}

.hud-text {
  color: white;
  font-size: 14px;
  font-weight: 700;
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* === PISTA === */
.hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.95);
  font-size: 18px;
  font-weight: 700;
  z-index: 15;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  animation: hint-pulse 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* === OVERLAYS DE RESULTADO === */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: overlay-in 0.25s ease;
  pointer-events: none;
}

.overlay-lose { background: rgba(30, 20, 20, 0.65); }
.overlay-win { background: rgba(255, 255, 255, 0.25); }

.overlay-icon {
  font-size: 72px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.overlay-lose .overlay-text { color: #ff8a65; }
.overlay-win .overlay-text { color: #2e7d32; text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8); }

@keyframes overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes overlay-pop {
  0% { transform: scale(0) rotate(-25deg); }
  60% { transform: scale(1.25) rotate(8deg); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
