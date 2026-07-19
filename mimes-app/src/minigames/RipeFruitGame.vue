<script setup lang="ts">
/**
 * RipeFruitGame.vue — Mini-juego facil (whack-a-mole) de alimentar
 *
 * Mecanica: van apareciendo emojis en posiciones aleatorias del huerto
 * y desaparecen solos tras ~1.2s. Toca 6 frutas maduras para ganar.
 * Tocar una podrida (~30% de apariciones) es derrota inmediata.
 * No hay penalizacion por dejar escapar frutas — la presion la pone
 * el timer del shell (8s).
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONFIGURACION ---
/** Frutas maduras necesarias para ganar */
const GOAL = 6
/** Intervalo de aparicion de items (ms) */
const SPAWN_MS = 700
/** Vida de cada item en pantalla (ms) */
const ITEM_LIFE_MS = 1200
/** Probabilidad de que un item sea podrido */
const BAD_CHANCE = 0.3
/** Pausa para mostrar el overlay de resultado antes de cerrar */
const FEEDBACK_DELAY_MS = 700

const RIPE_FRUITS = ['🍎', '🍌', '🍇', '🍓']
const BAD_ITEMS = ['🤢', '🦠']

// --- ESTADO ---
interface Spot {
  id: number
  /** Posicion precomputada en % del contenedor (nada de Math.random en template) */
  xPct: number
  yPct: number
  emoji: string
  bad: boolean
  bornAt: number
}

const items = ref<Spot[]>([])
const score = ref(0)

type Outcome = 'playing' | 'won' | 'lost'
const outcome = ref<Outcome>('playing')
const done = ref(false)

// Internos del bucle (no reactivos)
let rafId = 0
let completeTimer = 0
let lastTs = 0
let elapsed = 0
let spawnAcc = 0
let nextId = 0

// --- SPAWN ---
function spawnItem() {
  const bad = Math.random() < BAD_CHANCE
  const pool = bad ? BAD_ITEMS : RIPE_FRUITS
  const emoji = pool[Math.floor(Math.random() * pool.length)] ?? '🍎'
  // Margenes: evitan el HUD superior y los bordes
  const xPct = 12 + Math.random() * 76
  const yPct = 20 + Math.random() * 62
  items.value.push({ id: nextId++, xPct, yPct, emoji, bad, bornAt: elapsed })
}

// --- BUCLE PRINCIPAL ---
function tick(ts: number) {
  if (done.value || !props.active) return
  if (lastTs === 0) lastTs = ts
  const dt = Math.min(ts - lastTs, 50) // limita saltos si la pestana se pausa
  lastTs = ts
  elapsed += dt

  // Aparicion periodica
  spawnAcc += dt
  while (spawnAcc >= SPAWN_MS) {
    spawnAcc -= SPAWN_MS
    spawnItem()
  }

  // Retirar items caducados
  items.value = items.value.filter(it => elapsed - it.bornAt < ITEM_LIFE_MS)

  rafId = requestAnimationFrame(tick)
}

// --- INPUT ---
function onTapItem(it: Spot) {
  if (!props.active || done.value) return
  // Retirar el item tocado (evita doble tap sobre el mismo)
  items.value = items.value.filter(o => o.id !== it.id)
  if (it.bad) {
    lose()
    return
  }
  score.value++
  if (score.value >= GOAL) win()
}

// --- RESULTADO ---
function win() {
  if (done.value) return
  done.value = true
  outcome.value = 'won'
  cancelAnimationFrame(rafId)
  completeTimer = window.setTimeout(() => props.onComplete(true), FEEDBACK_DELAY_MS)
}

function lose() {
  if (done.value) return
  done.value = true
  outcome.value = 'lost'
  cancelAnimationFrame(rafId)
  completeTimer = window.setTimeout(() => props.onComplete(false), FEEDBACK_DELAY_MS)
}

// --- CICLO DE VIDA ---
function start() {
  cancelAnimationFrame(rafId)
  clearTimeout(completeTimer)
  items.value = []
  score.value = 0
  outcome.value = 'playing'
  done.value = false
  lastTs = 0
  elapsed = 0
  spawnAcc = 0
  rafId = requestAnimationFrame(tick)
}

watch(
  () => props.active,
  v => {
    if (v) start()
  },
  { immediate: true },
)

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(completeTimer)
})
</script>

<template>
  <div class="ripe-game">
    <!-- HUD: progreso -->
    <div v-if="active" class="hud">🍎 {{ score }}/{{ GOAL }}</div>

    <!-- Pista inicial -->
    <div v-if="active && score === 0 && outcome === 'playing'" class="hint">
      Toca la fruta madura, evita la podrida!
    </div>

    <!-- Items del huerto -->
    <button
      v-for="it in items"
      :key="it.id"
      class="fruit-item"
      :style="{ left: it.xPct + '%', top: it.yPct + '%' }"
      @touchstart.prevent="onTapItem(it)"
      @mousedown="onTapItem(it)"
    >
      {{ it.emoji }}
    </button>

    <!-- Derrota: fruta podrida -->
    <div v-if="outcome === 'lost'" class="overlay overlay-lose">
      <span class="overlay-icon">🤮</span>
      <span class="overlay-text">Estaba podrida!</span>
    </div>

    <!-- Victoria -->
    <div v-if="outcome === 'won'" class="overlay overlay-win">
      <span class="overlay-icon">😋</span>
      <span class="overlay-text">Cosecha deliciosa!</span>
    </div>
  </div>
</template>

<style scoped>
.ripe-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* Huerto calido: verdes oscuros */
  background: linear-gradient(180deg, #1b3a1f 0%, #2e5230 55%, #3e6b3a 100%);
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
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
  z-index: 20;
  pointer-events: none;
}

/* === PISTA === */
.hint {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(255, 255, 255, 0.95);
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  z-index: 2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  animation: hint-pulse 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* === ITEMS === */
.fruit-item {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 42px;
  line-height: 1;
  background: none;
  border: none;
  padding: 8px; /* area tactil algo mayor que el emoji */
  cursor: pointer;
  z-index: 5;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.4));
  animation: item-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes item-pop {
  from { transform: translate(-50%, -50%) scale(0); }
  to { transform: translate(-50%, -50%) scale(1); }
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

.overlay-lose { background: rgba(20, 30, 20, 0.65); }
.overlay-win { background: rgba(255, 255, 255, 0.2); }

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
.overlay-win .overlay-text { color: #ffd54f; }

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
