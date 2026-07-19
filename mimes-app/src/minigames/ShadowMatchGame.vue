<script setup lang="ts">
/**
 * ShadowMatchGame.vue — Mini-juego fácil de vestir
 *
 * Mecánica: "Sombras". Arriba se muestra una prenda en sombra
 * (silueta negra). Debajo, 3 opciones normales: tocar la que
 * coincide suma ronda y rebaraja; tocar otra = derrota inmediata.
 * 4 rondas acertadas = victoria.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const POOL = ['👕', '👖', '🧢', '👗', '🧣', '👟', '🎩', '🧤']
const OPTION_COUNT = 3 // opciones por ronda
const ROUNDS_TO_WIN = 4 // rondas para ganar
const END_DELAY = 700 // retardo antes de onComplete

interface Option {
  id: number
  emoji: string
  wrong: boolean // fallo marcado
}

// --- ESTADO ---
const target = ref('') // prenda mostrada en sombra
const options = ref<Option[]>([])
const score = ref(0)
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')
const roundKey = ref(0) // fuerza reanimación de la sombra en cada ronda

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

// Prepara una ronda: nueva sombra + 3 opciones barajadas
function nextRound() {
  const pool = shuffle([...POOL])
  target.value = pool[0]!
  options.value = shuffle(pool.slice(0, OPTION_COUNT)).map((emoji, i) => ({
    id: i,
    emoji,
    wrong: false,
  }))
  roundKey.value++
}

// Resetea todo el estado y arranca la primera ronda
function start() {
  clearTimeout(endTimeout)
  done.value = false
  score.value = 0
  result.value = 'none'
  nextRound()
}

// Tap sobre una opción
function tapOption(id: number) {
  if (!props.active || done.value) return
  const opt = options.value.find(o => o.id === id)
  if (!opt) return

  if (opt.emoji === target.value) {
    score.value++
    if (score.value >= ROUNDS_TO_WIN) {
      finish(true)
    } else {
      nextRound()
    }
  } else {
    opt.wrong = true
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
  <div class="shadow-game">
    <div class="hud" v-if="active">{{ score }}/{{ ROUNDS_TO_WIN }}</div>

    <!-- Prenda en sombra a adivinar -->
    <div class="shadow-panel">
      <div class="shadow-title">Que prenda es?</div>
      <span class="shadow-item" :key="'s-' + roundKey">{{ target }}</span>
    </div>

    <!-- Opciones normales -->
    <div class="options">
      <div
        v-for="opt in options"
        :key="roundKey + '-' + opt.id"
        class="option"
        :class="{ wrong: opt.wrong }"
        @touchstart.prevent="tapOption(opt.id)"
        @mousedown="tapOption(opt.id)"
      >
        <span class="option-emoji">{{ opt.emoji }}</span>
      </div>
    </div>

    <!-- Overlays de resultado -->
    <div v-if="result === 'win'" class="overlay win">
      <span class="overlay-emoji">👗✨</span>
      <span class="overlay-text">Ojo de estilista!</span>
    </div>
    <div v-if="result === 'lose'" class="overlay lose">
      <span class="overlay-emoji">🙈</span>
      <span class="overlay-text">Esa no era!</span>
    </div>
  </div>
</template>

<style scoped>
.shadow-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #4a148c 0%, #6a1b9a 55%, #7b1fa2 100%);
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
}

/* --- PANEL DE SOMBRA --- */
.shadow-panel {
  position: absolute;
  top: 14%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.shadow-title {
  color: #ffd54f;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Silueta: emoji ennegrecido */
.shadow-item {
  font-size: 88px;
  line-height: 1;
  filter: brightness(0);
  opacity: 0.85;
  animation: shadow-pop 0.35s ease-out;
}

@keyframes shadow-pop {
  0% { transform: scale(0.3); opacity: 0; }
  100% { transform: scale(1); opacity: 0.85; }
}

/* --- OPCIONES --- */
.options {
  position: absolute;
  bottom: 16%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
}

.option {
  width: 84px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 0.15s, border-color 0.15s;
  animation: option-in 0.3s ease-out;
}

@keyframes option-in {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.option-emoji {
  font-size: 44px;
  line-height: 1;
}

.option.wrong {
  border-color: #e53935;
  background: rgba(229, 57, 53, 0.25);
  animation: option-shake 0.4s ease-in-out;
  pointer-events: none;
}

@keyframes option-shake {
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
