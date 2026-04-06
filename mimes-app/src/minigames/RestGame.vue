<script setup lang="ts">
/**
 * RestGame.vue — Mini-juego de descansar
 *
 * Mecánica: el Mime duerme. El jugador NO debe tocar
 * la pantalla durante 5 segundos. Si toca, lo despierta
 * y pierde.
 *
 * Contrapartida a los demás juegos: requiere paciencia.
 */
import { ref, onMounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

const failed = ref(false)

// Bug fix: precalcular posiciones de estrellas (antes usaba Math.random() en template)
const starPositions = ref<{ left: string; top: string; delay: string }[]>([])

onMounted(() => {
  starPositions.value = Array.from({ length: 8 }, () => ({
    left: (10 + Math.random() * 80) + '%',
    top: (5 + Math.random() * 40) + '%',
    delay: (Math.random() * 2) + 's',
  }))
})

function handleTouch() {
  if (!props.active || failed.value) return
  failed.value = true
  props.onComplete(false)
}
</script>

<template>
  <div
    class="rest-game"
    :class="{ failed }"
    @touchstart.prevent="handleTouch"
    @mousedown="handleTouch"
  >
    <!-- Escena de descanso -->
    <div class="sleep-scene" v-if="!failed">
      <div class="moon">🌙</div>
      <div class="sleeping-emoji">😴</div>
      <div class="zzz-float">
        <span class="z z1">Z</span>
        <span class="z z2">z</span>
        <span class="z z3">Z</span>
      </div>
      <p class="rest-instruction">Shhh... no toques la pantalla</p>
      <div class="stars">
        <span v-for="(pos, i) in starPositions" :key="i" class="star" :style="{
          left: pos.left,
          top: pos.top,
          animationDelay: pos.delay,
        }">✨</span>
      </div>
    </div>

    <!-- Despierto (falló) -->
    <div class="wake-scene" v-else>
      <div class="wake-emoji">😱</div>
      <p class="wake-text">Lo has despertado!</p>
    </div>
  </div>
</template>

<style scoped>
.rest-game {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d1b2a 0%, #1b2838 50%, #2c3e50 100%);
  cursor: default;
}

.rest-game.failed {
  background: #1a1a2e;
}

.sleep-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: fade-in 0.5s ease;
}

.moon {
  font-size: 40px;
  position: absolute;
  top: 15%;
  right: 15%;
  animation: moon-glow 3s ease-in-out infinite;
}

@keyframes moon-glow {
  0%, 100% { filter: brightness(1); transform: scale(1); }
  50% { filter: brightness(1.2); transform: scale(1.05); }
}

.sleeping-emoji {
  font-size: 72px;
  animation: sleep-breathe 3s ease-in-out infinite;
}

@keyframes sleep-breathe {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-5px) scale(1.03); }
}

.zzz-float {
  position: relative;
  height: 60px;
  width: 60px;
}

.z {
  position: absolute;
  font-weight: 700;
  color: #7986cb;
  font-family: 'Baloo 2', cursive;
  animation: z-float 2.4s ease-in-out infinite;
}

.z1 { font-size: 18px; left: 0; animation-delay: 0s; }
.z2 { font-size: 24px; left: 20px; animation-delay: 0.8s; }
.z3 { font-size: 30px; left: 40px; animation-delay: 1.6s; }

@keyframes z-float {
  0% { opacity: 0; transform: translateY(0) rotate(-10deg); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-40px) rotate(15deg); }
}

.rest-instruction {
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  margin-top: 16px;
}

.stars .star {
  position: absolute;
  font-size: 12px;
  animation: twinkle 2s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.wake-scene {
  text-align: center;
  animation: shake 0.4s ease-in-out;
}

.wake-emoji { font-size: 72px; }
.wake-text { color: #f44336; font-size: 20px; font-weight: 700; margin-top: 8px; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
