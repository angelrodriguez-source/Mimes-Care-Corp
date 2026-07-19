<script setup lang="ts">
/**
 * DreamCatchGame.vue — Mini-juego avanzado de descansar
 *
 * Mecanica: "Cazasueños". Bajo un cielo estrellado cruzan la pantalla en
 * diagonal estrellas fugaces (✨/🌠, buenas) y pesadillas (👻, malas),
 * mezcladas. Toca 6 estrellas para ganar (cada una atrapada brilla y suma).
 * Tocar una pesadilla = derrota inmediata. Dejar pasar estrellas no penaliza.
 * Proporcion ~70% estrellas (bolsa barajada de 10 para evitar rachas).
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const REQUIRED = 6            // estrellas a atrapar
const SPAWN_EVERY = 1.1       // segundos entre spawns
const FIRST_SPAWN = 0.4       // primer spawn mas rapido
const CAUGHT_LINGER = 0.5     // segundos que brilla una estrella atrapada
const STAR_EMOJIS = ['✨', '🌠'] as const

// Cielo estrellado decorativo precomputado (nada de Math.random en template)
const SKY_STARS = [
  { left: '8%', top: '12%', delay: '0s', size: '10px' },
  { left: '22%', top: '30%', delay: '0.9s', size: '8px' },
  { left: '35%', top: '8%', delay: '1.6s', size: '12px' },
  { left: '48%', top: '24%', delay: '0.4s', size: '9px' },
  { left: '62%', top: '10%', delay: '1.2s', size: '11px' },
  { left: '75%', top: '28%', delay: '2s', size: '8px' },
  { left: '88%', top: '16%', delay: '0.6s', size: '10px' },
  { left: '15%', top: '55%', delay: '1.8s', size: '9px' },
  { left: '55%', top: '48%', delay: '0.2s', size: '8px' },
  { left: '82%', top: '52%', delay: '1.4s', size: '10px' },
  { left: '30%', top: '70%', delay: '0.8s', size: '8px' },
  { left: '68%', top: '75%', delay: '1.1s', size: '9px' },
] as const

type Kind = 'star' | 'ghost'

interface Flyer {
  id: number
  kind: Kind
  emoji: string
  x: number          // posicion en % del contenedor
  y: number
  vx: number         // velocidad en %/s
  vy: number
  caught: boolean    // estrella atrapada (brilla antes de desaparecer)
  caughtAt: number   // instante (elapsed) en que se atrapo
}

// --- STATE ---
const caught = ref(0)
const flyers = ref<Flyer[]>([])
const won = ref(false)
const lost = ref(false)
const done = ref(false)

let rafId = 0
let lastTs = 0
let elapsed = 0        // reloj interno del juego en segundos
let spawnAcc = 0       // acumulador hasta el proximo spawn
let endTimeout = 0
let idCounter = 0
let bag: Kind[] = []   // bolsa barajada: 7 estrellas / 3 pesadillas

// --- BOLSA DE TIPOS (~70% estrellas, sin rachas largas) ---
function nextKind(): Kind {
  if (bag.length === 0) {
    bag = (['star', 'star', 'star', 'star', 'star', 'star', 'star', 'ghost', 'ghost', 'ghost'] as Kind[])
    // Barajado Fisher-Yates
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = bag[i]!
      bag[i] = bag[j]!
      bag[j] = tmp
    }
  }
  return bag.pop() ?? 'star'
}

// --- SPAWN: trayectoria diagonal recta aleatoria (~2s en cruzar) ---
function spawnFlyer() {
  const kind = nextKind()
  const fromLeft = Math.random() < 0.5
  const x = fromLeft ? -10 : 110
  const y = 4 + Math.random() * 55
  // Velocidad horizontal ~55-70 %/s → cruza los ~120% en unos 2s
  const vx = (fromLeft ? 1 : -1) * (55 + Math.random() * 15)
  const vy = 10 + Math.random() * 22 // siempre descendiendo en diagonal
  const emoji = kind === 'ghost'
    ? '👻'
    : STAR_EMOJIS[Math.floor(Math.random() * STAR_EMOJIS.length)] ?? '✨'
  flyers.value.push({ id: idCounter++, kind, emoji, x, y, vx, vy, caught: false, caughtAt: 0 })
}

// --- BUCLE: mover flyers, spawnear y podar los que salen ---
function tick(ts: number) {
  if (done.value) return
  if (lastTs > 0) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05)
    elapsed += dt
    spawnAcc += dt
    if (spawnAcc >= SPAWN_EVERY) {
      spawnAcc = 0
      spawnFlyer()
    }
    for (const f of flyers.value) {
      if (!f.caught) {
        f.x += f.vx * dt
        f.y += f.vy * dt
      }
    }
    // Podar: fuera de pantalla o atrapadas que ya han brillado
    flyers.value = flyers.value.filter(f =>
      f.caught
        ? elapsed - f.caughtAt < CAUGHT_LINGER
        : f.x > -14 && f.x < 114 && f.y < 114
    )
  }
  lastTs = ts
  rafId = requestAnimationFrame(tick)
}

// --- INICIO / RESET ---
function start() {
  caught.value = 0
  flyers.value = []
  won.value = false
  lost.value = false
  done.value = false
  lastTs = 0
  elapsed = 0
  spawnAcc = SPAWN_EVERY - FIRST_SPAWN
  bag = []
  cancelAnimationFrame(rafId)
  clearTimeout(endTimeout)
  rafId = requestAnimationFrame(tick)
}

// --- INPUT: tocar un flyer ---
function tapFlyer(id: number) {
  if (!props.active || done.value) return
  const f = flyers.value.find(fl => fl.id === id)
  if (!f || f.caught) return

  if (f.kind === 'ghost') {
    // Pesadilla tocada: derrota inmediata
    done.value = true
    lost.value = true
    cancelAnimationFrame(rafId)
    endTimeout = window.setTimeout(() => props.onComplete(false), 700)
    return
  }

  // Estrella atrapada: brilla y suma
  f.caught = true
  f.caughtAt = elapsed
  caught.value++

  if (caught.value >= REQUIRED) {
    done.value = true
    won.value = true
    cancelAnimationFrame(rafId)
    endTimeout = window.setTimeout(() => props.onComplete(true), 700)
  }
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
  <div class="dreamcatch-game">
    <!-- Luna -->
    <div class="moon">🌙</div>

    <!-- Cielo estrellado decorativo -->
    <span
      v-for="(star, i) in SKY_STARS"
      :key="'sky-' + i"
      class="sky-star"
      :style="{ left: star.left, top: star.top, animationDelay: star.delay, fontSize: star.size }"
    >⭐</span>

    <!-- HUD: progreso -->
    <div class="hud">{{ caught }}/{{ REQUIRED }}</div>

    <!-- Estrellas fugaces y pesadillas cruzando en diagonal -->
    <div
      v-for="f in flyers"
      :key="f.id"
      class="flyer"
      :class="{ ghost: f.kind === 'ghost', caught: f.caught }"
      :style="{ left: f.x + '%', top: f.y + '%' }"
      @touchstart.prevent="tapFlyer(f.id)"
      @mousedown="tapFlyer(f.id)"
    >{{ f.emoji }}</div>

    <p v-if="!done" class="instruction">Atrapa las estrellas, evita las pesadillas!</p>

    <!-- Overlay de victoria -->
    <div v-if="won" class="overlay">
      <div class="overlay-emoji">🌠</div>
      <p class="overlay-text win">Dulces sueños!</p>
    </div>

    <!-- Overlay de derrota -->
    <div v-if="lost" class="overlay">
      <div class="overlay-emoji">👻</div>
      <p class="overlay-text lose">Pesadilla!</p>
    </div>
  </div>
</template>

<style scoped>
.dreamcatch-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #030711 0%, #081228 50%, #0d1c3a 100%);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

/* --- DECORACION --- */
.moon {
  position: absolute;
  top: 6%;
  left: 10%;
  font-size: 40px;
  filter: drop-shadow(0 0 14px rgba(255, 241, 178, 0.5));
  pointer-events: none;
}

.sky-star {
  position: absolute;
  animation: twinkle 2.4s ease-in-out infinite;
  pointer-events: none;
  opacity: 0.5;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 0.8; transform: scale(1.15); }
}

/* --- HUD --- */
.hud {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffd54f;
  font-size: 22px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  z-index: 20;
}

/* --- FLYERS (estrellas fugaces y pesadillas) --- */
.flyer {
  position: absolute;
  width: 56px;
  height: 56px;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  cursor: pointer;
  z-index: 10;
  filter: drop-shadow(0 0 6px rgba(255, 235, 160, 0.5));
}

.flyer.ghost {
  filter: drop-shadow(0 0 6px rgba(180, 200, 255, 0.4));
}

/* Estrella atrapada: destello antes de desaparecer */
.flyer.caught {
  animation: sparkle 0.5s ease-out forwards;
  pointer-events: none;
}

@keyframes sparkle {
  0% { transform: translate(-50%, -50%) scale(1); filter: drop-shadow(0 0 6px rgba(255, 235, 160, 0.6)); opacity: 1; }
  40% { transform: translate(-50%, -50%) scale(1.6); filter: drop-shadow(0 0 18px rgba(255, 235, 160, 1)); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
}

.instruction {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  pointer-events: none;
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
  background: rgba(3, 7, 17, 0.75);
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
}

.overlay-text.win { color: #ffd54f; }
.overlay-text.lose { color: #f44336; }

@keyframes overlay-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
