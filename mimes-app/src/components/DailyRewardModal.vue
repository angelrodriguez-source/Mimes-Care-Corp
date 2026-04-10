<script setup lang="ts">
/**
 * DailyRewardModal — Modal de recompensa diaria por login
 *
 * Se muestra una vez al dia al entrar al dashboard. Tiene dos fases:
 *   - 'offer':   el usuario aun no ha reclamado; se muestra el preview
 *                de la recompensa y los botones "Reclamar" / "Mas tarde".
 *   - 'claimed': tras reclamar, mensaje de celebracion y boton "Cerrar".
 *
 * El padre (DashboardView) se encarga de calcular el streak/reward preview,
 * llamar al RPC via mimeService.claimDailyReward() y alternar la fase.
 */

interface Props {
  streakPreview: number       // 1..7 — dia al que saltaria la racha
  rewardPreview: number       // PM a otorgar
  phase: 'offer' | 'claimed'
  loading: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'claim'): void
  (e: 'close'): void
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <h3>{{ phase === 'claimed' ? '\u00a1Reclamado!' : 'Recompensa diaria' }}</h3>
      <p class="modal-desc">Dia {{ streakPreview }} de 7</p>

      <!-- Tracker visual de la racha -->
      <div class="streak-track">
        <div
          v-for="n in 7"
          :key="n"
          class="streak-dot"
          :class="{ filled: n <= streakPreview }"
        >
          {{ n }}
        </div>
      </div>

      <!-- Monto destacado -->
      <div class="reward-amount">
        <span class="reward-plus">+</span>
        <span class="reward-number">{{ rewardPreview }}</span>
        <span class="reward-unit">PM</span>
      </div>

      <p v-if="phase === 'offer'" class="modal-hint">
        Vuelve cada dia para aumentar tu racha y ganar mas puntos.
      </p>
      <p v-else class="modal-hint success-hint">
        &iexcl;Sigue as&iacute; ma&ntilde;ana para mantener la racha!
      </p>

      <!-- Acciones -->
      <div class="actions">
        <template v-if="phase === 'offer'">
          <button class="btn-secondary" :disabled="loading" @click="emit('close')">
            Mas tarde
          </button>
          <button class="btn-primary" :disabled="loading" @click="emit('claim')">
            {{ loading ? '...' : 'Reclamar' }}
          </button>
        </template>
        <template v-else>
          <button class="btn-primary" @click="emit('close')">Cerrar</button>
        </template>
      </div>
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

/* Tracker de racha */
.streak-track {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  margin: 16px 4px;
}

.streak-dot {
  flex: 1;
  aspect-ratio: 1;
  max-width: 36px;
  border-radius: 50%;
  background: #eee;
  color: #bbb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border: 2px solid transparent;
}

.streak-dot.filled {
  background: #fff3e0;
  color: #e65100;
  border-color: #ffcc80;
}

/* Monto destacado */
.reward-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin: 16px 0 8px;
  color: #e65100;
}

.reward-plus {
  font-size: 28px;
  font-weight: 700;
}

.reward-number {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.reward-unit {
  font-size: 18px;
  font-weight: 700;
  margin-left: 4px;
}

.modal-hint {
  font-size: 12px;
  color: #bbb;
  margin: 8px 0 16px;
}

.success-hint {
  color: #66bb6a;
}

/* Acciones */
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

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
