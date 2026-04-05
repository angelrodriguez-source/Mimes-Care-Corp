<script setup lang="ts">
/**
 * ActionButton.vue — Botón de acción de cuidado.
 *
 * Muestra un botón con icono, nombre y coste en Puntos Mimes.
 * Se desactiva (disabled) si el usuario no tiene suficientes puntos.
 * Emite un evento 'action' cuando se pulsa.
 *
 * Uso:
 *   <ActionButton
 *     label="Alimentar"
 *     icon="🍖"
 *     :cost="5"
 *     :disabled="false"
 *     @action="handleFeed"
 *   />
 */

const props = defineProps<{
  label: string      // Nombre de la acción ("Alimentar", "Limpiar", etc.)
  icon: string       // Emoji del botón
  cost: number       // Coste en Puntos Mimes
  disabled: boolean  // true si no hay puntos suficientes
}>()

// defineEmits declara qué eventos puede "emitir" este componente al padre.
// Es el mecanismo de Vue para comunicación hijo → padre.
// El padre escucha con @action="handleSomething"
const emit = defineEmits<{
  action: []  // evento sin parámetros
}>()

function onClick() {
  if (!props.disabled) {
    emit('action')
  }
}
</script>

<template>
  <button
    class="action-btn"
    :class="{ disabled: disabled }"
    :disabled="disabled"
    @click="onClick"
  >
    <span class="action-icon">{{ icon }}</span>
    <span class="action-label">{{ label }}</span>
    <span class="action-cost">{{ cost }} PM</span>
  </button>
</template>

<style scoped>
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 8px;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: 'Baloo 2', cursive;
  min-width: 72px;
}

.action-btn:active:not(.disabled) {
  transform: scale(0.93);
  border-color: #5c6bc0;
  background: #e8eaf6;
}

.action-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-icon {
  font-size: 24px;
  line-height: 1;
}

.action-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}

.action-cost {
  font-size: 10px;
  color: #9e9e9e;
  font-weight: 500;
}
</style>
