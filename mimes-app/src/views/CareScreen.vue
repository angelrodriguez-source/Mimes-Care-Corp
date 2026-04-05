<script setup lang="ts">
/**
 * CareScreen.vue — Pantalla de cuidado conectada a Supabase
 *
 * Carga un Mime por ID desde la URL, permite cuidarlo con acciones
 * que se guardan en la base de datos. El Mime se mueve por la habitacion.
 */
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MimeCharacter from '../components/MimeCharacter.vue'
import StatBar from '../components/StatBar.vue'
import { supabase } from '../services/supabase'
import { useUserStore } from '../stores/userStore'
import {
  type MimeStats,
  type Personality,
  type ColorTheme,
  type CareAction,
  type Mood,
  deriveMood,
  applyCareAction,
  updateAffinity,
  getStatsAverage,
  ACTION_COSTS,
} from '../models/MimeModel'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const mimeCharRef = useTemplateRef<InstanceType<typeof MimeCharacter>>('mimeChar')

// --- DATOS DEL MIME ---
const mimeId = ref('')
const mimeName = ref('Cargando...')
const personality = ref<Personality>('aventurero')
const colorTheme = ref<ColorTheme>('celeste')
const stats = ref<MimeStats>({ hambre: 70, higiene: 70, diversion: 70, carino: 70, energia: 70, apariencia: 70 })
const puntosMimes = ref(0)
const afinidad = ref(0)
const loading = ref(true)
const error = ref('')

const mood = computed<Mood>(() => deriveMood(stats.value))
const statsAvg = computed(() => Math.round(getStatsAverage(stats.value)))

const moodLabel = computed(() => {
  const labels: Record<string, string> = {
    euforico: 'Euforico', feliz: 'Feliz', '': 'Normal',
    triste: 'Triste', dormido: 'Dormido', hambriento: 'Hambriento',
  }
  return labels[mood.value] ?? 'Normal'
})

// --- UI STATE ---
const showStats = ref(false)
const actionFeedback = ref('')

// --- MIME MOVEMENT ---
const mimeX = ref(50) // posicion X en porcentaje (0-100)
const mimeDirection = ref(1) // 1 = derecha, -1 = izquierda
const isWalking = ref(false)
let walkInterval: ReturnType<typeof setInterval> | null = null

function startWalking() {
  if (walkInterval) return
  walkInterval = setInterval(() => {
    // 30% chance de cambiar de direccion
    if (Math.random() < 0.03) {
      mimeDirection.value *= -1
    }
    // 60% chance de caminar, 40% de quedarse quieto
    if (Math.random() < 0.6) {
      isWalking.value = true
      const step = 0.5 * mimeDirection.value
      const newX = mimeX.value + step
      // Mantener dentro de la habitacion (20% - 80%)
      if (newX < 20) { mimeDirection.value = 1; mimeX.value = 20 }
      else if (newX > 80) { mimeDirection.value = -1; mimeX.value = 80 }
      else { mimeX.value = newX }
    } else {
      isWalking.value = false
    }
  }, 100)
}

function stopWalking() {
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null }
  isWalking.value = false
}

// --- STATS CONFIG ---
const statConfig: { key: keyof MimeStats; label: string; icon: string }[] = [
  { key: 'hambre', label: 'Hambre', icon: '🍖' },
  { key: 'higiene', label: 'Higiene', icon: '🛁' },
  { key: 'diversion', label: 'Diversion', icon: '🎮' },
  { key: 'carino', label: 'Carino', icon: '💕' },
  { key: 'energia', label: 'Energia', icon: '⚡' },
  { key: 'apariencia', label: 'Apariencia', icon: '✨' },
]

const actionConfig: { action: CareAction; label: string; icon: string }[] = [
  { action: 'alimentar', label: 'Alimentar', icon: '🍖' },
  { action: 'limpiar', label: 'Limpiar', icon: '🛁' },
  { action: 'jugar', label: 'Jugar', icon: '🎮' },
  { action: 'carino', label: 'Carino', icon: '💕' },
  { action: 'descansar', label: 'Descansar', icon: '😴' },
  { action: 'vestir', label: 'Vestir', icon: '👔' },
]

// --- CARGAR MIME ---
async function loadMime() {
  loading.value = true
  const id = route.params.id as string
  mimeId.value = id

  const { data: mime, error: err } = await supabase
    .from('mimes')
    .select('*')
    .eq('id', id)
    .single()

  if (err || !mime) {
    error.value = 'No se pudo cargar este Mime'
    loading.value = false
    return
  }

  mimeName.value = mime.nombre
  personality.value = mime.personalidad
  colorTheme.value = mime.color_theme
  afinidad.value = mime.afinidad
  stats.value = {
    hambre: mime.hambre, higiene: mime.higiene, diversion: mime.diversion,
    carino: mime.carino, energia: mime.energia, apariencia: mime.apariencia,
  }

  // Cargar puntos del usuario
  puntosMimes.value = userStore.profile?.puntos_mimes ?? 0

  loading.value = false
  startWalking()
}

// --- EJECUTAR ACCION ---
async function handleAction(action: CareAction) {
  const cost = ACTION_COSTS[action]
  if (puntosMimes.value < cost) return

  // Aplicar localmente (respuesta inmediata)
  const newStats = applyCareAction(stats.value, action)
  stats.value = newStats
  puntosMimes.value -= cost
  afinidad.value = updateAffinity(afinidad.value, newStats)

  // Feedback visual
  actionFeedback.value = actionConfig.find(a => a.action === action)?.icon ?? ''
  setTimeout(() => actionFeedback.value = '', 800)

  // Kiss burst on carino
  if (action === 'carino') {
    mimeCharRef.value?.showKissBurst()
  }

  // Descansar: detener movimiento temporalmente
  if (action === 'descansar') {
    stopWalking()
    setTimeout(() => startWalking(), 5000)
  }

  // Guardar en Supabase (en background)
  await Promise.all([
    // Actualizar stats del Mime
    supabase
      .from('mimes')
      .update({
        hambre: newStats.hambre,
        higiene: newStats.higiene,
        diversion: newStats.diversion,
        carino: newStats.carino,
        energia: newStats.energia,
        apariencia: newStats.apariencia,
        afinidad: afinidad.value,
      })
      .eq('id', mimeId.value),

    // Registrar accion en el log
    supabase
      .from('care_actions')
      .insert({
        mime_id: mimeId.value,
        cuidador_id: userStore.user!.id,
        action_type: action,
        puntos_cost: cost,
      }),

    // Actualizar puntos del usuario
    supabase
      .from('profiles')
      .update({ puntos_mimes: puntosMimes.value })
      .eq('id', userStore.user!.id),
  ])

  // Refrescar profile en el store
  userStore.fetchProfile()
}

function goBack() {
  router.push('/dashboard')
}

onMounted(loadMime)

onUnmounted(() => {
  stopWalking()
})
</script>

<template>
  <div class="care-screen">
    <!-- ERROR -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="goBack">Volver</button>
    </div>

    <!-- LOADING -->
    <div v-else-if="loading" class="loading-state">
      <p>Cargando Mime...</p>
    </div>

    <template v-else>
      <!-- CABECERA -->
      <header class="care-header">
        <button class="back-btn" @click="goBack">&#8592;</button>
        <h1 class="mime-name">{{ mimeName }}</h1>
        <div class="puntos">
          <span class="puntos-icon">&#9829;</span>
          <span class="puntos-value">{{ puntosMimes }}</span>
        </div>
      </header>

      <!-- HABITACION -->
      <div class="room">
        <div class="room-wall"></div>
        <div class="room-floor"></div>

        <!-- Mime con movimiento -->
        <div
          class="mime-area"
          :class="{ walking: isWalking }"
          :style="{
            left: mimeX + '%',
            transform: `translateX(-50%) scaleX(${mimeDirection})`,
          }"
        >
          <MimeCharacter
            ref="mimeChar"
            :personality="personality"
            :color-theme="colorTheme"
            :mood="mood"
          />
        </div>

        <!-- Action feedback (emoji flotante) -->
        <div v-if="actionFeedback" class="action-feedback">
          {{ actionFeedback }}
        </div>
      </div>

      <!-- RESUMEN DE ESTADO (vertical, lado derecho) -->
      <button class="status-summary" @click="showStats = !showStats">
        <div class="summary-item affinity">
          <span class="summary-icon">&#9829;</span>
          <span class="summary-value">{{ Math.round(afinidad) }}%</span>
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

      <!-- MENU ACCIONES (lateral izquierdo) -->
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

      <!-- PANEL DE STATS (drawer desde la derecha) -->
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

      <!-- Overlay para cerrar stats -->
      <div
        v-if="showStats"
        class="stats-overlay"
        @click="showStats = false"
      ></div>
    </template>
  </div>
</template>

<style scoped>
/* === LAYOUT GENERAL === */
.care-screen {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* === ESTADOS === */
.error-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
  color: #888;
}

.error-state button {
  padding: 10px 24px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
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

.puntos-icon { color: #ff7043; font-size: 14px; }
.puntos-value { font-size: 14px; font-weight: 700; color: #e65100; }

/* === HABITACION === */
.room {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.room-wall {
  flex: 1;
  background: linear-gradient(180deg, #e8eaf6 0%, #c5cae9 40%, #b39ddb 100%);
}

.room-floor {
  height: 35%;
  background: linear-gradient(180deg, #a1887f 0%, #8d6e63 30%, #795548 100%);
  border-top: 3px solid #6d4c41;
}

/* Mime con movimiento */
.mime-area {
  position: absolute;
  bottom: 30%;
  z-index: 10;
  transition: left 0.3s ease-out;
}

.mime-area.walking {
  animation: bobble 0.4s ease-in-out infinite;
}

@keyframes bobble {
  0%, 100% { transform: translateX(-50%) scaleX(var(--dir, 1)) translateY(0); }
  50% { transform: translateX(-50%) scaleX(var(--dir, 1)) translateY(-3px); }
}

/* Action feedback */
.action-feedback {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 48px;
  z-index: 50;
  animation: feedback-pop 0.8s ease-out forwards;
  pointer-events: none;
}

@keyframes feedback-pop {
  0% { opacity: 1; transform: translateX(-50%) scale(0.5) translateY(0); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.2) translateY(-20px); }
  100% { opacity: 0; transform: translateX(-50%) scale(1) translateY(-60px); }
}

/* === RESUMEN DE ESTADO === */
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
}

.summary-item { display: flex; flex-direction: column; align-items: center; }
.summary-icon { font-size: 14px; color: #ef5350; }
.summary-value { font-size: 13px; font-weight: 700; color: #333; line-height: 1.2; }
.summary-divider { width: 24px; height: 1px; background: #e0e0e0; }

.summary-arrow {
  font-size: 9px;
  color: #5c6bc0;
  transition: transform 0.3s ease;
  margin-top: 2px;
}

.summary-arrow.open { transform: rotate(180deg); }

/* === MENU ACCIONES === */
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
  backdrop-filter: blur(4px);
}

.action-fab:active:not(.disabled) {
  transform: scale(0.88);
  background: #e8eaf6;
}

.action-fab.disabled { opacity: 0.35; cursor: not-allowed; }
.fab-icon { font-size: 22px; line-height: 1; }
.fab-cost { font-size: 9px; font-weight: 700; color: #e65100; margin-top: -2px; }

/* === PANEL STATS === */
.stats-drawer {
  position: absolute;
  top: 0; bottom: 0; right: 0;
  width: 260px;
  background: white;
  border-radius: 20px 0 0 20px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.12);
  z-index: 40;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stats-drawer.open { transform: translateX(0); }

.stats-drawer-content {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-drawer-handle {
  position: absolute;
  left: 8px; top: 50%;
  transform: translateY(-50%);
  width: 4px; height: 40px;
  background: #e0e0e0;
  border-radius: 2px;
}

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
