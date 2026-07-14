<script setup lang="ts">
/**
 * CareScreen.vue — Pantalla de cuidado conectada a Supabase
 *
 * Carga un Mime por ID desde la URL, permite cuidarlo con acciones
 * que se guardan en la base de datos. El Mime se mueve por la habitacion.
 */
import { ref, computed, onMounted, onUnmounted, useTemplateRef, shallowRef, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MimeCharacter from '../components/MimeCharacter.vue'
import MimeRoom from '../components/MimeRoom.vue'
import StatBar from '../components/StatBar.vue'
import { MiniGameShell, ACTION_GAMES, GAME_CONFIGS, ACTION_GAMES_ADVANCED, GAME_CONFIGS_ADVANCED } from '../minigames'
import type { MiniGameResult, MiniGameConfig } from '../minigames'
import { useUserStore } from '../stores/userStore'
import { useCharacterMovement } from '../composables/useCharacterMovement'
import {
  fetchMimeById,
  resetMime,
  persistCareActionResult,
  addPoints,
  applyLazyDecay,
  getCesionDay,
  fetchUnreadMessages,
  markMessageRead,
  subscribeMimeMessages,
  getOwnedAccessories,
  equipAccessory,
  type MimeMessage,
} from '../services/mimeService'
import { toStats } from '../utils/helpers'
import {
  STAT_CONFIG,
  ACTION_CONFIG,
  getMoodLabel,
  INITIAL_PUNTOS,
  FEEDBACK_DURATION_MS,
  REST_PAUSE_DURATION_MS,
  ADVANCED_REWARD_MULTIPLIER,
  ADVANCED_AFFINITY_WEIGHT,
  getAccessory,
} from '../constants/gameConstants'
import { useSfx } from '../composables/useSfx'
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
  createInitialStats,
  ACTION_COSTS,
} from '../models/MimeModel'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Controles de debug (reset, crecimiento): solo visibles en desarrollo
const isDev = import.meta.env.DEV
const mimeCharRef = useTemplateRef<InstanceType<typeof MimeCharacter>>('mimeChar')

// --- DATOS DEL MIME ---
const mimeId = ref('')
const mimeName = ref('Cargando...')
const personality = ref<Personality>('aventurero')
const colorTheme = ref<ColorTheme>('celeste')
const stats = ref<MimeStats>(createInitialStats())
const puntosMimes = ref(0)
const afinidad = ref(0)
const loading = ref(true)
const error = ref('')
const mimeScale = ref(0.4) // Crecimiento: 0.4 (día 1) → 1.0 (día 6-7)

// --- COMPUTED ---
const mood = computed<Mood>(() => deriveMood(stats.value))
const statsAvg = computed(() => Math.round(getStatsAverage(stats.value)))
const moodLabel = computed(() => getMoodLabel(mood.value))

// --- UI STATE ---
const showStats = ref(false)
const actionFeedback = ref('')
const saveError = ref('')
let saveErrorTimer: ReturnType<typeof setTimeout> | null = null

/** Muestra un aviso temporal cuando falla el guardado en Supabase */
function showSaveError() {
  saveError.value = 'No se pudo guardar. Revisa tu conexion.'
  if (saveErrorTimer) clearTimeout(saveErrorTimer)
  saveErrorTimer = setTimeout(() => (saveError.value = ''), 4000)
}

// --- DIFFICULTY PICKER ---
const showDifficultyPicker = ref(false)
const pickerAction = ref<CareAction | null>(null)

// --- MINIGAME STATE ---
const activeGame = shallowRef<Component | null>(null)
const activeGameConfig = ref<MiniGameConfig | null>(null)
const pendingAction = ref<CareAction | null>(null)
const pendingDifficulty = ref<'easy' | 'advanced'>('easy')

// --- MIME MOVEMENT (composable) ---
const { mimeX, mimeDirection, isWalking, startWalking, stopWalking, pauseWalking } =
  useCharacterMovement()

// --- ACCESORIOS ---
const equippedAccessory = ref<string | null>(null)
const showAccessoryPicker = ref(false)
const myAccessories = ref<string[]>([])

const accessoryEmoji = computed(() => getAccessory(equippedAccessory.value)?.emoji ?? null)

async function openAccessoryPicker() {
  if (!userStore.user) return
  myAccessories.value = await getOwnedAccessories(userStore.user.id)
  showAccessoryPicker.value = true
}

async function handleEquip(accessoryId: string | null) {
  showAccessoryPicker.value = false
  if (accessoryId === equippedAccessory.value) return
  equippedAccessory.value = accessoryId
  playSfx('tap')
  const { error: eqErr } = await equipAccessory(mimeId.value, accessoryId)
  if (eqErr) showSaveError()
}

// --- MENSAJES DEL DUENO (el Mime los "dice" al cuidador) ---
const pendingMessages = ref<MimeMessage[]>([])
const currentMessage = computed(() => pendingMessages.value[0] ?? null)
let unsubscribeMessages: (() => void) | null = null

async function loadMessages() {
  // Solo el cuidador ve la burbuja (el dueno ya sabe lo que escribio)
  pendingMessages.value = await fetchUnreadMessages(mimeId.value)
}

/** Descartar la burbuja actual: marca leido y muestra el siguiente */
async function dismissMessage() {
  const msg = currentMessage.value
  if (!msg) return
  pendingMessages.value = pendingMessages.value.slice(1)
  await markMessageRead(msg.id)
}

// --- CARGAR MIME ---
async function loadMime() {
  loading.value = true
  const id = route.params.id as string
  mimeId.value = id

  const { mime, error: err } = await fetchMimeById(id)

  if (err || !mime) {
    error.value = 'No se pudo cargar este Mime'
    loading.value = false
    return
  }

  // Aplicar lazy decay antes de mostrar
  const decayed = await applyLazyDecay(mime)

  mimeName.value = decayed.nombre
  personality.value = decayed.personalidad
  colorTheme.value = decayed.color_theme
  afinidad.value = decayed.afinidad
  stats.value = toStats(decayed)
  puntosMimes.value = userStore.profile?.puntos_mimes ?? 0

  // Crecimiento segun dia de cesion: dia 1=40%, dia 2=50%... dia 6-7=100%
  const day = getCesionDay(decayed.cesion_start)
  mimeScale.value = Math.min(1.0, 0.3 + day * 0.1)

  equippedAccessory.value = decayed.accessory ?? null

  loading.value = false
  startWalking()

  // Mensajes del dueno: solo si soy el cuidador de este Mime
  if (decayed.cuidador_id && decayed.cuidador_id === userStore.user?.id) {
    loadMessages()
    unsubscribeMessages = subscribeMimeMessages(id, msg => {
      if (msg.sender_type === 'dueno' && !msg.read) {
        pendingMessages.value = [...pendingMessages.value, msg]
      }
    })
  }
}

const { play: playSfx } = useSfx()

// --- EJECUTAR ACCION (muestra selector de dificultad) ---
function handleAction(action: CareAction) {
  const cost = ACTION_COSTS[action]
  if (puntosMimes.value < cost) return

  playSfx('tap')

  // Mostrar selector de dificultad
  pickerAction.value = action
  showDifficultyPicker.value = true
}

function selectDifficulty(difficulty: 'easy' | 'advanced') {
  const action = pickerAction.value!
  const cost = ACTION_COSTS[action]

  // Cerrar picker
  showDifficultyPicker.value = false
  pickerAction.value = null

  // Cobrar PM al empezar (se pierden gane o pierda)
  puntosMimes.value -= cost
  pendingAction.value = action
  pendingDifficulty.value = difficulty

  // Lanzar mini-juego segun dificultad
  if (difficulty === 'advanced' && ACTION_GAMES_ADVANCED[action]) {
    activeGame.value = ACTION_GAMES_ADVANCED[action]!
    activeGameConfig.value = GAME_CONFIGS_ADVANCED[action]!
  } else {
    activeGame.value = ACTION_GAMES[action]
    activeGameConfig.value = GAME_CONFIGS[action]
  }
}

function closePicker() {
  showDifficultyPicker.value = false
  pickerAction.value = null
}

// --- RESULTADO DEL MINI-JUEGO ---
async function onMiniGameDone(result: MiniGameResult) {
  const action = pendingAction.value!
  const cost = ACTION_COSTS[action]

  // Cerrar mini-juego
  activeGame.value = null
  activeGameConfig.value = null
  pendingAction.value = null

  if (result.success) {
    applySuccessEffects(action)
    const { error: saveErr } = await persistCareActionResult(
      mimeId.value,
      userStore.user!.id,
      action,
      cost,
      stats.value,
      afinidad.value,
    )
    if (saveErr) showSaveError()
  } else {
    // Perder tambien cuesta los PM: cobro atomico del coste
    const { error: pointsErr } = await addPoints(userStore.user!.id, -cost)
    if (pointsErr) showSaveError()
  }

  userStore.fetchProfile()
}

/** Aplica los efectos de una accion exitosa en la UI */
function applySuccessEffects(action: CareAction) {
  // Ganar en avanzado sube mas los stats y la afinidad
  const advanced = pendingDifficulty.value === 'advanced'
  stats.value = applyCareAction(
    stats.value, action, advanced ? ADVANCED_REWARD_MULTIPLIER : 1)
  afinidad.value = updateAffinity(
    afinidad.value, stats.value, advanced ? ADVANCED_AFFINITY_WEIGHT : 0.1)

  // Feedback visual
  const icon = ACTION_CONFIG.find(a => a.action === action)?.icon ?? ''
  actionFeedback.value = icon
  setTimeout(() => (actionFeedback.value = ''), FEEDBACK_DURATION_MS)

  // Efectos especiales por accion
  if (action === 'carino') mimeCharRef.value?.showKissBurst()
  if (action === 'descansar') pauseWalking(REST_PAUSE_DURATION_MS)
}

function goBack() {
  router.push('/dashboard')
}

async function handleReset() {
  stats.value = createInitialStats()
  afinidad.value = 0
  puntosMimes.value = INITIAL_PUNTOS

  await resetMime(mimeId.value, userStore.user!.id)
  userStore.fetchProfile()
}

onMounted(loadMime)

onUnmounted(() => {
  if (saveErrorTimer) clearTimeout(saveErrorTimer)
  unsubscribeMessages?.()
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
        <button class="accessory-btn" title="Accesorios" @click="openAccessoryPicker">
          {{ accessoryEmoji ?? '🎀' }}
        </button>
        <template v-if="isDev">
          <button class="reset-care-btn" @click="handleReset">Reset</button>
          <button class="growth-debug-btn" @click="mimeScale = Math.max(0.4, +(mimeScale - 0.1).toFixed(1))">-</button>
          <span class="growth-label">{{ Math.round(mimeScale * 100) }}%</span>
          <button class="growth-debug-btn" @click="mimeScale = Math.min(1.0, +(mimeScale + 0.1).toFixed(1))">+</button>
        </template>
        <div class="puntos">
          <span class="puntos-icon">&#9829;</span>
          <span class="puntos-value">{{ puntosMimes }}</span>
        </div>
      </header>

      <!-- HABITACION -->
      <MimeRoom
        :personality="personality"
        @object-interact="handleAction"
      >
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
            :scale="mimeScale"
            :accessory="accessoryEmoji"
          />
        </div>

        <!-- Action feedback (emoji flotante) -->
        <div v-if="actionFeedback" class="action-feedback">
          {{ actionFeedback }}
        </div>

        <!-- Burbuja: mensaje del dueno que el Mime "dice" -->
        <button v-if="currentMessage" class="message-bubble" @click="dismissMessage">
          <span class="bubble-text">{{ currentMessage.content }}</span>
          <span class="bubble-hint">
            mensaje de su dueno · toca para cerrar
            <template v-if="pendingMessages.length > 1"> · +{{ pendingMessages.length - 1 }}</template>
          </span>
        </button>
      </MimeRoom>

      <!-- RESUMEN DE ESTADO (vertical, lado derecho) -->
      <button class="status-summary" data-tutorial="status-summary" @click="showStats = !showStats">
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
      <div class="actions-menu" data-tutorial="actions-menu">
        <button
          v-for="a in ACTION_CONFIG"
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
            v-for="s in STAT_CONFIG"
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

      <!-- Aviso de error de guardado -->
      <div v-if="saveError" class="save-toast" role="alert">
        {{ saveError }}
      </div>
    </template>

    <!-- SELECTOR DE DIFICULTAD -->
    <div v-if="showDifficultyPicker" class="picker-overlay" @click.self="closePicker">
      <div class="picker-card">
        <h3 class="picker-title">
          {{ ACTION_CONFIG.find(a => a.action === pickerAction)?.icon }}
          {{ ACTION_CONFIG.find(a => a.action === pickerAction)?.label }}
        </h3>
        <p class="picker-subtitle">Elige dificultad</p>
        <div class="picker-options">
          <button class="picker-btn easy" @click="selectDifficulty('easy')">
            <span class="picker-btn-icon">&#11088;</span>
            <span class="picker-btn-label">Facil</span>
            <span class="picker-btn-desc">Minijuego clasico</span>
          </button>
          <button class="picker-btn advanced" @click="selectDifficulty('advanced')">
            <span class="picker-btn-icon">&#128293;</span>
            <span class="picker-btn-label">Avanzado</span>
            <span class="picker-btn-desc">Recompensa x1.5</span>
          </button>
        </div>
        <button class="picker-cancel" @click="closePicker">Cancelar</button>
      </div>
    </div>

    <!-- SELECTOR DE ACCESORIO -->
    <div v-if="showAccessoryPicker" class="picker-overlay" @click.self="showAccessoryPicker = false">
      <div class="picker-card">
        <h3 class="picker-title">🎀 Accesorios</h3>
        <p class="picker-subtitle">
          {{ myAccessories.length ? 'Elige que lleva puesto' : 'Compra accesorios en la tienda del inicio' }}
        </p>
        <div class="accessory-options">
          <button
            class="accessory-option"
            :class="{ selected: !equippedAccessory }"
            @click="handleEquip(null)"
          >
            <span class="accessory-option-emoji">🚫</span>
            <span class="accessory-option-label">Nada</span>
          </button>
          <button
            v-for="id in myAccessories"
            :key="id"
            class="accessory-option"
            :class="{ selected: equippedAccessory === id }"
            @click="handleEquip(id)"
          >
            <span class="accessory-option-emoji">{{ getAccessory(id)?.emoji }}</span>
            <span class="accessory-option-label">{{ getAccessory(id)?.label }}</span>
          </button>
        </div>
        <button class="picker-cancel" @click="showAccessoryPicker = false">Cerrar</button>
      </div>
    </div>

    <!-- MINI-JUEGO OVERLAY -->
    <MiniGameShell
      v-if="activeGameConfig"
      :config="activeGameConfig"
      @done="onMiniGameDone"
      v-slot="{ active, onComplete }"
    >
      <component
        :is="activeGame!"
        :active="active"
        :on-complete="onComplete"
        :color-theme="colorTheme"
      />
    </MiniGameShell>
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

.reset-care-btn {
  padding: 4px 10px;
  background: #ffebee;
  color: #c62828;
  border: 1px dashed #ef9a9a;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  margin-right: 8px;
}

.reset-care-btn:active { background: #ffcdd2; }

.growth-debug-btn {
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1565c0;
  border: 1px dashed #90caf9;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}
.growth-debug-btn:active { background: #bbdefb; }
.growth-label {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  margin: 0 2px;
  font-family: 'Baloo 2', cursive;
}

.puntos-icon { color: #ff7043; font-size: 14px; }
.puntos-value { font-size: 14px; font-weight: 700; color: #e65100; }

.accessory-btn {
  background: #fce4ec;
  border: 1.5px solid #f8bbd0;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 16px;
  cursor: pointer;
  margin-right: 8px;
  line-height: 1.4;
}
.accessory-btn:active { background: #f8bbd0; }

/* === MIME EN LA HABITACION === */
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

/* === BURBUJA DE MENSAJE === */
.message-bubble {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  max-width: 78%;
  background: white;
  border: none;
  border-radius: 18px;
  padding: 12px 16px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
  z-index: 15;
  cursor: pointer;
  font-family: 'Baloo 2', cursive;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: bubble-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-align: center;
}

/* Colita de la burbuja */
.message-bubble::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-top: 9px solid white;
}

.bubble-text {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  line-height: 1.3;
  word-break: break-word;
}

.bubble-hint {
  font-size: 10px;
  color: #aaa;
}

@keyframes bubble-pop {
  from { opacity: 0; transform: translateX(-50%) scale(0.7); }
  to { opacity: 1; transform: translateX(-50%) scale(1); }
}

/* === TOAST DE ERROR DE GUARDADO === */
.save-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #c62828;
  color: white;
  padding: 10px 20px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  z-index: 60;
  box-shadow: 0 4px 16px rgba(198, 40, 40, 0.4);
  animation: fade-in 0.25s ease;
  white-space: nowrap;
}

/* === SELECTOR DE DIFICULTAD === */
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.2s ease;
  font-family: 'Baloo 2', cursive;
}

.picker-card {
  background: white;
  border-radius: 24px;
  padding: 28px 24px 20px;
  width: 300px;
  max-width: 90vw;
  text-align: center;
  animation: picker-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes picker-pop {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

.picker-title {
  font-size: 22px;
  font-weight: 700;
  color: #333;
  margin-bottom: 2px;
}

.picker-subtitle {
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
}

.picker-options {
  display: flex;
  gap: 12px;
}

.picker-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border: 2.5px solid #e0e0e0;
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Baloo 2', cursive;
}

.picker-btn:active {
  transform: scale(0.95);
}

.picker-btn.easy {
  border-color: #66bb6a;
  background: #e8f5e9;
}

.picker-btn.easy:active {
  background: #c8e6c9;
}

.picker-btn.advanced {
  border-color: #ff7043;
  background: #fff3e0;
}

.picker-btn.advanced:active {
  background: #ffe0b2;
}

.picker-btn-icon {
  font-size: 28px;
  line-height: 1;
}

.picker-btn-label {
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.picker-btn-desc {
  font-size: 11px;
  color: #999;
}

/* Selector de accesorio */
.accessory-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.accessory-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 72px;
  padding: 10px 4px;
  border: 2.5px solid #e0e0e0;
  border-radius: 14px;
  background: white;
  cursor: pointer;
  font-family: 'Baloo 2', cursive;
  transition: all 0.2s;
}

.accessory-option:active { transform: scale(0.94); }

.accessory-option.selected {
  border-color: #5c6bc0;
  background: #e8eaf6;
}

.accessory-option-emoji { font-size: 26px; line-height: 1.2; }
.accessory-option-label { font-size: 11px; font-weight: 700; color: #555; }

.picker-cancel {
  margin-top: 16px;
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.picker-btn-disabled {
  opacity: 0.4;
  cursor: not-allowed !important;
}

.picker-btn-disabled:active {
  transform: none;
}

.picker-cancel:active {
  color: #666;
}
</style>
