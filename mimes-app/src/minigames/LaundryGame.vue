<script setup lang="ts">
/**
 * LaundryGame.vue — Mini-juego avanzado de vestir
 *
 * Mecánica: "Tendedero". 10 camisetas de 4 colores cuelgan de
 * dos cuerdas balanceándose. Un cartel pide un color, que cambia
 * cada ~4s a otro que aún tenga prendas colgadas. Descolgar 7
 * prendas correctas = victoria. 1er fallo aviso, 2º fallo derrota.
 */
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const COLORS = [
  { name: 'ROJAS', hex: '#e53935' },
  { name: 'AZULES', hex: '#1e88e5' },
  { name: 'VERDES', hex: '#43a047' },
  { name: 'AMARILLAS', hex: '#fdd835' },
]
const TOTAL = 10 // camisetas colgadas
const NEED = 7 // correctas para ganar
const MAX_FAILS = 2 // 2º fallo = derrota
const SWITCH_MS = 4000 // cambio de color pedido
const END_DELAY = 700 // retardo antes de onComplete

interface Shirt {
  id: number
  colorIdx: number
  line: number // cuerda 0 o 1
  x: number // posición horizontal en %
  swayDelay: number // desfase de balanceo en s (precomputado)
  hung: boolean // sigue colgada
  falling: boolean // animación de caída
  shake: boolean // aviso de fallo
}

// --- ESTADO ---
const shirts = ref<Shirt[]>([])
const targetIdx = ref(0)
const removed = ref(0)
const fails = ref(0)
const warn = ref(false) // banner 😬 tras el 1er fallo
const done = ref(false)
const result = ref<'none' | 'win' | 'lose'>('none')

let switchInterval = 0
let endTimeout = 0
let warnTimeout = 0
let shakeTimeout = 0

const targetColor = computed(() => COLORS[targetIdx.value] ?? COLORS[0]!)

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

// Colores que aún tienen prendas colgadas
function hangingColors(): number[] {
  const set = new Set<number>()
  for (const s of shirts.value) if (s.hung) set.add(s.colorIdx)
  return [...set]
}

// Elige un color pedido distinto al actual (si es posible) entre los colgados
function pickTarget() {
  const avail = hangingColors()
  if (avail.length === 0) return
  const others = avail.filter(c => c !== targetIdx.value)
  const pool = others.length > 0 ? others : avail
  targetIdx.value = pool[Math.floor(Math.random() * pool.length)] ?? avail[0]!
}

// (Re)programa el cambio periódico de color pedido
function scheduleSwitch() {
  clearInterval(switchInterval)
  switchInterval = window.setInterval(pickTarget, SWITCH_MS)
}

// Resetea todo el estado y cuelga las camisetas
function start() {
  clearInterval(switchInterval)
  clearTimeout(endTimeout)
  clearTimeout(warnTimeout)
  clearTimeout(shakeTimeout)
  done.value = false
  removed.value = 0
  fails.value = 0
  warn.value = false
  result.value = 'none'

  // Distribución aleatoria: uno de cada color garantizado + 6 al azar
  const colorIdxs: number[] = [0, 1, 2, 3]
  for (let i = colorIdxs.length; i < TOTAL; i++) {
    colorIdxs.push(Math.floor(Math.random() * COLORS.length))
  }
  shuffle(colorIdxs)

  shirts.value = colorIdxs.map((colorIdx, i) => {
    const line = i < 5 ? 0 : 1
    const slot = i % 5
    return {
      id: i,
      colorIdx,
      line,
      x: 12 + slot * 19 + (Math.random() * 6 - 3), // reparto con jitter
      swayDelay: -Math.random() * 2.4,
      hung: true,
      falling: false,
      shake: false,
    }
  })

  pickTarget()
  scheduleSwitch()
}

// Tap sobre una camiseta
function tapShirt(id: number) {
  if (!props.active || done.value) return
  const shirt = shirts.value.find(s => s.id === id)
  if (!shirt || !shirt.hung) return

  if (shirt.colorIdx === targetIdx.value) {
    // Correcta: se descuelga y cae
    shirt.hung = false
    shirt.falling = true
    removed.value++
    if (removed.value >= NEED) {
      finish(true)
      return
    }
    // Si el color pedido se agotó, cambia ya y reinicia el ciclo
    if (!hangingColors().includes(targetIdx.value)) {
      pickTarget()
      scheduleSwitch()
    }
  } else {
    // Equivocada: 1er fallo aviso, 2º derrota
    fails.value++
    if (fails.value >= MAX_FAILS) {
      finish(false)
      return
    }
    shirt.shake = true
    warn.value = true
    clearTimeout(shakeTimeout)
    clearTimeout(warnTimeout)
    shakeTimeout = window.setTimeout(() => { shirt.shake = false }, 450)
    warnTimeout = window.setTimeout(() => { warn.value = false }, 900)
  }
}

// Muestra overlay y notifica al shell tras un breve retardo
function finish(success: boolean) {
  done.value = true
  result.value = success ? 'win' : 'lose'
  clearInterval(switchInterval)
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
  clearInterval(switchInterval)
  clearTimeout(endTimeout)
  clearTimeout(warnTimeout)
  clearTimeout(shakeTimeout)
})
</script>

<template>
  <div class="laundry-game">
    <!-- HUD + cartel de color pedido -->
    <div class="hud" v-if="active">{{ removed }}/{{ NEED }}</div>
    <div class="sign" v-if="active" :key="targetIdx">
      <span class="sign-text">Descuelga las</span>
      <span class="sign-color" :style="{ color: targetColor.hex }">{{ targetColor.name }}</span>
      <span class="sign-swatch" :style="{ background: targetColor.hex }"></span>
    </div>

    <!-- Cuerdas de tender -->
    <div class="rope rope-1"></div>
    <div class="rope rope-2"></div>

    <!-- Camisetas colgadas -->
    <div
      v-for="shirt in shirts"
      :key="shirt.id"
      class="shirt"
      :class="{ falling: shirt.falling, shake: shirt.shake }"
      :style="{
        left: shirt.x + '%',
        top: (shirt.line === 0 ? 27 : 55) + '%',
      }"
      @touchstart.prevent="tapShirt(shirt.id)"
      @mousedown="tapShirt(shirt.id)"
    >
      <span class="shirt-pin"></span>
      <span
        class="shirt-body"
        :style="{ animationDelay: shirt.swayDelay + 's' }"
      >
        <span
          class="shirt-emoji"
          :style="{ filter: `drop-shadow(0 0 5px ${COLORS[shirt.colorIdx]?.hex ?? '#fff'})` }"
        >👕</span>
        <span class="shirt-dot" :style="{ background: COLORS[shirt.colorIdx]?.hex ?? '#fff' }"></span>
      </span>
    </div>

    <!-- Aviso de primer fallo -->
    <div v-if="warn && result === 'none'" class="warn-banner">😬</div>

    <!-- Overlays de resultado -->
    <div v-if="result === 'win'" class="overlay win">
      <span class="overlay-emoji">🧺</span>
      <span class="overlay-text">Colada lista!</span>
    </div>
    <div v-if="result === 'lose'" class="overlay lose">
      <span class="overlay-emoji">😵</span>
      <span class="overlay-text">Colada equivocada!</span>
    </div>
  </div>
</template>

<style scoped>
.laundry-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  /* Patio de tender al atardecer */
  background: linear-gradient(180deg, #24344d 0%, #3a5068 60%, #4d6a80 100%);
  touch-action: manipulation;
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

/* --- CARTEL DE COLOR PEDIDO --- */
.sign {
  position: absolute;
  top: 42px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  padding: 6px 16px;
  border-radius: 20px;
  white-space: nowrap;
  z-index: 5;
  animation: sign-pop 0.3s ease-out;
}

@keyframes sign-pop {
  0% { transform: translateX(-50%) scale(0.7); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}

.sign-text {
  color: white;
  font-size: 15px;
  font-weight: 700;
}

.sign-color {
  font-size: 18px;
  font-weight: 800;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.sign-swatch {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

/* --- CUERDAS --- */
.rope {
  position: absolute;
  left: -2%;
  width: 104%;
  height: 3px;
  background: linear-gradient(90deg, #d7ccc8, #efebe9, #d7ccc8);
  border-radius: 2px;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.35);
}

.rope-1 { top: 27%; }
.rope-2 { top: 55%; }

/* --- CAMISETAS --- */
.shirt {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  z-index: 3;
}

/* Pinza que sujeta la camiseta a la cuerda */
.shirt-pin {
  width: 6px;
  height: 10px;
  margin-top: -5px;
  background: #a1887f;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

/* Balanceo suave colgando de la pinza */
.shirt-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: top center;
  animation: shirt-sway 2.4s ease-in-out infinite alternate;
}

.shirt-emoji {
  font-size: 38px;
  line-height: 1;
}

.shirt-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  margin-top: -2px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

@keyframes shirt-sway {
  0% { transform: rotate(-5deg); }
  100% { transform: rotate(5deg); }
}

/* Caída al descolgar una correcta */
.shirt.falling {
  pointer-events: none;
  animation: shirt-fall 0.6s ease-in forwards;
}

@keyframes shirt-fall {
  0% { transform: translateX(-50%) translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateX(-50%) translateY(70vh) rotate(50deg); opacity: 0; }
}

/* Aviso al tocar un color equivocado */
.shirt.shake {
  animation: shirt-warn 0.45s ease-in-out;
}

@keyframes shirt-warn {
  0%, 100% { transform: translateX(-50%); }
  25% { transform: translateX(calc(-50% - 8px)); }
  50% { transform: translateX(calc(-50% + 8px)); }
  75% { transform: translateX(calc(-50% - 5px)); }
}

.warn-banner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 58px;
  line-height: 1;
  z-index: 15;
  pointer-events: none;
  animation: warn-pop 0.9s ease-out forwards;
}

@keyframes warn-pop {
  0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
  20% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
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
