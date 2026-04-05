<script setup lang="ts">
/**
 * HomeView.vue — Vista temporal para probar los 3 Mimes.
 *
 * Importamos el componente MimeCharacter y lo usamos 3 veces,
 * una por cada personalidad, con su color asociado.
 *
 * También añadimos un selector de humor para probar las expresiones,
 * igual que en mime-preview.html.
 */
import { ref } from 'vue'
import MimeCharacter from '../components/MimeCharacter.vue'

// ref() crea una variable reactiva. Cuando cambie su valor (.value),
// Vue actualiza automáticamente todo lo que dependa de ella en el template.
// Aquí la usamos para el humor seleccionado.
const selectedMood = ref<'feliz' | 'euforico' | 'triste' | 'dormido' | 'hambriento' | ''>('')

// Lista de humores disponibles para los botones
const moods = [
  { value: '', label: 'Normal' },
  { value: 'feliz', label: 'Feliz' },
  { value: 'euforico', label: 'Euforico' },
  { value: 'triste', label: 'Triste' },
  { value: 'dormido', label: 'Dormido' },
  { value: 'hambriento', label: 'Hambriento' },
] as const
</script>

<template>
  <div class="home">
    <h1 class="page-title">Mimes Care Corp</h1>
    <p class="page-subtitle">Preview de personalidades</p>

    <!--
      Aquí usamos el componente <MimeCharacter> 3 veces.
      Fíjate cómo pasamos las props:
        - personality="aventurero" → string fija
        - color-theme="celeste" → en el template HTML se escribe en kebab-case (con guión),
          Vue lo convierte automáticamente a camelCase (colorTheme) en el script
        - :mood="selectedMood" → los dos puntos (:) significan "binding dinámico",
          es decir, el valor viene de una variable de JavaScript, no es un string fijo
    -->
    <div class="mimes-row">
      <div class="mime-wrapper">
        <MimeCharacter
          personality="aventurero"
          color-theme="celeste"
          :mood="selectedMood"
        />
        <div class="mime-label" style="color: #1565c0">
          Aventurero
          <span class="mime-sublabel">Pelo revuelto</span>
        </div>
      </div>

      <div class="mime-wrapper">
        <MimeCharacter
          personality="tranquilo"
          color-theme="lila"
          :mood="selectedMood"
        />
        <div class="mime-label" style="color: #6a1b9a">
          Tranquilo
          <span class="mime-sublabel">Pelo peinado</span>
        </div>
      </div>

      <div class="mime-wrapper">
        <MimeCharacter
          personality="picaro"
          color-theme="melocoton"
          :mood="selectedMood"
        />
        <div class="mime-label" style="color: #e65100">
          Picaro
          <span class="mime-sublabel">Pelo con estilo</span>
        </div>
      </div>
    </div>

    <!--
      Selector de humor.
      v-for: repite el <button> para cada elemento del array "moods".
      :class="{ active: selectedMood === m.value }": añade la clase "active"
        solo si este botón corresponde al humor seleccionado.
      @click="selectedMood = m.value": al hacer click, cambia selectedMood.
        Como selectedMood es un ref(), Vue actualiza automáticamente las props
        :mood de los 3 MimeCharacter arriba.
    -->
    <div class="mood-selector">
      <button
        v-for="m in moods"
        :key="m.value"
        class="mood-btn"
        :class="{ active: selectedMood === m.value }"
        @click="selectedMood = m.value"
      >
        {{ m.label }}
      </button>
    </div>

    <p class="hint">Toca un Mime para interactuar · Cambia el humor arriba</p>

    <!-- Botón para ir a la pantalla de cuidado -->
    <router-link to="/care" class="care-link">
      Probar pantalla de cuidado &#8594;
    </router-link>
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
