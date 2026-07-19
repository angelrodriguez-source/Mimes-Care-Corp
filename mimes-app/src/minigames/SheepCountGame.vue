<script setup lang="ts">
/**
 * SheepCountGame.vue — Mini-juego avanzado de descansar
 *
 * Mecanica: "Cuenta ovejas". Durante ~10s cruzan la pantalla saltando
 * ovejas 🐑 y distractores (🐐🐷🐰) a distintas velocidades y alturas,
 * algunos solapados en el tiempo. Al acabar el desfile aparecen 3 botones
 * con numeros: el jugador elige cuantas ovejas conto. Acierto = victoria,
 * fallo = derrota.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const TOTAL_MIN = 10        // animales totales minimos
const TOTAL_MAX = 14        // animales totales maximos
const SHEEP_MIN = 4         // ovejas minimas
const SHEEP_MAX = 7         // ovejas maximas
const SPAWN_WINDOW = 7      // ultimo instante de salida (s) -> desfile ~10s
const CROSS_MIN = 2.4       // duracion minima del cruce (s)
const CROSS_MAX = 3.4       // duracion maxima del cruce (s)
const DISTRACTORS = ['🐐', '🐷', '🐰'] as const
const LANES = [28, 40, 52, 64, 74] as const // alturas base (%)

interface Animal {
  id: number
  emoji: string
  startTime: number  // instante de salida (s)
  duration: number   // tiempo en cruzar (s)
  baseY: number      // altura base (%)
  hops: number       // numero de saltos durante el cruce
  amp: number        // amplitud del salto (%)
  dir: 1 | -1        // 1 = izq->der, -1 = der->izq
  x: number          // posicion actual (%)
  y: number          // posicion actual (%)
  visible: boolean
}

type Phase = 'parade' | 'choose'

// --- STATE ---
const phase = ref<Phase>('parade')
const animals = ref<Animal[]>([])
const options = ref<number[]>([])
const won = ref(false)
const lost = ref(false)
const done = ref(false)

let sheepCount = 0     // numero correcto (decidido en start, NO se muestra)
let paradeEnd = 0      // fin del desfile (s)
let rafId = 0
let startTs = 0
let endTimeout = 0

// --- HELPERS ---
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

/** Construye el desfile: emojis barajados, salidas escalonadas con solapes. */
function buildParade(total: number, sheep: number): Animal[] {
  const emojis: string[] = []
  for (let i = 0; i < total; i++) {
    emojis.push(i < sheep
      ? '🐑'
      : DISTRACTORS[randInt(0, DISTRACTORS.length - 1)] ?? '🐐')
  }
  shuffle(emojis)

  return emojis.map((emoji, i) => {
    // Salidas repartidas por la ventana con jitter (provoca solapes)
    const spread = total > 1 ? (i / (total - 1)) * SPAWN_WINDOW : 0
    const startTime = Math.max(0, spread + rand(-0.4, 0.4))
    return {
      id: i,
      emoji,
      startTime,
      duration: rand(CROSS_MIN, CROSS_MAX),
      baseY: (LANES[i % LANES.length] ?? 50) + rand(-3, 3),
      hops: randInt(3, 5),
      amp: rand(4, 8),
      dir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1,
      x: -20,
      y: 50,
      visible: false,
    }
  })
}

/** Genera las 3 opciones: la correcta y dos cercanas distintas, barajadas. */
function buildOptions(correct: number): number[] {
  const offsets = shuffle([-2, -1, 1, 2].filter((o) => correct + o >= 1))
  const a = correct + (offsets[0] ?? 1)
  const b = correct + (offsets[1] ?? 2)
  return shuffle([correct, a, b])
}

// --- BUCLE DE ANIMACION (desfile con arco senoidal via rAF) ---
function tick(ts: number) {
  if (done.value || phase.value !== 'parade') return
  if (startTs === 0) startTs = ts
  const elapsed = (ts - startTs) / 1000

  for (const a of animals.value) {
    const local = elapsed - a.startTime
    if (local < 0 || local > a.duration) {
      a.visible = false
      continue
    }
    a.visible = true
    const progress = local / a.duration
    // Movimiento horizontal (de fuera a fuera de pantalla)
    a.x = a.dir === 1 ? -15 + progress * 130 : 115 - progress * 130
    // Arco senoidal de salto (siempre hacia arriba)
    a.y = a.baseY - Math.abs(Math.sin(progress * Math.PI * a.hops)) * a.amp
  }

  if (elapsed >= paradeEnd) {
    // Fin del desfile: fase de eleccion
    phase.value = 'choose'
    return
  }
  rafId = requestAnimationFrame(tick)
}

// --- INICIO / RESET ---
function start() {
  won.value = false
  lost.value = false
  done.value = false
  phase.value = 'parade'
  startTs = 0
  cancelAnimationFrame(rafId)
  clearTimeout(endTimeout)

  sheepCount = randInt(SHEEP_MIN, SHEEP_MAX)
  const total = randInt(Math.max(TOTAL_MIN, sheepCount + 3), TOTAL_MAX)
  animals.value = buildParade(total, sheepCount)
  options.value = buildOptions(sheepCount)
  paradeEnd = Math.max(...animals.value.map((a) => a.startTime + a.duration)) + 0.4

  rafId = requestAnimationFrame(tick)
}

// --- INPUT: elegir una respuesta ---
function pickAnswer(value: number) {
  if (!props.active || done.value || phase.value !== 'choose') return

  done.value = true
  const success = value === sheepCount
  won.value = success
  lost.value = !success
  endTimeout = window.setTimeout(() => props.onComplete(success), 700)
}

// --- LIFECYCLE ---
watch(() => props.active, (v) => {
  if (v) start()
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(endTimeout)
})
</script>

<template>
  <div class="sheepcount-game">
    <!-- Luna decorativa con glow -->
    <div class="moon">🌙</div>

    <!-- HUD (sin mostrar el numero durante el desfile) -->
    <div class="hud">
      {{ phase === 'parade' ? 'Cuenta las ovejas 🐑' : 'Cuantas ovejas has contado?' }}
    </div>

    <!-- Desfile de animales saltarines -->
    <span
      v-for="a in animals"
      :key="a.id"
      v-show="a.visible && phase === 'parade'"
      class="animal"
      :class="{ flipped: a.dir === -1 }"
      :style="{ left: a.x + '%', top: a.y + '%' }"
    >{{ a.emoji }}</span>

    <!-- Fase de eleccion: 3 botones grandes -->
    <div v-if="phase === 'choose' && !done" class="choices">
      <button
        v-for="opt in options"
        :key="opt"
        class="choice-btn"
        @touchstart.prevent="pickAnswer(opt)"
        @mousedown="pickAnswer(opt)"
      >{{ opt }}</button>
    </div>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">🌙</div>
      <p class="overlay-text win">Zzz...</p>
    </div>

    <!-- Overlay de derrota -->
    <div v-if="lost" class="overlay">
      <div class="overlay-emoji">😵</div>
      <p class="overlay-text lose">Te has dormido contando!</p>
    </div>
  </div>
</template>

<style scoped>
.sheepcount-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #030610 0%, #0b1530 55%, #142448 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* --- LUNA --- */
.moon {
  position: absolute;
  top: 6%;
  right: 10%;
  font-size: 42px;
  filter: drop-shadow(0 0 14px rgba(255, 241, 178, 0.55));
  animation: moon-glow 3.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes moon-glow {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 241, 178, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 241, 178, 0.75)); }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 20;
  white-space: nowrap;
}

/* --- ANIMALES --- */
.animal {
  position: absolute;
  font-size: 36px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  line-height: 1;
}

/* Los que van de derecha a izquierda miran al otro lado */
.animal.flipped {
  transform: translate(-50%, -50%) scaleX(-1);
}

/* --- BOTONES DE ELECCION --- */
.choices {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 18px;
  z-index: 30;
  animation: choices-in 0.35s ease;
}

.choice-btn {
  width: 76px;
  height: 76px;
  border-radius: 18px;
  border: 2px solid rgba(255, 213, 79, 0.6);
  background: rgba(255, 255, 255, 0.08);
  color: #ffd54f;
  font-size: 32px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease, background 0.15s ease;
}

.choice-btn:active {
  transform: scale(0.92);
  background: rgba(255, 213, 79, 0.25);
}

@keyframes choices-in {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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
  background: rgba(3, 6, 16, 0.75);
  z-index: 50;
  animation: overlay-in 0.3s ease;
}

.overlay-emoji {
  font-size: 72px;
}

.overlay-text {
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  text-align: center;
  width: 90%;
}

.overlay-text.win { color: #ffd54f; }
.overlay-text.lose { color: #f44336; }

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
