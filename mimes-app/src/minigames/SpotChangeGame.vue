<script setup lang="ts">
/**
 * SpotChangeGame.vue — Mini-juego avanzado de vestir
 *
 * Mecánica: "Que ha cambiado?". Se muestran 4 prendas durante 2.5s,
 * un parpadeo rápido a negro (~300ms) y reaparecen las 4 pero una
 * ha sido sustituida por otra prenda (misma posición).
 * Tocar la cambiada = acierto; tocar otra = derrota inmediata.
 * 3 rondas acertadas = victoria.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const POOL = ['👕', '👖', '🧢', '👗', '🧣', '👟', '🎩', '🧤', '🕶️', '👔']
const ROW_SIZE = 4 // prendas en la fila
const ROUNDS_TO_WIN = 3 // rondas para ganar
const MEMO_MS = 2500 // tiempo de memorización
const BLINK_MS = 300 // duración del parpadeo a negro
const END_DELAY = 700 // retardo antes de onComplete

interface Slot {
  id: number
  emoji: string
  wrong: boolean // fallo marcado
  picked: boolean // acierto marcado
}

// --- ESTADO ---
const phase = ref<'memoriza' | 'blink' | 'elige'>('memoriza')
const row = ref<Slot[]>([])
const changedIndex = ref(0) // posición de la prenda sustituida
const roundNum = ref(1)
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')
const roundKey = ref(0) // fuerza remontaje de la barra de tiempo

let memoTimeout = 0
let blinkTimeout = 0
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

// Prepara una ronda: fila original, memorización, parpadeo y cambio
function setupRound() {
  clearTimeout(memoTimeout)
  clearTimeout(blinkTimeout)
  roundKey.value++

  const pool = shuffle([...POOL])
  // 4 prendas sin repetir + una sustituta que no está en la fila
  const original = pool.slice(0, ROW_SIZE)
  const replacement = pool[ROW_SIZE]!
  changedIndex.value = Math.floor(Math.random() * ROW_SIZE)

  row.value = original.map((emoji, i) => ({
    id: i,
    emoji,
    wrong: false,
    picked: false,
  }))

  phase.value = 'memoriza'
  memoTimeout = window.setTimeout(() => {
    phase.value = 'blink'
    blinkTimeout = window.setTimeout(() => {
      // Se aplica el cambio mientras la pantalla está en negro
      const slot = row.value[changedIndex.value]
      if (slot) slot.emoji = replacement
      phase.value = 'elige'
    }, BLINK_MS)
  }, MEMO_MS)
}

// Resetea todo el estado y arranca la primera ronda
function start() {
  clearTimeout(endTimeout)
  done.value = false
  result.value = 'none'
  roundNum.value = 1
  setupRound()
}

// Tap sobre una prenda de la fila
function tapSlot(id: number) {
  if (!props.active || done.value || phase.value !== 'elige') return
  const slot = row.value.find(s => s.id === id)
  if (!slot || slot.picked || slot.wrong) return

  if (slot.id === changedIndex.value) {
    slot.picked = true
    if (roundNum.value >= ROUNDS_TO_WIN) {
      finish(true)
    } else {
      roundNum.value++
      setupRound()
    }
  } else {
    slot.wrong = true
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
  clearTimeout(blinkTimeout)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="spot-game">
    <div class="hud" v-if="active">Ronda {{ roundNum }}/{{ ROUNDS_TO_WIN }}</div>

    <!-- Texto de fase -->
    <div class="phase-label">
      <template v-if="phase === 'memoriza'">Memoriza...</template>
      <template v-else-if="phase === 'elige'">Que ha cambiado?</template>
    </div>

    <!-- Fila de prendas -->
    <div class="row">
      <div
        v-for="slot in row"
        :key="roundKey + '-' + slot.id"
        class="slot"
        :class="{ picked: slot.picked, wrong: slot.wrong, locked: phase !== 'elige' }"
        @touchstart.prevent="tapSlot(slot.id)"
        @mousedown="tapSlot(slot.id)"
      >
        <span class="slot-emoji">{{ slot.emoji }}</span>
        <span v-if="slot.picked" class="slot-check">✓</span>
      </div>
    </div>

    <!-- Mini-barra de tiempo de memorización -->
    <div v-if="phase === 'memoriza'" class="memo-bar" :key="'bar-' + roundKey">
      <div class="memo-bar-fill"></div>
    </div>

    <!-- Parpadeo a negro entre fases -->
    <div v-if="phase === 'blink'" class="blink"></div>

    <!-- Overlays de resultado -->
    <div v-if="result === 'win'" class="overlay win">
      <span class="overlay-emoji">🕵️</span>
      <span class="overlay-text">Nada se te escapa!</span>
    </div>
    <div v-if="result === 'lose'" class="overlay lose">
      <span class="overlay-emoji">🧐</span>
      <span class="overlay-text">Esa era la misma!</span>
    </div>
  </div>
</template>

<style scoped>
.spot-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #004d40 0%, #00695c 55%, #00796b 100%);
  touch-action: manipulation;
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
  white-space: nowrap;
}

/* --- TEXTO DE FASE --- */
.phase-label {
  position: absolute;
  top: 26%;
  left: 0;
  right: 0;
  text-align: center;
  color: #ffd54f;
  font-size: 19px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  min-height: 24px;
}

/* --- FILA DE PRENDAS --- */
.row {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 12px;
}

.slot {
  position: relative;
  width: 72px;
  height: 72px;
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
  animation: slot-in 0.3s ease-out;
}

@keyframes slot-in {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.slot.locked { cursor: default; }

.slot-emoji {
  font-size: 38px;
  line-height: 1;
}

.slot.picked {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.18);
  transform: scale(1.08);
  pointer-events: none;
}

.slot-check {
  position: absolute;
  top: 4px;
  right: 6px;
  color: #4caf50;
  font-size: 16px;
  font-weight: 700;
}

.slot.wrong {
  border-color: #e53935;
  background: rgba(229, 57, 53, 0.25);
  animation: slot-shake 0.4s ease-in-out;
  pointer-events: none;
}

@keyframes slot-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-5px); }
}

/* --- BARRA DE MEMORIZACIÓN --- */
.memo-bar {
  position: absolute;
  top: 62%;
  left: 50%;
  transform: translateX(-50%);
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

/* --- PARPADEO --- */
.blink {
  position: absolute;
  inset: 0;
  background: #000;
  z-index: 10;
  animation: blink-fade 0.3s ease-in-out;
}

@keyframes blink-fade {
  0% { opacity: 0; }
  30% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; }
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
