<script setup lang="ts">
/**
 * FindClothesGame.vue — Mini-juego fácil de vestir
 *
 * Mecánica: "Encuentra la prenda". Arriba se muestra una prenda
 * objetivo. En un grid 3x3 hay exactamente 3 copias del objetivo
 * y 6 distractoras. Tocar las 3 iguales = victoria.
 * Tocar una distractora = derrota inmediata.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const POOL = ['👕', '👖', '🧢', '👗', '🧣', '👟']
const NEED = 3 // copias del objetivo a encontrar
const GRID_SIZE = 9 // celdas del grid
const END_DELAY = 700 // retardo antes de onComplete

interface Cell {
  id: number
  emoji: string
  correct: boolean
  found: boolean // acierto marcado
  wrong: boolean // fallo marcado
}

// --- ESTADO ---
const target = ref('👕')
const cells = ref<Cell[]>([])
const found = ref(0)
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')

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

// Resetea todo el estado y genera el grid barajado
function start() {
  clearTimeout(endTimeout)
  done.value = false
  found.value = 0
  result.value = 'none'

  const pool = shuffle([...POOL])
  target.value = pool[0] ?? '👕'
  const others = pool.slice(1)

  // 3 copias del objetivo + 6 distractoras (pueden repetirse entre sí)
  const emojis: string[] = []
  for (let i = 0; i < NEED; i++) emojis.push(target.value)
  for (let i = NEED; i < GRID_SIZE; i++) {
    emojis.push(others[Math.floor(Math.random() * others.length)] ?? '🧤')
  }

  cells.value = shuffle(emojis).map((emoji, i) => ({
    id: i,
    emoji,
    correct: emoji === target.value,
    found: false,
    wrong: false,
  }))
}

// Tap sobre una celda del grid
function tapCell(id: number) {
  if (!props.active || done.value) return
  const cell = cells.value.find(c => c.id === id)
  if (!cell || cell.found || cell.wrong) return

  if (cell.correct) {
    cell.found = true
    found.value++
    if (found.value >= NEED) finish(true)
  } else {
    cell.wrong = true
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
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="find-game">
    <!-- HUD + prenda objetivo -->
    <div class="hud" v-if="active">{{ found }}/{{ NEED }}</div>
    <div class="target-panel" v-if="active">
      <span class="target-label">Encuentra</span>
      <span class="target-emoji">{{ target }}</span>
    </div>

    <!-- Grid 3x3 de prendas -->
    <div class="grid">
      <div
        v-for="cell in cells"
        :key="cell.id"
        class="cell"
        :class="{ found: cell.found, wrong: cell.wrong }"
        @touchstart.prevent="tapCell(cell.id)"
        @mousedown="tapCell(cell.id)"
      >
        <span class="cell-emoji">{{ cell.emoji }}</span>
        <span v-if="cell.found" class="cell-check">✓</span>
      </div>
    </div>

    <!-- Overlays de resultado -->
    <div v-if="result === 'win'" class="overlay win">
      <span class="overlay-emoji">👕✨</span>
      <span class="overlay-text">Prendas encontradas!</span>
    </div>
    <div v-if="result === 'lose'" class="overlay lose">
      <span class="overlay-emoji">🙈</span>
      <span class="overlay-text">Esa no era!</span>
    </div>
  </div>
</template>

<style scoped>
.find-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* Fondo indigo boutique */
  background: linear-gradient(180deg, #283593 0%, #3949ab 55%, #5c6bc0 100%);
  touch-action: manipulation;
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

/* --- PRENDA OBJETIVO --- */
.target-panel {
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.35);
  padding: 6px 18px;
  border-radius: 20px;
  z-index: 5;
}

.target-label {
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.target-emoji {
  font-size: 44px;
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  animation: target-pop 0.4s ease-out;
}

@keyframes target-pop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* --- GRID 3x3 --- */
.grid {
  position: absolute;
  top: 56%;
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

.cell.found {
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
