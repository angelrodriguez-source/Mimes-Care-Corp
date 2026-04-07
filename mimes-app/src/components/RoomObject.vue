<script setup lang="ts">
/**
 * RoomObject.vue — Objeto interactivo dentro de la habitacion
 *
 * Muestra un emoji posicionado absolutamente en la habitacion.
 * Si tiene accion asociada, es clickable y emite 'interact'.
 */
import type { CareAction } from '../models/MimeModel'

const props = defineProps<{
  emoji: string
  label: string
  x: number
  y: number
  size: number
  action?: CareAction
}>()

defineEmits<{
  interact: [action: CareAction]
}>()
</script>

<template>
  <div
    class="room-object"
    :class="{ interactive: !!action }"
    :style="{
      left: x + '%',
      bottom: y + '%',
      fontSize: size + 'px',
    }"
    :title="label"
    @click="action && $emit('interact', action)"
  >
    <span class="object-emoji">{{ emoji }}</span>
    <span v-if="action" class="object-hint">{{ label }}</span>
  </div>
</template>

<style scoped>
.room-object {
  position: absolute;
  transform: translateX(-50%);
  z-index: 5;
  user-select: none;
  transition: transform 0.2s ease;
}

.room-object.interactive {
  cursor: pointer;
}

.room-object.interactive:active {
  transform: translateX(-50%) scale(1.2);
}

.object-emoji {
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  line-height: 1;
}

.object-hint {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
  margin-bottom: 4px;
}

.room-object.interactive:hover .object-hint,
.room-object.interactive:active .object-hint {
  display: block;
}
</style>
