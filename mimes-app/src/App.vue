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
  <RouterView />
  <TutorialOverlay />
</template>
