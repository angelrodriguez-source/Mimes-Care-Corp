<script setup lang="ts">
/**
 * PmHistoryModal.vue — Historial de Puntos Mimes.
 *
 * Se abre al tocar el badge de PM. Muestra el saldo actual, un resumen
 * de ganado/gastado y la lista de movimientos con su origen.
 *
 * Los datos vienen del libro mayor `pm_ledger` (migracion v12), que
 * escriben unicamente los RPCs — el cliente solo lee lo suyo.
 */
import { ref, computed, onMounted } from 'vue'
import { fetchPmHistory, type PmEntry, type PmReason } from '../services/mimeService'
import { ACTION_CONFIG } from '../constants/gameConstants'
import { formatRelativeDate } from '../utils/helpers'
import type { CareAction } from '../models/MimeModel'

const props = defineProps<{
  /** Saldo actual, para la cabecera */
  balance: number
}>()

const emit = defineEmits<{ close: [] }>()

const entries = ref<PmEntry[]>([])
const loading = ref(true)

// Resumen de lo que se ve en la lista
const totalGanado = computed(() =>
  entries.value.reduce((sum, e) => (e.delta > 0 ? sum + e.delta : sum), 0),
)
const totalGastado = computed(() =>
  entries.value.reduce((sum, e) => (e.delta < 0 ? sum - e.delta : sum), 0),
)

/** Etiqueta e icono de cada categoria de movimiento */
const REASON_META: Record<PmReason, { icon: string; label: string }> = {
  diaria: { icon: '🎁', label: 'Recompensa diaria' },
  cesion: { icon: '🤝', label: 'Cesion completada' },
  video: { icon: '🎬', label: 'Bonus de video' },
  accion: { icon: '🎮', label: 'Cuidado' },
  tienda: { icon: '🛍️', label: 'Compra en la tienda' },
  truco: { icon: '🤫', label: 'Truco secreto' },
  ajuste: { icon: '⚙️', label: 'Ajuste' },
}

/**
 * Describe un movimiento. Para las acciones de cuidado el detalle es el
 * nombre de la accion, asi que se usa su icono y etiqueta reales.
 */
function describe(entry: PmEntry): { icon: string; label: string } {
  const meta = REASON_META[entry.reason] ?? REASON_META.ajuste

  if (entry.reason === 'accion' && entry.detail) {
    const accion = ACTION_CONFIG.find(a => a.action === (entry.detail as CareAction))
    if (accion) return { icon: accion.icon, label: accion.label }
  }
  return meta
}

/** Texto secundario: el detalle, salvo cuando ya es el titulo (acciones) */
function subtitle(entry: PmEntry): string {
  if (entry.reason === 'accion') return REASON_META.accion.label
  return entry.detail ?? ''
}

onMounted(async () => {
  entries.value = await fetchPmHistory(40)
  loading.value = false
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <h3>&#9829; Tus Puntos Mimes</h3>
      <p class="balance">{{ props.balance }} PM</p>

      <div v-if="!loading && entries.length" class="summary">
        <span class="chip chip-in">+{{ totalGanado }} ganados</span>
        <span class="chip chip-out">-{{ totalGastado }} gastados</span>
      </div>

      <!-- CARGANDO -->
      <p v-if="loading" class="state-text">Cargando historial...</p>

      <!-- VACIO -->
      <p v-else-if="!entries.length" class="state-text">
        Aun no hay movimientos registrados.<br />
        <span class="state-hint">
          El historial empieza ahora: los PM que ya tenias no dejaron registro.
        </span>
      </p>

      <!-- LISTA DE MOVIMIENTOS -->
      <ul v-else class="entry-list">
        <li v-for="entry in entries" :key="entry.id" class="entry">
          <span class="entry-icon">{{ describe(entry).icon }}</span>
          <span class="entry-text">
            <span class="entry-label">{{ describe(entry).label }}</span>
            <span class="entry-meta">
              {{ formatRelativeDate(entry.created_at) }}
              <template v-if="subtitle(entry)"> · {{ subtitle(entry) }}</template>
            </span>
          </span>
          <span class="entry-delta" :class="entry.delta > 0 ? 'positivo' : 'negativo'">
            {{ entry.delta > 0 ? '+' : '' }}{{ entry.delta }}
          </span>
        </li>
      </ul>

      <button class="modal-close" @click="emit('close')">Cerrar</button>
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
  font-family: 'Baloo 2', cursive;
}

.modal-card {
  background: white;
  border-radius: 20px;
  padding: 22px 20px 18px;
  width: 100%;
  max-width: 360px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.modal-card h3 {
  font-size: 17px;
  color: #333;
  margin: 0;
}

.balance {
  font-size: 30px;
  font-weight: 700;
  color: #e65100;
  margin: 2px 0 10px;
}

/* Resumen */
.summary {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 12px;
}

.chip {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.chip-in { background: #e8f5e9; color: #2e7d32; }
.chip-out { background: #ffebee; color: #c62828; }

/* Estados */
.state-text {
  font-size: 13px;
  color: #999;
  margin: 16px 0;
  line-height: 1.5;
}

.state-hint { font-size: 11px; color: #bbb; }

/* Lista */
.entry-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  max-height: 52vh;
  overflow-y: auto;
  text-align: left;
}

.entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
}

.entry:last-child { border-bottom: none; }

.entry-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.entry-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.entry-label {
  font-size: 13px;
  font-weight: 700;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-meta {
  font-size: 10px;
  color: #aaa;
}

.entry-delta {
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.positivo { color: #2e7d32; }
.negativo { color: #c62828; }

.modal-close {
  padding: 10px 32px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  align-self: center;
}

.modal-close:active { background: #3f51b5; }
</style>
