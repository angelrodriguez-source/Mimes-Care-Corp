<script setup lang="ts">
/**
 * HomeView.vue — Mis Mimes
 *
 * Carga los Mimes del usuario desde Supabase y los muestra.
 * Si no hay usuario logueado (ruta /explore), muestra los de demo.
 *
 * onMounted() es un "lifecycle hook" de Vue: se ejecuta UNA VEZ
 * cuando el componente aparece en pantalla. Perfecto para cargar datos.
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import MimeCharacter from '../components/MimeCharacter.vue'
import { supabase } from '../services/supabase'
import { useUserStore } from '../stores/userStore'
import { deriveMood } from '../models/MimeModel'
import type { Personality, ColorTheme, MimeStats } from '../models/MimeModel'

// Tipo para los datos que vienen de Supabase
interface MimeFromDB {
  id: string
  nombre: string
  personalidad: Personality
  color_theme: ColorTheme
  hambre: number
  higiene: number
  diversion: number
  carino: number
  energia: number
  apariencia: number
  afinidad: number
}

const route = useRoute()
const userStore = useUserStore()

// Estado
const mimes = ref<MimeFromDB[]>([])
const loading = ref(true)
const error = ref('')

// ¿Estamos en modo explorar (sin login)?
const isExploreMode = computed(() => route.name === 'explore')

// Colores para las etiquetas según personalidad
const labelColors: Record<Personality, string> = {
  aventurero: '#1565c0',
  tranquilo: '#6a1b9a',
  picaro: '#e65100',
}

// Calcular el mood de un Mime a partir de sus stats
function getMood(mime: MimeFromDB) {
  const stats: MimeStats = {
    hambre: mime.hambre,
    higiene: mime.higiene,
    diversion: mime.diversion,
    carino: mime.carino,
    energia: mime.energia,
    apariencia: mime.apariencia,
  }
  return deriveMood(stats)
}

// Carga los Mimes del usuario desde Supabase
async function loadMimes() {
  loading.value = true
  error.value = ''

  const { data, error: dbError } = await supabase
    .from('mimes')
    .select('*')
    .order('created_at')

  if (dbError) {
    error.value = `Error cargando Mimes: ${dbError.message}`
  } else if (data) {
    mimes.value = data
  }

  loading.value = false
}

onMounted(() => {
  // Solo cargar de Supabase si está logueado (no en modo explore)
  if (!isExploreMode.value && userStore.isLoggedIn) {
    loadMimes()
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">
    <h1 class="page-title">Mimes Care Corp</h1>
    <p class="page-subtitle">
      {{ isExploreMode ? 'Preview de personalidades' : 'Mis Mimes' }}
    </p>

    <!-- Estado: cargando -->
    <p v-if="loading" class="status-text">Cargando tus Mimes...</p>

    <!-- Estado: error -->
    <p v-else-if="error" class="status-text error-text">{{ error }}</p>

    <!-- Modo EXPLORE: Mimes de demo (hardcoded) -->
    <template v-else-if="isExploreMode">
      <div class="mimes-row">
        <div class="mime-wrapper">
          <MimeCharacter personality="aventurero" color-theme="celeste" />
          <div class="mime-label" style="color: #1565c0">Aventurero</div>
        </div>
        <div class="mime-wrapper">
          <MimeCharacter personality="tranquilo" color-theme="lila" />
          <div class="mime-label" style="color: #6a1b9a">Tranquilo</div>
        </div>
        <div class="mime-wrapper">
          <MimeCharacter personality="picaro" color-theme="melocoton" />
          <div class="mime-label" style="color: #e65100">Picaro</div>
        </div>
      </div>
      <p class="hint">Toca un Mime para interactuar</p>
      <router-link to="/" class="care-link">
        Iniciar sesion &#8594;
      </router-link>
    </template>

    <!-- Modo LOGUEADO: Mimes reales de Supabase -->
    <template v-else-if="mimes.length > 0">
      <div class="mimes-row">
        <div v-for="mime in mimes" :key="mime.id" class="mime-wrapper">
          <MimeCharacter
            :personality="mime.personalidad"
            :color-theme="mime.color_theme"
            :mood="getMood(mime)"
          />
          <div class="mime-label" :style="{ color: labelColors[mime.personalidad] }">
            {{ mime.nombre }}
            <span class="mime-sublabel">{{ getMood(mime) || 'Normal' }}</span>
          </div>
        </div>
      </div>

      <p class="hint">Toca un Mime para interactuar</p>

      <router-link to="/care" class="care-link">
        Pantalla de cuidado &#8594;
      </router-link>
    </template>

    <!-- Sin Mimes -->
    <template v-else>
      <p class="status-text">No tienes Mimes todavia. Algo fallo al crear tu cuenta.</p>
    </template>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 24px 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #5c6bc0;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
}

.page-subtitle {
  font-size: 14px;
  color: #9e9e9e;
  margin-bottom: 12px;
}

.mimes-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  animation: scene-enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes scene-enter {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.mime-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mime-label {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-align: center;
}

.mime-sublabel {
  display: block;
  font-size: 11px;
  color: #999;
  font-weight: 500;
}

.mood-selector {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0 8px;
}

.mood-btn {
  padding: 5px 12px;
  border: 2px solid #c5cae9;
  border-radius: 20px;
  background: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Baloo 2', cursive;
}

.mood-btn:hover {
  border-color: #7986cb;
}

.mood-btn.active {
  background: #5c6bc0;
  color: white;
  border-color: #5c6bc0;
}

.hint {
  color: #bdbdbd;
  font-size: 12px;
  margin-top: 14px;
}

.care-link {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 24px;
  background: #5c6bc0;
  color: white;
  border-radius: 24px;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  transition: background 0.2s;
}

.care-link:active {
  background: #3f51b5;
}
</style>
