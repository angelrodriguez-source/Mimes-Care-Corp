<script setup lang="ts">
/**
 * VideoBonusModal — Modal de "ver video → ganar 5 PM"
 *
 * Placeholder de anuncio — cuando haya AdSense H5, la fase playing
 * se sustituye por adBreak({type:'reward'}).
 *
 * Tres fases internas:
 *   - 'offer':   oferta del bonus; botones "Ver video" / "Mas tarde".
 *   - 'playing': "video" placeholder de 15s (escena animada solo CSS).
 *                No se puede cerrar ni saltar. Al terminar → emit('claim').
 *   - 'done':    celebracion "+5 PM"; botones "Genial!" y "Ver otro"
 *                (este ultimo solo si quedan bonus tras el reclamado).
 *
 * El padre llama al RPC al recibir 'claim' y reproduce el sonido 'coin'
 * al confirmarlo (este componente no emite sonido).
 */
import { nextTick, onUnmounted, ref } from 'vue'

interface Props {
  remaining: number // bonus restantes hoy (0-3)
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'claim'): void
  (e: 'close'): void
}>()

/** Duracion del "video" placeholder */
const VIDEO_DURATION_MS = 15_000

const phase = ref<'offer' | 'playing' | 'done'>('offer')

/** Controla la transicion CSS de la barra de progreso (0% → 100%) */
const progressActive = ref(false)
const progressFill = ref<HTMLDivElement | null>(null)

/** Bonus que quedaran tras reclamar el actual — capturado al empezar el video */
const remainingAfter = ref(0)

/** Unico setTimeout del componente; se limpia en onUnmounted */
let timeoutId: number | null = null

function startVideo(): void {
  if (props.remaining <= 0) return

  // Capturamos cuantos quedaran despues de este reclamado
  remainingAfter.value = props.remaining - 1

  phase.value = 'playing'
  progressActive.value = false

  void nextTick(() => {
    // Forzar reflow para que la transicion arranque desde width: 0
    void progressFill.value?.offsetWidth
    progressActive.value = true
  })

  if (timeoutId !== null) window.clearTimeout(timeoutId)
  timeoutId = window.setTimeout(() => {
    timeoutId = null
    emit('claim')
    phase.value = 'done'
  }, VIDEO_DURATION_MS)
}

onUnmounted(() => {
  if (timeoutId !== null) window.clearTimeout(timeoutId)
})
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <!-- Fase 1: oferta -->
      <template v-if="phase === 'offer'">
        <h3>🎬 Bonus del dia</h3>
        <p class="modal-desc">
          Mira un video corto y gana +5 PM ({{ remaining }} restantes hoy)
        </p>

        <div class="actions">
          <button class="btn-secondary" @click="emit('close')">Mas tarde</button>
          <button class="btn-primary" :disabled="remaining === 0" @click="startVideo">
            {{ remaining === 0 ? 'Vuelve manana' : 'Ver video' }}
          </button>
        </div>
      </template>

      <!-- Fase 2: "video" placeholder (no se puede cerrar ni saltar) -->
      <template v-else-if="phase === 'playing'">
        <div class="video-frame">
          <span class="video-mascot">🐣</span>
          <span class="float-emoji float-1">💖</span>
          <span class="float-emoji float-2">⭐</span>
          <span class="float-emoji float-3">💛</span>
          <span class="float-emoji float-4">✨</span>
          <p class="video-caption">Tu Mime te agradece la paciencia ♥</p>

          <div class="progress-track">
            <div
              ref="progressFill"
              class="progress-fill"
              :class="{ active: progressActive }"
            ></div>
          </div>
        </div>
        <p class="modal-hint">Reproduciendo video...</p>
      </template>

      <!-- Fase 3: recompensa -->
      <template v-else>
        <div class="reward-pop">+5 PM 🎉</div>
        <p class="modal-hint success-hint">&iexcl;Bonus conseguido!</p>

        <div class="actions">
          <button
            v-if="remainingAfter > 0"
            class="btn-secondary"
            @click="startVideo"
          >
            Ver otro
          </button>
          <button class="btn-primary" @click="emit('close')">Genial!</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.modal-card h3 {
  font-size: 20px;
  color: #333;
  margin: 0 0 6px;
}

.modal-desc {
  font-size: 13px;
  color: #999;
  margin: 0 0 16px;
}

.modal-hint {
  font-size: 12px;
  color: #bbb;
  margin: 8px 0 16px;
}

.success-hint {
  color: #66bb6a;
}

/* ---- Fase playing: escena del "video" ---- */
.video-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
}

/* Mascota que rebota de lado a lado */
.video-mascot {
  position: absolute;
  top: 26%;
  left: 0;
  font-size: 44px;
  animation: mascot-bounce 3s ease-in-out infinite alternate;
}

@keyframes mascot-bounce {
  0% {
    transform: translateX(8px) translateY(0);
  }
  25% {
    transform: translateX(60px) translateY(-10px);
  }
  50% {
    transform: translateX(120px) translateY(0);
  }
  75% {
    transform: translateX(180px) translateY(-10px);
  }
  100% {
    transform: translateX(240px) translateY(0);
  }
}

/* Corazones y estrellas flotando */
.float-emoji {
  position: absolute;
  bottom: -24px;
  font-size: 18px;
  animation: float-up 4s linear infinite;
  opacity: 0;
}

.float-1 {
  left: 15%;
  animation-delay: 0s;
}

.float-2 {
  left: 40%;
  animation-delay: 1.2s;
}

.float-3 {
  left: 65%;
  animation-delay: 2.1s;
}

.float-4 {
  left: 85%;
  animation-delay: 3s;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    transform: translateY(-130px) scale(1.1);
    opacity: 0;
  }
}

.video-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

/* Barra de progreso inferior (se llena en 15s via transition) */
.progress-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  background: rgba(255, 255, 255, 0.15);
}

.progress-fill {
  width: 0;
  height: 100%;
  background: #ffca28;
  transition: width 15s linear;
}

.progress-fill.active {
  width: 100%;
}

/* ---- Fase done: celebracion ---- */
.reward-pop {
  font-size: 36px;
  font-weight: 700;
  color: #e65100;
  margin: 16px 0 8px;
  animation: reward-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes reward-pop {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ---- Acciones ---- */
.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-primary {
  flex: 1;
  padding: 12px 24px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.btn-primary:active:not(:disabled) {
  background: #3f51b5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  background: none;
  color: #999;
  border: 1.5px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
}

.btn-secondary:active:not(:disabled) {
  background: #f5f5f5;
}
</style>
