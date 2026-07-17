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
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import TutorialOverlay from './components/TutorialOverlay.vue'

// --- AVISO DE VERSION NUEVA (PWA) ---
// main.ts emite 'mimes-sw-update' cuando el service worker tiene una
// version nueva instalada y esperando. Al aceptar, le mandamos
// SKIP_WAITING y main.ts recarga cuando el SW nuevo toma el control.
const updateSW = ref<ServiceWorker | null>(null)

function onSwUpdate(e: Event) {
  updateSW.value = (e as CustomEvent<ServiceWorker>).detail
}

function applyUpdate() {
  updateSW.value?.postMessage('SKIP_WAITING')
  updateSW.value = null
}

onMounted(() => window.addEventListener('mimes-sw-update', onSwUpdate))
onUnmounted(() => window.removeEventListener('mimes-sw-update', onSwUpdate))
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="route" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <TutorialOverlay />

  <!-- Toast de version nueva -->
  <button v-if="updateSW" class="update-toast" @click="applyUpdate">
    ✨ Hay una version nueva — toca para actualizar
  </button>
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

/* Toast de actualizacion de la PWA */
.update-toast {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  box-shadow: 0 4px 18px rgba(92, 107, 192, 0.5);
  cursor: pointer;
  z-index: 2000;
  animation: update-toast-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  max-width: 90vw;
}

.update-toast:active {
  background: #3f51b5;
}

@keyframes update-toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
