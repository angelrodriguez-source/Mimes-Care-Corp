<script setup lang="ts">
/**
 * App.vue — Componente raíz de la aplicación.
 *
 * <RouterView /> es un componente especial de Vue Router que renderiza
 * la vista correspondiente a la URL actual. Si estás en "/" muestra HomeView,
 * si estás en "/about" muestra AboutView, etc.
 *
 * Aquí no necesitamos nada más por ahora. Más adelante añadiremos
 * navegación (barra inferior con "Mis Mimes" / "Cuidar" / "Perfil").
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <div>
    <p style="text-align: center; padding: 20px; font-size: 24px; font-weight: bold; color: #333;">
      Prueba
    </p>
    <RouterView />
  </div>
</template>

<style>
html, body {
  background: #e8f5e9 !important;
}
</style>
