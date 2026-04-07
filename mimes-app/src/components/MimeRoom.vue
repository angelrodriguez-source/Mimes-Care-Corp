<script setup lang="ts">
/**
 * MimeRoom.vue — Habitacion tematica del Mime
 *
 * Renderiza la habitacion segun la personalidad del Mime:
 * - Colores de pared y suelo distintos por personalidad
 * - Objetos decorativos e interactivos
 * - Overlay de dia/noche segun hora real
 *
 * Es reutilizable: recibe personalidad y emite eventos de interaccion.
 * El contenido del Mime se pasa via slot default.
 */
import { computed } from 'vue'
import RoomObject from './RoomObject.vue'
import { useDayNight } from '../composables/useDayNight'
import { ROOM_THEMES } from '../constants/gameConstants'
import type { Personality, CareAction } from '../models/MimeModel'

const props = defineProps<{
  personality: Personality
}>()

const emit = defineEmits<{
  objectInteract: [action: CareAction]
}>()

const { phase, nightOverlay, skyTint } = useDayNight()

const theme = computed(() => ROOM_THEMES[props.personality])

const wallGradient = computed(() =>
  `linear-gradient(180deg, ${theme.value.wall.join(', ')})`
)

const floorGradient = computed(() =>
  `linear-gradient(180deg, ${theme.value.floor.join(', ')})`
)
</script>

<template>
  <div class="mime-room" :class="[`phase-${phase}`]">
    <!-- Pared -->
    <div class="room-wall" :style="{ background: wallGradient }"></div>

    <!-- Suelo -->
    <div class="room-floor" :style="{ background: floorGradient, borderTopColor: theme.floorBorder }"></div>

    <!-- Objetos de la habitacion -->
    <RoomObject
      v-for="obj in theme.objects"
      :key="obj.id"
      :emoji="obj.emoji"
      :label="obj.label"
      :x="obj.x"
      :y="obj.y"
      :size="obj.size"
      :action="obj.action"
      @interact="emit('objectInteract', $event)"
    />

    <!-- Slot para el Mime y otros elementos (feedback, etc.) -->
    <slot />

    <!-- Overlay dia/noche -->
    <div
      class="day-night-overlay"
      :style="{
        background: skyTint,
        opacity: nightOverlay > 0 ? 1 : 0,
      }"
    ></div>

    <!-- Overlay oscuridad nocturna -->
    <div
      v-if="nightOverlay > 0"
      class="night-darkness"
      :style="{ opacity: nightOverlay }"
    ></div>

    <!-- Indicador de fase (estrellas de noche, sol de dia) -->
    <div class="phase-indicator">
      <span v-if="phase === 'night'" class="stars">✦ ✧ ✦</span>
      <span v-else-if="phase === 'dawn'" class="dawn-icon">🌅</span>
      <span v-else-if="phase === 'dusk'" class="dusk-icon">🌇</span>
    </div>
  </div>
</template>

<style scoped>
.mime-room {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.room-wall {
  flex: 1;
  transition: background 2s ease;
}

.room-floor {
  height: 35%;
  border-top: 3px solid #6d4c41;
  transition: background 2s ease, border-top-color 2s ease;
}

/* --- DIA/NOCHE --- */

.day-night-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  transition: background 3s ease, opacity 3s ease;
}

.night-darkness {
  position: absolute;
  inset: 0;
  background: rgba(10, 10, 30, 1);
  pointer-events: none;
  z-index: 2;
  transition: opacity 3s ease;
}

/* --- INDICADOR DE FASE --- */

.phase-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  font-size: 14px;
  pointer-events: none;
}

.stars {
  color: #ffd54f;
  text-shadow: 0 0 6px rgba(255, 213, 79, 0.6);
  animation: twinkle 2s ease-in-out infinite alternate;
  letter-spacing: 4px;
}

@keyframes twinkle {
  0% { opacity: 0.6; }
  100% { opacity: 1; }
}

.dawn-icon, .dusk-icon {
  font-size: 18px;
  filter: drop-shadow(0 0 4px rgba(255, 183, 77, 0.5));
}
</style>
