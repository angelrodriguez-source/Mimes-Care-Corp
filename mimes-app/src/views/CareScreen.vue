<script setup lang="ts">
/**
 * CareScreen.vue — Pantalla de cuidado rediseñada.
 *
 * Layout:
 *   ┌──────────────────────────┐
 *   │  ← Mimo          100 PM │  ← cabecera semitransparente
 *   │                          │
 *   │  🍖                      │  ← menú acciones (izquierda)
 *   │  🛁      ┌──────┐       │
 *   │  🎮      │ MIME │       │  ← habitación con el Mime
 *   │  💕      └──────┘       │
 *   │  😴       ═══════       │  ← sombra suelo
 *   │  👔                      │
 *   │                          │
 *   │         [Stats ▲]        │  ← botón para abrir panel stats
 *   ├──────────────────────────┤
 *   │  ▼ Stats panel           │  ← se desliza desde abajo
 *   │  🍖 Hambre    ████░░ 70 │
 *   │  🛁 Higiene   ████░░ 70 │
 *   │  ...                     │
 *   └──────────────────────────┘
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MimeCharacter from '../components/MimeCharacter.vue'
import StatBar from '../components/StatBar.vue'
import {
  type MimeStats,
  type Personality,
  type ColorTheme,
  type CareAction,
  type Mood,
  createInitialStats,
  deriveMood,
  applyCareAction,
  applyDecay,
  getStatsAverage,
  ACTION_COSTS,
} from '../models/MimeModel'

// --- DATOS REACTIVOS ---
const mimeName = ref('Mimo')
const personality = ref<Personality>('aventurero')
const colorTheme = ref<ColorTheme>('celeste')
const stats = ref<MimeStats>(createInitialStats())
const puntosMimes = ref(100)
const afinidad = ref(50) // 0-100, por ahora simulada

const mood = computed<Mood>(() => deriveMood(stats.value))
const statsAvg = computed(() => Math.round(getStatsAverage(stats.value)))

// Etiqueta legible para el humor
const moodLabel = computed(() => {
  const labels: Record<string, string> = {
    euforico: 'Eufórico',
    feliz: 'Feliz',
    '': 'Normal',
    triste: 'Triste',
    dormido: 'Dormido',
    hambriento: 'Hambriento',
  }
  return labels[mood.value] ?? 'Normal'
})

// --- UI STATE ---
// showStats controla si el panel inferior está visible o no.
// Al cambiar, la clase CSS .open se añade/quita y el CSS transition lo anima.
const showStats = ref(false)

// --- STATS CONFIG ---
const statConfig: { key: keyof MimeStats; label: string; icon: string }[] = [
  { key: 'hambre', label: 'Hambre', icon: '🍖' },
  { key: 'higiene', label: 'Higiene', icon: '🛁' },
  { key: 'diversion', label: 'Diversión', icon: '🎮' },
  { key: 'carino', label: 'Cariño', icon: '💕' },
  { key: 'energia', label: 'Energía', icon: '⚡' },
  { key: 'apariencia', label: 'Apariencia', icon: '✨' },
]

// --- ACTIONS CONFIG ---
const actionConfig: { action: CareAction; label: string; icon: string }[] = [
  { action: 'alimentar', label: 'Alimentar', icon: '🍖' },
  { action: 'limpiar', label: 'Limpiar', icon: '🛁' },
  { action: 'jugar', label: 'Jugar', icon: '🎮' },
  { action: 'carino', label: 'Cariño', icon: '💕' },
  { action: 'descansar', label: 'Descansar', icon: '😴' },
  { action: 'vestir', label: 'Vestir', icon: '👔' },
]

// --- ACCIONES ---
function handleAction(action: CareAction) {
  const cost = ACTION_COSTS[action]
  if (puntosMimes.value < cost) return
  puntosMimes.value -= cost
  stats.value = applyCareAction(stats.value, action)
}

// --- DECAY ---
let decayInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  decayInterval = setInterval(() => {
    stats.value = applyDecay(stats.value, personality.value, 0.5)
  }, 30000)
})

onUnmounted(() => {
  if (decayInterval) clearInterval(decayInterval)
})

// --- SELECTOR DE PERSONALIDAD (temporal para probar) ---
const personalities: { value: Personality; theme: ColorTheme; label: string }[] = [
  { value: 'aventurero', theme: 'celeste', label: 'Aventurero' },
  { value: 'tranquilo', theme: 'lila', label: 'Tranquilo' },
  { value: 'picaro', theme: 'melocoton', label: 'Pícaro' },
]

function switchPersonality(p: Personality, t: ColorTheme) {
  personality.value = p
  colorTheme.value = t
  stats.value = createInitialStats()
}
</script>

<template>
  <div class="care-screen">

    <!-- === CABECERA (semitransparente, flota sobre la habitación) === -->
    <header class="care-header">
      <button class="back-btn" @click="$router.push('/')">&#8592;</button>
      <h1 class="mime-name">{{ mimeName }}</h1>
      <div class="puntos">
        <span class="puntos-icon">&#9829;</span>
        <span class="puntos-value">{{ puntosMimes }}</span>
      </div>
    </header>

    <!-- Selector personalidad (temporal) -->
    <div class="personality-selector">
      <button
        v-for="p in personalities"
        :key="p.value"
        class="personality-btn"
        :class="{ active: personality === p.value }"
        @click="switchPersonality(p.value, p.theme)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- === HABITACIÓN (el escenario principal) === -->
    <div class="room">
      <!-- Pared de fondo con degradado -->
      <div class="room-wall"></div>

      <!-- Suelo -->
      <div class="room-floor"></div>

      <!-- Mime en el centro de la habitación -->
      <div class="mime-area">
        <MimeCharacter
          :personality="personality"
          :color-theme="colorTheme"
          :mood="mood"
        />
      </div>

    </div>

    <!-- === RESUMEN DE ESTADO (vertical, lado derecho) === -->
    <button class="status-summary" @click="showStats = !showStats">
      <div class="summary-item affinity">
        <span class="summary-icon">&#9829;</span>
        <span class="summary-value">{{ afinidad }}%</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-value">{{ moodLabel }}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-item">
        <span class="summary-value">{{ statsAvg }}</span>
      </div>
      <span class="summary-arrow" :class="{ open: showStats }">&#9654;</span>
    </button>

    <!-- === MENÚ ACCIONES (lateral izquierdo) === -->
    <div class="actions-menu">
      <button
        v-for="a in actionConfig"
        :key="a.action"
        class="action-fab"
        :class="{ disabled: puntosMimes < ACTION_COSTS[a.action] }"
        :disabled="puntosMimes < ACTION_COSTS[a.action]"
        :title="a.label"
        @click="handleAction(a.action)"
      >
        <span class="fab-icon">{{ a.icon }}</span>
        <span class="fab-cost">{{ ACTION_COSTS[a.action] }}</span>
      </button>
    </div>

    <!-- === PANEL DE STATS (se desliza desde la derecha) === -->
    <div class="stats-drawer" :class="{ open: showStats }">
      <div class="stats-drawer-handle"></div>
      <div class="stats-drawer-content">
        <StatBar
          v-for="s in statConfig"
          :key="s.key"
          :label="s.label"
          :value="stats[s.key]"
          :icon="s.icon"
        />
      </div>
    </div>

    <!-- Overlay para cerrar stats al tocar fuera -->
    <div
      v-if="showStats"
      class="stats-overlay"
      @click="showStats = false"
    ></div>
  </div>
</template>

<style scoped>
/* === LAYOUT GENERAL === */
.care-screen {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  /* Sin scroll — todo cabe en la pantalla */
}

/* === CABECERA === */
.care-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  z-index: 30;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.back-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  color: #5c6bc0;
  font-weight: 700;
}

.mime-name {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.puntos {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fff3e0;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1.5px solid #ffe0b2;
}

.puntos-icon {
  color: #ff7043;
  font-size: 14px;
}

.puntos-value {
  font-size: 14px;
  font-weight: 700;
  color: #e65100;
}

/* Selector personalidad (temporal) */
.personality-selector {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 30;
}

.personality-btn {
  padding: 3px 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Baloo 2', cursive;
  color: #555;
  backdrop-filter: blur(4px);
}

.personality-btn.active {
  background: #5c6bc0;
  color: white;
  border-color: #5c6bc0;
}

/* === HABITACIÓN === */
.room {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

/* Pared: degradado vertical que simula una pared iluminada desde arriba */
.room-wall {
  flex: 1;
  background: linear-gradient(
    180deg,
    #e8eaf6 0%,       /* arriba: luz suave azulada */
    #c5cae9 40%,       /* medio */
    #b39ddb 100%       /* abajo: sombra más oscura cerca del suelo */
  );
}

/* Suelo: un color más oscuro con perspectiva sutil */
.room-floor {
  height: 35%;
  background: linear-gradient(
    180deg,
    #a1887f 0%,        /* borde suelo-pared */
    #8d6e63 30%,       /* madera media */
    #795548 100%       /* lejos */
  );
  border-top: 3px solid #6d4c41;
}

/* Mime centrado en la habitación */
.mime-area {
  position: absolute;
  bottom: 30%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

/* Resumen de estado (vertical, lateral derecho) */
.status-summary {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.85);
  padding: 12px 8px;
  border-radius: 16px;
  border: none;
  z-index: 25;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-family: 'Baloo 2', cursive;
  transition: all 0.2s;
}

.status-summary:active {
  transform: translateY(-50%) scale(0.95);
  background: rgba(255, 255, 255, 0.95);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-icon {
  font-size: 14px;
  color: #ef5350;
}

.summary-value {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.summary-divider {
  width: 24px;
  height: 1px;
  background: #e0e0e0;
}

.summary-arrow {
  font-size: 9px;
  color: #5c6bc0;
  transition: transform 0.3s ease;
  margin-top: 2px;
}

.summary-arrow.open {
  transform: rotate(180deg);
}

/* === MENÚ DE ACCIONES (lateral izquierdo) === */
.actions-menu {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 20;
}

.action-fab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  backdrop-filter: blur(4px);
}

.action-fab:active:not(.disabled) {
  transform: scale(0.88);
  background: #e8eaf6;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.action-fab.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.fab-icon {
  font-size: 22px;
  line-height: 1;
}

.fab-cost {
  font-size: 9px;
  font-weight: 700;
  color: #e65100;
  margin-top: -2px;
}

/* === PANEL STATS (drawer desde la derecha) === */
.stats-drawer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 260px;
  background: white;
  border-radius: 20px 0 0 20px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
  z-index: 40;
  /* Empieza fuera de pantalla (derecha) */
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stats-drawer.open {
  transform: translateX(0);
}

.stats-drawer-content {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Barra decorativa de "handle" en el lateral izquierdo del drawer */
.stats-drawer-handle {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 40px;
  background: #e0e0e0;
  border-radius: 2px;
}

/* Overlay semitransparente detrás del drawer */
.stats-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  z-index: 35;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
