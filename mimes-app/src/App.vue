<script setup lang="ts">
/**
 * App.vue — Componente raíz de la aplicación.
 *
 * <RouterView /> es un componente especial de Vue Router que renderiza
 * la vista correspondiente a la URL actual. Si estás en "/" muestra HomeView,
 * si estás en "/about" muestra AboutView, etc.
 *
 * TutorialOverlay se monta globalmente: sobrevive a los cambios de ruta
 * porque el tutorial puede navegar del dashboard a la pantalla de cuidado
 * y volver sin reiniciarse.
 */
import { RouterView } from 'vue-router'
import TutorialOverlay from './components/TutorialOverlay.vue'
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="route" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <TutorialOverlay />
</template>

<style>
/* Transicion suave entre pantallas (global: aplica al root de cada vista) */
.route-enter-active,
.route-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.route-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.route-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
