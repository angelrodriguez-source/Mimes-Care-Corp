<script setup lang="ts">
/**
 * TrashSortGame.vue — Mini-juego facil de limpieza ("A su cubo")
 *
 * Mecanica: en el centro aparece un objeto de uno en uno, organico o
 * reciclable. Abajo hay dos cubos grandes tocables. Si el jugador toca
 * el cubo correcto, el objeto vuela hacia el con una animacion y aparece
 * el siguiente. Si toca el equivocado, el objeto tiembla y sigue (no hay
 * derrota: solo se pierde tiempo). Gana al clasificar GOAL objetos.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Objetos clasificados necesarios para ganar */
const GOAL = 6
/** Duracion del vuelo del objeto hacia el cubo (ms) */
const FLY_MS = 450
/** Duracion del temblor tras un error (ms) */
const SHAKE_MS = 420
/** Pausa del overlay de victoria antes de cerrar (ms) */
const FEEDBACK_DELAY_MS = 700

type Categoria = 'organico' | 'reciclaje'

/** Emojis de cada categoria */
const OBJETOS: Record<Categoria, string[]> = {
  organico: ['🍌', '🍎', '🥕'],
  reciclaje: ['📦', '🥤', '📰'],
}

// --- ESTADO ---
const sorted = ref(0)
const currentEmoji = ref('')
const currentCat = ref<Categoria>('organico')
/** Estado visual del objeto: quieto, volando a un cubo o temblando */
const itemState = ref<'idle' | 'fly-organico' | 'fly-reciclaje' | 'shake'>('idle')
/** Cubo marcado en rojo tras un error */
const wrongBin = ref<Categoria | null>(null)
const won = ref(false)
/** Flag anti doble-onComplete */
let done = false

let timers: Array<ReturnType<typeof setTimeout>> = []

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

function clearTimers() {
  timers.forEach(t => clearTimeout(t))
  timers = []
}

// --- LOGICA ---

/** Genera el siguiente objeto (categoria y emoji al azar) */
function spawnItem() {
  const cat: Categoria = Math.random() < 0.5 ? 'organico' : 'reciclaje'
  const pool = OBJETOS[cat]
  currentCat.value = cat
  currentEmoji.value = pool[Math.floor(Math.random() * pool.length)]!
  itemState.value = 'idle'
}

/** El jugador toca un cubo */
function onBin(cat: Categoria) {
  if (!props.active || done || itemState.value !== 'idle') return

  if (cat === currentCat.value) {
    // Acierto: el objeto vuela hacia el cubo y llega el siguiente
    itemState.value = cat === 'organico' ? 'fly-organico' : 'fly-reciclaje'
    later(() => {
      sorted.value++
      if (sorted.value >= GOAL) {
        win()
      } else {
        spawnItem()
      }
    }, FLY_MS)
  } else {
    // Error: el objeto tiembla y el cubo se marca en rojo (sin derrota)
    itemState.value = 'shake'
    wrongBin.value = cat
    later(() => {
      itemState.value = 'idle'
      wrongBin.value = null
    }, SHAKE_MS)
  }
}

function win() {
  if (done) return
  done = true
  won.value = true
  later(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

/** Reset total al activarse */
function start() {
  clearTimers()
  done = false
  won.value = false
  sorted.value = 0
  wrongBin.value = null
  spawnItem()
}

// --- CICLO DE VIDA ---

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(() => {
  clearTimers()
})
</script>

<template>
  <div class="trash-sort-game">
    <!-- HUD de progreso -->
    <div class="hud">
      <span class="hud-text">{{ sorted }}/{{ GOAL }}</span>
    </div>

    <!-- Pista -->
    <div class="hint">Toca el cubo correcto</div>

    <!-- Objeto actual -->
    <div v-if="currentEmoji && !won" class="item" :class="itemState">
      {{ currentEmoji }}
    </div>

    <!-- Cubos -->
    <div class="bins">
      <button
        class="bin bin-organico"
        :class="{ wrong: wrongBin === 'organico' }"
        @touchstart.prevent="onBin('organico')"
        @mousedown="onBin('organico')"
      >
        <span class="bin-icon">🗑️</span>
        <span class="bin-label">ORGANICO</span>
      </button>
      <button
        class="bin bin-reciclaje"
        :class="{ wrong: wrongBin === 'reciclaje' }"
        @touchstart.prevent="onBin('reciclaje')"
        @mousedown="onBin('reciclaje')"
      >
        <span class="bin-icon">♻️</span>
        <span class="bin-label">RECICLAJE</span>
      </button>
    </div>

    <!-- Victoria -->
    <div v-if="won" class="overlay">
      <span class="overlay-icon">🌟</span>
      <span class="overlay-text">Todo en su sitio!</span>
    </div>
  </div>
</template>

<style scoped>
.trash-sort-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 60%, #a5d6a7 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* === HUD === */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  background: rgba(0, 0, 0, 0.55);
  padding: 6px 16px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.hud-text {
  color: #ffd54f;
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* === PISTA === */
.hint {
  position: absolute;
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  color: #33691e;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.75;
  pointer-events: none;
  white-space: nowrap;
}

/* === OBJETO === */
.item {
  position: absolute;
  left: 50%;
  top: 36%;
  transform: translate(-50%, -50%);
  font-size: 72px;
  line-height: 1;
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  transition: left 0.45s cubic-bezier(0.45, 0, 0.85, 0.6),
    top 0.45s cubic-bezier(0.45, 0, 0.85, 0.6),
    transform 0.45s ease-in,
    opacity 0.45s ease-in;
  animation: item-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes item-in {
  from { transform: translate(-50%, -50%) scale(0); }
  to { transform: translate(-50%, -50%) scale(1); }
}

/* Vuelo hacia cada cubo (coinciden con la posicion de los cubos abajo) */
.item.fly-organico {
  left: 27%;
  top: 82%;
  transform: translate(-50%, -50%) scale(0.25) rotate(-180deg);
  opacity: 0.2;
}

.item.fly-reciclaje {
  left: 73%;
  top: 82%;
  transform: translate(-50%, -50%) scale(0.25) rotate(180deg);
  opacity: 0.2;
}

/* Temblor tras un error */
.item.shake {
  animation: item-shake 0.42s ease-in-out;
}

@keyframes item-shake {
  0%, 100% { transform: translate(-50%, -50%); }
  20% { transform: translate(calc(-50% - 12px), -50%) rotate(-8deg); }
  40% { transform: translate(calc(-50% + 12px), -50%) rotate(8deg); }
  60% { transform: translate(calc(-50% - 8px), -50%) rotate(-5deg); }
  80% { transform: translate(calc(-50% + 8px), -50%) rotate(5deg); }
}

/* === CUBOS === */
.bins {
  position: absolute;
  bottom: 4%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-end;
  z-index: 15;
}

.bin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 38%;
  max-width: 170px;
  padding: 14px 8px 10px;
  border: 3px solid rgba(0, 0, 0, 0.25);
  border-radius: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  -webkit-tap-highlight-color: transparent;
}

.bin:active {
  transform: scale(0.94);
}

.bin-organico {
  background: linear-gradient(180deg, #8d6e63 0%, #5d4037 100%);
}

.bin-reciclaje {
  background: linear-gradient(180deg, #42a5f5 0%, #1565c0 100%);
}

/* Marca de error en el cubo equivocado */
.bin.wrong {
  background: linear-gradient(180deg, #ef5350 0%, #b71c1c 100%);
  animation: bin-shake 0.42s ease-in-out;
}

@keyframes bin-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}

.bin-icon {
  font-size: 44px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.bin-label {
  color: white;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* === OVERLAY DE VICTORIA === */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.3);
  animation: overlay-in 0.25s ease;
  pointer-events: none;
}

.overlay-icon {
  font-size: 72px;
  animation: overlay-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.overlay-text {
  font-size: 22px;
  font-weight: 700;
  color: #2e7d32;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8);
}

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
