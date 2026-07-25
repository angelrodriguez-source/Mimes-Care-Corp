<script setup lang="ts">
/**
 * MessageHistory — Historial de mensajes de un Mime
 *
 * Modal overlay que muestra la conversacion completa de un Mime en formato
 * chat: burbujas cronologicas (lo mas reciente abajo), fecha relativa
 * amigable y checks de lectura estilo mensajeria (un check gris al enviar,
 * doble check azul cuando `read` es true).
 *
 * Los mensajes del dueno (sender_type 'dueno') van alineados a la izquierda
 * con la etiqueta "Dueno dice:"; los del Mime, a la derecha.
 *
 * La carga se hace via mimeService.fetchMessageHistory() — este componente
 * nunca llama a Supabase directamente.
 */
import { nextTick, onMounted, ref } from 'vue'
import { fetchMessageHistory, type MimeMessage } from '../services/mimeService'
import { formatRelativeDate } from '../utils/helpers'

interface Props {
  mimeId: string
  mimeNombre: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
}>()

const loading = ref(true)
const messages = ref<MimeMessage[]>([])
const listEl = ref<HTMLDivElement | null>(null)

/** Baja el scroll de la lista hasta el ultimo mensaje */
async function scrollToBottom() {
  await nextTick()
  if (listEl.value) {
    listEl.value.scrollTop = listEl.value.scrollHeight
  }
}

onMounted(async () => {
  try {
    const historial = await fetchMessageHistory(props.mimeId, 50)
    // Orden cronologico ascendente: el mas reciente queda abajo, como un chat
    messages.value = [...historial].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  } finally {
    loading.value = false
  }
  await scrollToBottom()
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <h3>📜 Mensajes de {{ mimeNombre }}</h3>

      <!-- Estado de carga -->
      <p v-if="loading" class="state-hint">Cargando...</p>

      <!-- Estado vacio -->
      <p v-else-if="messages.length === 0" class="state-hint">
        Aun no hay mensajes — el dueno puede dejarlos desde su tarjeta
      </p>

      <!-- Lista de burbujas (scroll interno, mas reciente abajo) -->
      <div v-else ref="listEl" class="message-list">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="bubble-row"
          :class="msg.sender_type === 'dueno' ? 'from-dueno' : 'from-mime'"
        >
          <div class="bubble">
            <span v-if="msg.sender_type === 'dueno'" class="bubble-label">
              Dueno dice:
            </span>
            <p class="bubble-text">{{ msg.content }}</p>
            <span class="bubble-meta">
              {{ formatRelativeDate(msg.created_at) }}
              <!-- Un check gris al enviar; doble check azul cuando esta leido -->
              <span class="check" :class="{ 'check-read': msg.read }">
                {{ msg.read ? '✓✓' : '✓' }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Acciones -->
      <div class="actions">
        <button class="btn-primary" @click="emit('close')">Cerrar</button>
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
  max-width: 380px;
  display: flex;
  flex-direction: column;
}

.modal-card h3 {
  font-size: 20px;
  color: #333;
  margin: 0 0 14px;
  text-align: center;
}

/* Estados de carga / vacio */
.state-hint {
  font-size: 13px;
  color: #999;
  text-align: center;
  margin: 24px 8px;
}

/* Lista con scroll interno */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px 2px;
  margin-bottom: 8px;
}

/* Fila de burbuja: alineacion segun quien envia */
.bubble-row {
  display: flex;
}

.bubble-row.from-dueno {
  justify-content: flex-start;
}

.bubble-row.from-mime {
  justify-content: flex-end;
}

.bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
}

.from-dueno .bubble {
  background: #f5f5f5;
  border-bottom-left-radius: 4px;
}

.from-mime .bubble {
  background: #e8eaf6;
  border-bottom-right-radius: 4px;
}

.bubble-label {
  font-size: 11px;
  font-weight: 700;
  color: #5c6bc0;
  margin-bottom: 2px;
}

.bubble-text {
  font-size: 14px;
  color: #333;
  margin: 0;
  overflow-wrap: break-word;
}

.bubble-meta {
  font-size: 11px;
  color: #bbb;
  align-self: flex-end;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.check {
  color: #bbb;
  letter-spacing: -2px;
}

.check-read {
  color: #5c6bc0;
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

.btn-primary:active {
  background: #3f51b5;
}
</style>
