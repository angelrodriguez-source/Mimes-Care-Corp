<script setup lang="ts">
/**
 * RecycleRushGame.vue — Mini-juego avanzado de limpieza ("Reciclaje exprés")
 *
 * Mecanica: los objetos aparecen sobre una cinta transportadora y se
 * deslizan de izquierda a derecha (rAF). Mientras el objeto esta en
 * pantalla, el jugador debe tocar su cubo correcto (organico, plastico
 * o papel) para clasificarlo. Tocar el cubo equivocado o dejar que el
 * objeto salga de la cinta cuenta como fallo. La cinta se acelera un 8%
 * con cada acierto. Gana con GOAL aciertos; al tercer fallo, derrota.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Aciertos necesarios para ganar */
const GOAL = 7
/** Fallos que provocan la derrota */
const MAX_FAILS = 3
/** Tiempo base en cruzar la cinta (ms) */
const BASE_CROSS_MS = 3500
/** Aceleracion por acierto (+8% de velocidad) */
const SPEED_UP = 1.08
/** Pausa entre objetos (ms) */
const SPAWN_DELAY_MS = 350
/** Duracion de la animacion de clasificado/fallo del objeto (ms) */
const RESOLVE_MS = 300
/** Pausa del overlay de resultado antes de cerrar (ms) */
const FEEDBACK_DELAY_MS = 750

type Categoria = 'organico' | 'plastico' | 'papel'

/** Emojis de cada categoria */
const OBJETOS: Record<Categoria, string[]> = {
  organico: ['🍌', '🍎', '🥕', '🍗'],
  plastico: ['🥤', '🧴', '🛍️'],
  papel: ['📰', '📦', '✉️'],
}

/** Definicion de los tres cubos, en orden de pantalla */
const CUBOS: Array<{ cat: Categoria; icon: string; label: string }> = [
  { cat: 'organico', icon: '🗑️', label: 'ORGANICO' },
  { cat: 'plastico', icon: '♻️', label: 'PLASTICO' },
  { cat: 'papel', icon: '📄', label: 'PAPEL' },
]

// --- ESTADO ---
const hits = ref(0)
const fails = ref(0)
const outcome = ref<'playing' | 'won' | 'lost'>('playing')

/** Objeto actual sobre la cinta (null entre spawns) */
const itemEmoji = ref('')
const itemCat = ref<Categoria>('organico')
const itemAlive = ref(false)
/** Fase visual del objeto: moviendose, clasificado o fallado (rojo) */
const itemPhase = ref<'moving' | 'sorted' | 'failed'>('moving')
/** Posicion horizontal del objeto (% del ancho de la cinta) */
const itemX = ref(-14)
/** Cubo marcado en rojo tras un fallo */
const wrongBin = ref<Categoria | null>(null)

/** Flag anti doble-onComplete */
let done = false
/** Duracion actual de cruce (baja con cada acierto) */
let crossMs = BASE_CROSS_MS
/** Timestamp de aparicion del objeto actual */
let itemStart = 0
let rafId: number | null = null
let timers: Array<ReturnType<typeof setTimeout>> = []

const failMarks = computed(() => {
  // Marcas de fallo del HUD: true = fallo consumido
  return Array.from({ length: MAX_FAILS }, (_, i) => i < fails.value)
})

function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

function clearAll() {
  timers.forEach(t => clearTimeout(t))
  timers = []
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

// --- BUCLE DE MOVIMIENTO (rAF) ---

function tick(now: number) {
  rafId = null
  if (!props.active || done || !itemAlive.value || itemPhase.value !== 'moving') return

  const progress = (now - itemStart) / crossMs
  // De -14% (fuera por la izquierda) a 114% (fuera por la derecha)
  itemX.value = -14 + progress * 128

  if (progress >= 1) {
    // El objeto salio de la cinta sin clasificar: fallo
    resolveItem('failed')
    return
  }
  rafId = requestAnimationFrame(tick)
}

// --- LOGICA ---

/** Genera un nuevo objeto y arranca su recorrido */
function spawnItem() {
  if (done) return
  const cats: Categoria[] = ['organico', 'plastico', 'papel']
  const cat = cats[Math.floor(Math.random() * cats.length)]!
  const pool = OBJETOS[cat]
  itemCat.value = cat
  itemEmoji.value = pool[Math.floor(Math.random() * pool.length)]!
  itemPhase.value = 'moving'
  itemX.value = -14
  itemAlive.value = true
  itemStart = performance.now()
  rafId = requestAnimationFrame(tick)
}

/** Cierra el objeto actual (clasificado o fallado) y encadena el siguiente */
function resolveItem(phase: 'sorted' | 'failed') {
  itemPhase.value = phase
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (phase === 'failed') {
    fails.value++
    if (fails.value >= MAX_FAILS) {
      lose()
      return
    }
  } else {
    hits.value++
    crossMs /= SPEED_UP // la cinta se acelera con cada acierto
    if (hits.value >= GOAL) {
      win()
      return
    }
  }

  later(() => {
    itemAlive.value = false
    later(spawnItem, SPAWN_DELAY_MS)
  }, RESOLVE_MS)
}

/** El jugador toca un cubo */
function onBin(cat: Categoria) {
  if (!props.active || done) return
  if (!itemAlive.value || itemPhase.value !== 'moving') return

  if (cat === itemCat.value) {
    resolveItem('sorted')
  } else {
    // Cubo equivocado: se marca en rojo y el objeto se descarta como fallo
    wrongBin.value = cat
    later(() => {
      wrongBin.value = null
    }, 420)
    resolveItem('failed')
  }
}

function win() {
  if (done) return
  done = true
  outcome.value = 'won'
  later(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

function lose() {
  if (done) return
  done = true
  outcome.value = 'lost'
  later(() => props.onComplete(false), FEEDBACK_DELAY_MS)
}

/** Reset total al activarse */
function start() {
  clearAll()
  done = false
  outcome.value = 'playing'
  hits.value = 0
  fails.value = 0
  crossMs = BASE_CROSS_MS
  wrongBin.value = null
  itemAlive.value = false
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
  clearAll()
})
</script>

<template>
  <div class="recycle-rush-game">
    <!-- HUD: aciertos + marcas de fallo -->
    <div class="hud">
      <span class="hud-text">{{ hits }}/{{ GOAL }}</span>
      <span class="hud-fails">
        <span
          v-for="(used, i) in failMarks"
          :key="i"
          class="fail-dot"
          :class="{ used }"
        >❌</span>
      </span>
    </div>

    <!-- Cinta transportadora con rayas animadas -->
    <div class="belt">
      <div class="belt-stripes" aria-hidden="true"></div>
      <!-- Objeto en movimiento -->
      <div
        v-if="itemAlive"
        class="item"
        :class="itemPhase"
        :style="{ left: itemX + '%' }"
      >
        {{ itemEmoji }}
      </div>
    </div>

    <!-- Cubos de clasificacion -->
    <div class="bins">
      <button
        v-for="cubo in CUBOS"
        :key="cubo.cat"
        class="bin"
        :class="[`bin-${cubo.cat}`, { wrong: wrongBin === cubo.cat }]"
        @touchstart.prevent="onBin(cubo.cat)"
        @mousedown="onBin(cubo.cat)"
      >
        <span class="bin-icon">{{ cubo.icon }}</span>
        <span class="bin-label">{{ cubo.label }}</span>
      </button>
    </div>

    <!-- Derrota -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">🚮</span>
      <span class="overlay-text">Que desastre!</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">♻️</span>
      <span class="overlay-text">Reciclaje perfecto!</span>
    </div>
  </div>
</template>

<style scoped>
.recycle-rush-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #37474f 0%, #455a64 55%, #546e7a 100%);
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
  display: flex;
  align-items: center;
  gap: 12px;
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

.hud-fails {
  display: flex;
  gap: 3px;
}

.fail-dot {
  font-size: 12px;
  line-height: 1;
  opacity: 0.25;
  filter: grayscale(1);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.fail-dot.used {
  opacity: 1;
  filter: none;
  animation: fail-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes fail-pop {
  from { transform: scale(2); }
  to { transform: scale(1); }
}

/* === CINTA TRANSPORTADORA === */
.belt {
  position: absolute;
  top: 42%;
  left: 0;
  right: 0;
  height: 96px;
  background: #263238;
  border-top: 5px solid #607d8b;
  border-bottom: 5px solid #607d8b;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
}

/* Rayas diagonales animadas que dan sensacion de movimiento */
.belt-stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -55deg,
    rgba(255, 255, 255, 0.1) 0px,
    rgba(255, 255, 255, 0.1) 14px,
    transparent 14px,
    transparent 34px
  );
  background-size: 200% 100%;
  animation: belt-move 0.9s linear infinite;
}

@keyframes belt-move {
  from { background-position: 0 0; }
  to { background-position: 41px 0; }
}

/* === OBJETO === */
.item {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 54px;
  line-height: 1;
  z-index: 10;
  pointer-events: none;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
}

/* Clasificado: cae hacia los cubos y desaparece */
.item.sorted {
  transition: transform 0.3s ease-in, opacity 0.3s ease-in;
  transform: translate(-50%, 90px) scale(0.3);
  opacity: 0;
}

/* Fallado: se marca en rojo y se desvanece */
.item.failed {
  transition: opacity 0.3s ease-out;
  filter: sepia(1) saturate(6) hue-rotate(-45deg) drop-shadow(0 0 8px rgba(244, 67, 54, 0.9));
  animation: item-fail-shake 0.3s ease-in-out;
  opacity: 0;
}

@keyframes item-fail-shake {
  0%, 100% { margin-top: 0; }
  30% { margin-top: -8px; }
  60% { margin-top: 6px; }
}

/* === CUBOS === */
.bins {
  position: absolute;
  bottom: 3%;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-evenly;
  align-items: flex-end;
  gap: 6px;
  padding: 0 6px;
  z-index: 15;
}

.bin {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  max-width: 120px;
  padding: 12px 4px 8px;
  border: 3px solid rgba(0, 0, 0, 0.3);
  border-radius: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.12s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  -webkit-tap-highlight-color: transparent;
}

.bin:active {
  transform: scale(0.94);
}

.bin-organico {
  background: linear-gradient(180deg, #8d6e63 0%, #5d4037 100%);
}

.bin-plastico {
  background: linear-gradient(180deg, #ffb300 0%, #ef6c00 100%);
}

.bin-papel {
  background: linear-gradient(180deg, #42a5f5 0%, #1565c0 100%);
}

/* Marca de fallo en el cubo equivocado */
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
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.bin-label {
  color: white;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
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
.overlay-win .overlay-text { color: #a5d6a7; }

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
