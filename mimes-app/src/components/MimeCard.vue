<script setup lang="ts">
/**
 * MimeCard.vue — Tarjeta compacta de un Mime para el dashboard.
 *
 * Muestra: avatar mini, nombre, mood, barra de salud general,
 * y quien lo cuida. Tiene slots para botones de accion.
 */
import { computed } from 'vue'
import MimeCharacter from './MimeCharacter.vue'
import { deriveMood, getStatsAverage } from '../models/MimeModel'
import type { Personality, ColorTheme, MimeStats } from '../models/MimeModel'

const props = defineProps<{
  id: string
  nombre: string
  personalidad: Personality
  colorTheme: ColorTheme
  stats: MimeStats
  afinidad: number
  cuidadorName?: string | null
  duenoName?: string | null
  mode: 'own' | 'caring' // own = tu Mime, caring = Mime que cuidas
}>()

defineEmits<{
  share: []
  care: []
  release: []
}>()

const mood = computed(() => deriveMood(props.stats))
const avgStats = computed(() => Math.round(getStatsAverage(props.stats)))

const moodLabel = computed(() => {
  const labels: Record<string, string> = {
    euforico: 'Euforico', feliz: 'Feliz', '': 'Normal',
    triste: 'Triste', dormido: 'Dormido', hambriento: 'Hambriento',
  }
  return labels[mood.value] ?? 'Normal'
})

const healthColor = computed(() => {
  if (avgStats.value >= 60) return '#4caf50'
  if (avgStats.value >= 30) return '#ff9800'
  return '#f44336'
})

const personalityLabel: Record<Personality, string> = {
  aventurero: 'Aventurero', tranquilo: 'Tranquilo', picaro: 'Picaro'
}
</script>

<template>
  <div class="mime-card" :class="[`border-${colorTheme}`]">
    <!-- Mini Mime avatar -->
    <div class="card-avatar">
      <MimeCharacter
        :personality="personalidad"
        :color-theme="colorTheme"
        :mood="mood"
        :scale="0.45"
      />
    </div>

    <!-- Info -->
    <div class="card-info">
      <h3 class="card-name">{{ nombre }}</h3>
      <span class="card-personality">{{ personalityLabel[personalidad] }}</span>

      <!-- Health bar -->
      <div class="card-health">
        <div class="health-bar">
          <div class="health-fill" :style="{ width: avgStats + '%', background: healthColor }"></div>
        </div>
        <span class="health-label">{{ moodLabel }}</span>
      </div>

      <!-- Cuidador / Dueno info -->
      <div class="card-meta" v-if="mode === 'own' && cuidadorName">
        <span class="meta-icon">&#128101;</span>
        <span>Cuidado por <strong>{{ cuidadorName }}</strong></span>
      </div>
      <div class="card-meta" v-if="mode === 'own' && !cuidadorName">
        <span class="meta-icon">&#128148;</span>
        <span>Sin cuidador</span>
      </div>
      <div class="card-meta" v-if="mode === 'caring' && duenoName">
        <span class="meta-icon">&#127968;</span>
        <span>De <strong>{{ duenoName }}</strong></span>
      </div>

      <!-- Afinidad -->
      <div class="card-affinity" v-if="afinidad > 0">
        <span class="affinity-heart">&#9829;</span>
        <span>{{ Math.round(afinidad) }}%</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      <button v-if="mode === 'own' && !cuidadorName" class="card-btn share-btn" @click="$emit('share')">
        Compartir
      </button>
      <button v-if="mode === 'caring'" class="card-btn care-btn" @click="$emit('care')">
        Cuidar
      </button>
      <button v-if="mode === 'caring'" class="card-btn release-btn" @click="$emit('release')">
        Soltar
      </button>
    </div>
  </div>
</template>

<style scoped>
.mime-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border-left: 4px solid #e0e0e0;
  transition: transform 0.2s, box-shadow 0.2s;
}

.mime-card:active {
  transform: scale(0.98);
}

.border-celeste { border-left-color: #1565c0; }
.border-lila { border-left-color: #6a1b9a; }
.border-melocoton { border-left-color: #e65100; }

.card-avatar {
  flex-shrink: 0;
  width: 70px;
  height: 85px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin: 0;
  line-height: 1.2;
}

.card-personality {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-health {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.health-bar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease, background 0.5s ease;
}

.health-label {
  font-size: 11px;
  font-weight: 700;
  color: #777;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: #888;
}

.meta-icon {
  font-size: 12px;
}

.card-affinity {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #ef5350;
}

.affinity-heart {
  font-size: 10px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.card-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.share-btn {
  background: #e3f2fd;
  color: #1565c0;
}
.share-btn:active { background: #bbdefb; }

.care-btn {
  background: #e8f5e9;
  color: #2e7d32;
}
.care-btn:active { background: #c8e6c9; }

.release-btn {
  background: #fce4ec;
  color: #c62828;
}
.release-btn:active { background: #f8bbd0; }
</style>
