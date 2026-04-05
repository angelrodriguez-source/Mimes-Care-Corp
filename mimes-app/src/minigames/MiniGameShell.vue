<script setup lang="ts">
/**
 * MiniGameShell.vue — Envoltorio de cualquier mini-juego.
 *
 * Flujo:
 *   1. Cuenta atrás (3, 2, 1, YA!)
 *   2. El juego se activa (slot default con active=true)
 *   3. Barra de tiempo baja
 *   4. El juego emite 'complete' o se acaba el tiempo
 *   5. Pantalla de resultado (éxito/fallo)
 *   6. Emite 'done' al padre
 *
 * El juego hijo solo tiene que:
 *   - Reaccionar a la prop 'active'
 *   - Llamar al slot-prop 'onComplete(success)' cuando termine
 */
import { ref, computed, onUnmounted } from 'vue'
import type { MiniGameConfig, MiniGameResult } from './types'

const props = defineProps<{
  config: MiniGameConfig
}>()

const emit = defineEmits<{
  done: [result: MiniGameResult]
}>()

// === ESTADOS DEL JUEGO ===
type GamePhase = 'countdown' | 'playing' | 'result'

const phase = ref<GamePhase>('countdown')
const countdownNumber = ref(3)
const gameActive = ref(false)
const timeLeft = ref(props.config.duration)
const result = ref<MiniGameResult | null>(null)

// Porcentaje de tiempo restante (para la barra)
const timePercent = computed(() => (timeLeft.value / props.config.duration) * 100)

// === CUENTA ATRÁS ===
let countdownTimer: ReturnType<typeof setInterval> | null = null
let gameTimer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  countdownNumber.value = 3
  phase.value = 'countdown'

  countdownTimer = setInterval(() => {
    countdownNumber.value--
    if (countdownNumber.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
      startGame()
    }
  }, 600)
}

// === JUEGO ===
function startGame() {
  phase.value = 'playing'
  gameActive.value = true
  timeLeft.value = props.config.duration

  const tick = 50 // actualizar cada 50ms para suavidad
  gameTimer = setInterval(() => {
    timeLeft.value -= tick
    if (timeLeft.value <= 0) {
      timeLeft.value = 0
      endGame(false)
    }
  }, tick)
}

function endGame(success: boolean) {
  if (phase.value !== 'playing') return // evitar doble-fin
  gameActive.value = false
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null }

  result.value = { success }
  phase.value = 'result'

  // Auto-cerrar después de 1.5s
  setTimeout(() => {
    emit('done', result.value!)
  }, 1500)
}

// Función que los juegos hijos llaman cuando ganan
function onGameComplete(success: boolean) {
  endGame(success)
}

// Arrancar la cuenta atrás al montar
startCountdown()

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (gameTimer) clearInterval(gameTimer)
})
</script>

<template>
  <div class="minigame-shell">
    <!-- CUENTA ATRÁS -->
    <div v-if="phase === 'countdown'" class="countdown-phase">
      <span class="countdown-icon">{{ config.icon }}</span>
      <h2 class="countdown-title">{{ config.title }}</h2>
      <p class="countdown-instruction">{{ config.instruction }}</p>
      <div class="countdown-number" :key="countdownNumber">
        {{ countdownNumber }}
      </div>
    </div>

    <!-- JUGANDO -->
    <div v-else-if="phase === 'playing'" class="playing-phase">
      <!-- Barra de tiempo -->
      <div class="timer-bar">
        <div
          class="timer-fill"
          :style="{ width: timePercent + '%' }"
          :class="{ warning: timePercent < 30 }"
        ></div>
      </div>

      <!-- Área del juego (slot) -->
      <div class="game-area">
        <slot :active="gameActive" :on-complete="onGameComplete" />
      </div>
    </div>

    <!-- RESULTADO -->
    <div v-else-if="phase === 'result'" class="result-phase">
      <div class="result-content" :class="result?.success ? 'win' : 'lose'">
        <span class="result-icon">{{ result?.success ? '🎉' : '😢' }}</span>
        <h2 class="result-title">{{ result?.success ? 'Bien hecho!' : 'Has fallado!' }}</h2>
        <p class="result-subtitle">
          {{ result?.success ? 'Stats mejorados' : 'Has gastado los PM' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.minigame-shell {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  font-family: 'Baloo 2', cursive;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

/* === CUENTA ATRÁS === */
.countdown-phase {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.countdown-icon {
  font-size: 48px;
  animation: bounce-in 0.4s ease-out;
}

.countdown-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.countdown-instruction {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.countdown-number {
  font-size: 80px;
  font-weight: 700;
  color: #ffd54f;
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-shadow: 0 4px 20px rgba(255, 213, 79, 0.4);
}

@keyframes pop-in {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* === JUGANDO === */
.playing-phase {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timer-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.timer-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.05s linear;
  border-radius: 0 3px 3px 0;
}

.timer-fill.warning {
  background: #f44336;
}

.game-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* === RESULTADO === */
.result-phase {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-content {
  text-align: center;
  animation: result-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.result-content.win { color: #4caf50; }
.result-content.lose { color: #f44336; }

.result-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 8px;
}

.result-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.result-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  margin: 4px 0 0;
}

@keyframes result-enter {
  0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
</style>
