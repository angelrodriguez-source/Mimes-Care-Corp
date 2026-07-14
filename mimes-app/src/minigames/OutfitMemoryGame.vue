<script setup lang="ts">
/**
 * OutfitMemoryGame.vue — Mini-juego avanzado de vestir
 *
 * Mecánica: memoria visual de conjuntos de ropa.
 * Fase 1 "memoriza": se muestran 3 prendas durante 2.5s.
 * Fase 2 "elige": grid 3x3 con las 3 correctas + 6 distractoras.
 * Tocar las 3 correctas (en cualquier orden) = victoria.
 * Tocar una incorrecta = derrota inmediata.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const POOL = ['👕', '👖', '🧢', '👗', '🧣', '🧤', '👟', '🎩', '🕶️', '👔']
const TARGET_COUNT = 3 // prendas a memorizar
const GRID_SIZE = 9 // celdas del grid (3 correctas + 6 distractoras)
const MEMO_MS = 2500 // tiempo de memorización
const END_DELAY = 700 // retardo antes de onComplete

interface GridItem {
  id: number
  emoji: string
  correct: boolean
  picked: boolean // acierto marcado
  wrong: boolean // fallo marcado
}

// --- ESTADO ---
const phase = ref<'memoriza' | 'elige'>('memoriza')
const targets = ref<string[]>([])
const grid = ref<GridItem[]>([])
const found = ref(0)
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')
const round = ref(0) // fuerza remontaje de la barra de cuenta atrás

let memoTimeout = 0
let endTimeout = 0

// Baraja in-place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

// Resetea estado, elige el conjunto objetivo y precomputa el grid barajado
function start() {
  clearTimeout(memoTimeout)
  clearTimeout(endTimeout)
  done.value = false
  found.value = 0
  result.value = 'none'
  round.value++

  const pool = shuffle([...POOL])
  targets.value = pool.slice(0, TARGET_COUNT)
  const distractors = pool.slice(TARGET_COUNT, GRID_SIZE)

  grid.value = shuffle(
    [...targets.value, ...distractors].map((emoji, i) => ({
      id: i,
      emoji,
      correct: targets.value.includes(emoji),
      picked: false,
      wrong: false,
    }))
  )

  phase.value = 'memoriza'
  memoTimeout = window.setTimeout(() => {
    phase.value = 'elige'
  }, MEMO_MS)
}

// Tap sobre una prenda del grid
function tapItem(id: number) {
  if (!props.active || done.value || phase.value === 'memoriza') return
  const item = grid.value.find(i => i.id === id)
  if (!item || item.picked || item.wrong) return

  if (item.correct) {
    item.picked = true
    found.value++
    if (found.value >= TARGET_COUNT) finish(true)
  } else {
    item.wrong = true
    finish(false)
  }
}

// Muestra overlay y notifica al shell tras un breve retardo
function finish(success: boolean) {
  done.value = true
  result.value = success ? 'win' : 'lose'
  endTimeout = window.setTimeout(() => {
    props.onComplete(success)
  }, END_DELAY)
}

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true }
)

onUnmounted(() => {
  clearTimeout(memoTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="outfit-game">
    <!-- Fase 1: memorizar el conjunto -->
    <div v-if="phase === 'memoriza'" class="memo-panel">
      <div class="memo-title">Memoriza el conjunto!</div>
      <div class="memo-row">
        <span v-for="(t, i) in targets" :key="'t-' + i" class="memo-item">{{ t }}</span>
      </div>
      <!-- Mini-barra de cuenta atrás (remonta en cada ronda) -->
      <div class="memo-bar" :key="'bar-' + round">
        <div class="memo-bar-fill"></div>
      </div>
    </div>

    <!-- Fase 2: elegir en el grid -->
    <template v-else>
      <div class="hud" v-if="active">{{ found }}/{{ TARGET_COUNT }}</div>

      <div class="grid">
        <div
          v-for="item in grid"
          :key="item.id"
          class="cell"
          :class="{ picked: item.picked, wrong: item.wrong }"
          @touchstart.prevent="tapItem(item.id)"
          @mousedown="tapItem(item.id)"
        >
          <span class="cell-emoji">{{ item.emoji }}</span>
          <span v-if="item.picked" class="cell-check">✓</span>
        </div>
      </div>
    </template>

    <!-- Overlays de resultado -->
    <div v-if="result === 'win'" class="overlay win">
      <span class="overlay-emoji">👗✨</span>
      <span class="overlay-text">Conjunto perfecto!</span>
    </div>
    <div v-if="result === 'lose'" class="overlay lose">
      <span class="overlay-emoji">🙈</span>
      <span class="overlay-text">Esa no era!</span>
    </div>
  </div>
</template>

<style scoped>
.outfit-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #1a237e 0%, #283593 55%, #303f9f 100%);
  touch-action: manipulation;
}

/* --- FASE MEMORIZA --- */
.memo-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.memo-title {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.memo-row {
  display: flex;
  gap: 20px;
}

.memo-item {
  font-size: 56px;
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  animation: memo-pop 0.4s ease-out;
}

@keyframes memo-pop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.memo-bar {
  width: 160px;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.memo-bar-fill {
  height: 100%;
  background: #ffd54f;
  border-radius: 4px;
  animation: memo-countdown 2.5s linear forwards;
}

@keyframes memo-countdown {
  from { width: 100%; }
  to { width: 0%; }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

/* --- GRID 3x3 --- */
.grid {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: min(78%, 320px);
}

.cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.15s, border-color 0.15s;
}

.cell-emoji {
  font-size: 38px;
  line-height: 1;
}

.cell.picked {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.18);
  transform: scale(1.08);
  pointer-events: none;
}

.cell-check {
  position: absolute;
  top: 4px;
  right: 6px;
  color: #4caf50;
  font-size: 16px;
  font-weight: 700;
}

.cell.wrong {
  border-color: #e53935;
  background: rgba(229, 57, 53, 0.25);
  animation: cell-shake 0.4s ease-in-out;
  pointer-events: none;
}

@keyframes cell-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-5px); }
}

/* --- OVERLAYS --- */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.45);
  z-index: 20;
  animation: overlay-in 0.3s ease-out;
}

.overlay-emoji { font-size: 64px; line-height: 1; }

.overlay-text {
  color: white;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.overlay.win .overlay-text { color: #ffd54f; }

@keyframes overlay-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
