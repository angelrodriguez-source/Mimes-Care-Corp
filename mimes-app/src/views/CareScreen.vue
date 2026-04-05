<script setup lang="ts">
/**
 * CareScreen.vue — Pantalla de cuidado de un Mime.
 *
 * Estructura (de arriba a abajo):
 *   1. Cabecera: nombre del Mime + Puntos Mimes del usuario
 *   2. Mime visual: el componente <MimeCharacter> con humor reactivo
 *   3. Stats: 6 barras de estadísticas
 *   4. Acciones: 6 botones de cuidado
 *
 * Por ahora funciona con datos locales (ref/reactive).
 * Más adelante lo conectaremos a Supabase.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MimeCharacter from '../components/MimeCharacter.vue'
import StatBar from '../components/StatBar.vue'
import ActionButton from '../components/ActionButton.vue'
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
  ACTION_COSTS,
} from '../models/MimeModel'

// --- DATOS REACTIVOS ---
// ref() crea variables que, al cambiar, actualizan automáticamente la UI.
// Por ahora son datos de prueba locales. Más adelante vendrán de Supabase.

const mimeName = ref('Mimo')
const personality = ref<Personality>('aventurero')
const colorTheme = ref<ColorTheme>('celeste')
const stats = ref<MimeStats>(createInitialStats())
const puntosMimes = ref(100) // puntos del usuario

// computed: se recalcula solo cuando cambia stats.value
const mood = computed<Mood>(() => deriveMood(stats.value))

// --- CONFIGURACIÓN DE LAS BARRAS ---
// Mapeo de cada stat a su icono y etiqueta para la UI.
// Esto conecta el modelo de datos con la presentación visual.
const statConfig: { key: keyof MimeStats; label: string; icon: string }[] = [
  { key: 'hambre', label: 'Hambre', icon: '🍖' },
  { key: 'higiene', label: 'Higiene', icon: '🛁' },
  { key: 'diversion', label: 'Diversión', icon: '🎮' },
  { key: 'carino', label: 'Cariño', icon: '💕' },
  { key: 'energia', label: 'Energía', icon: '⚡' },
  { key: 'apariencia', label: 'Apariencia', icon: '✨' },
]

// --- CONFIGURACIÓN DE LOS BOTONES ---
const actionConfig: { action: CareAction; label: string; icon: string }[] = [
  { action: 'alimentar', label: 'Alimentar', icon: '🍖' },
  { action: 'limpiar', label: 'Limpiar', icon: '🛁' },
  { action: 'jugar', label: 'Jugar', icon: '🎮' },
  { action: 'carino', label: 'Cariño', icon: '💕' },
  { action: 'descansar', label: 'Descansar', icon: '😴' },
  { action: 'vestir', label: 'Vestir', icon: '👔' },
]

// --- ACCIONES ---

/**
 * Ejecuta una acción de cuidado:
 *   1. Comprueba si hay puntos suficientes
 *   2. Resta los puntos
 *   3. Aplica el efecto a los stats (usando la función pura de MimeModel)
 *
 * applyCareAction() devuelve stats NUEVOS sin mutar los originales.
 * Al asignarlos a stats.value, Vue detecta el cambio y actualiza las barras.
 */
function handleAction(action: CareAction) {
  const cost = ACTION_COSTS[action]
  if (puntosMimes.value < cost) return

  puntosMimes.value -= cost
  stats.value = applyCareAction(stats.value, action)
}

// --- DECAY POR TIEMPO ---
// Cada 30 segundos, aplicamos un mini-decay para que se vea en la demo.
// En producción, el decay real lo hará Supabase con un cron cada hora.
let decayInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  decayInterval = setInterval(() => {
    // 0.5 horas de decay cada 30s (acelerado para la demo)
    stats.value = applyDecay(stats.value, personality.value, 0.5)
  }, 30000)
})

onUnmounted(() => {
  if (decayInterval) clearInterval(decayInterval)
})

// --- SELECTOR DE PERSONALIDAD (para probar) ---
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
    <!-- CABECERA -->
    <header class="care-header">
      <button class="back-btn" @click="$router.push('/')">&#8592;</button>
      <h1 class="mime-name">{{ mimeName }}</h1>
      <div class="puntos">
        <span class="puntos-icon">&#9829;</span>
        <span class="puntos-value">{{ puntosMimes }} PM</span>
      </div>
    </header>

    <!-- SELECTOR DE PERSONALIDAD (temporal, para probar) -->
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

    <!-- MIME VISUAL -->
    <div class="mime-area">
      <MimeCharacter
        :personality="personality"
        :color-theme="colorTheme"
        :mood="mood"
      />
    </div>

    <!-- HUMOR ACTUAL -->
    <div class="mood-indicator">
      {{ mood || 'normal' }}
    </div>

    <!-- STATS -->
    <div class="stats-panel">
      <StatBar
        v-for="s in statConfig"
        :key="s.key"
        :label="s.label"
        :value="stats[s.key]"
        :icon="s.icon"
      />
    </div>

    <!-- ACCIONES DE CUIDADO -->
    <div class="actions-panel">
      <ActionButton
        v-for="a in actionConfig"
        :key="a.action"
        :label="a.label"
        :icon="a.icon"
        :cost="ACTION_COSTS[a.action]"
        :disabled="puntosMimes < ACTION_COSTS[a.action]"
        @action="handleAction(a.action)"
      />
    </div>
  </div>
</template>

<style scoped>
.care-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 12px 16px 24px;
  max-width: 420px;
  margin: 0 auto;
}

/* Cabecera */
.care-header {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  margin-bottom: 8px;
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
  font-size: 22px;
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
  font-size: 16px;
}

.puntos-value {
  font-size: 14px;
  font-weight: 700;
  color: #e65100;
}

/* Selector de personalidad (temporal) */
.personality-selector {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.personality-btn {
  padding: 4px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Baloo 2', cursive;
  transition: all 0.2s;
}

.personality-btn.active {
  background: #5c6bc0;
  color: white;
  border-color: #5c6bc0;
}

/* Mime visual */
.mime-area {
  margin: 4px 0;
}

/* Humor */
.mood-indicator {
  font-size: 13px;
  font-weight: 700;
  color: #5c6bc0;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

/* Panel de stats */
.stats-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 14px 16px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

/* Panel de acciones */
.actions-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}
</style>
