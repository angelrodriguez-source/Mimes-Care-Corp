<script setup lang="ts">
/**
 * StatBar.vue — Barra visual de una estadística del Mime.
 *
 * Muestra el nombre del stat, una barra que se llena proporcionalmente
 * al valor (0-100), y cambia de color según el nivel:
 *   - Verde (>60): todo bien
 *   - Amarillo (30-60): cuidado
 *   - Rojo (<30): crítico
 *
 * Uso:
 *   <StatBar label="Hambre" :value="70" icon="🍖" />
 */
import { computed } from 'vue'

const props = defineProps<{
  label: string   // Nombre visible del stat ("Hambre", "Higiene", etc.)
  value: number   // Valor actual (0-100)
  icon: string    // Emoji que representa la acción
}>()

// Color de la barra según el nivel
const barColor = computed(() => {
  if (props.value >= 60) return '#4caf50'  // verde
  if (props.value >= 30) return '#ff9800'  // naranja/amarillo
  return '#f44336'                          // rojo
})

// Ancho de la barra como porcentaje
const barWidth = computed(() => `${props.value}%`)
</script>

<template>
  <!--
    La barra tiene 3 capas:
    1. .stat-bar (fondo gris = la barra vacía)
    2. .stat-bar-fill (fondo de color = la parte llena)
    3. El texto (icono + label + número)
  -->
  <div class="stat-row">
    <span class="stat-icon">{{ icon }}</span>
    <div class="stat-info">
      <div class="stat-header">
        <span class="stat-label">{{ label }}</span>
        <span class="stat-value">{{ value }}</span>
      </div>
      <div class="stat-bar">
        <div
          class="stat-bar-fill"
          :style="{ width: barWidth, backgroundColor: barColor }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  font-size: 20px;
  width: 28px;
  text-align: center;
}

.stat-info {
  flex: 1;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.stat-bar {
  width: 100%;
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease, background-color 0.5s ease;
}
</style>
