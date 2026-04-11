<script setup lang="ts">
/**
 * TutorialOverlay.vue — Overlay global del tutorial interactivo.
 *
 * Se monta una sola vez en App.vue. Lee el estado de `tutorialStore` y,
 * cuando esta activo, pinta:
 *  - Un overlay oscuro a pantalla completa
 *  - Un "hueco" (spotlight) recortado sobre el elemento destino (si existe)
 *  - Un tooltip flotante con titulo, texto y botones Atras/Siguiente/Saltar
 *
 * El target se identifica con `data-tutorial="nombre"` en los componentes
 * de destino. Se busca con `document.querySelector` y su posicion se obtiene
 * con `getBoundingClientRect()`. Se recalcula en resize/scroll.
 *
 * Cuando el paso tiene `route`, el overlay navega automaticamente antes de
 * buscar el target (y espera un tick al DOM).
 */
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTutorialStore } from '../stores/tutorialStore'
import type { TutorialStep } from '../constants/tutorialSteps'

const tutorial = useTutorialStore()
const route = useRoute()
const router = useRouter()

// Rectangulo del elemento destacado (null = sin spotlight, tooltip centrado)
const targetRect = ref<DOMRect | null>(null)

// --- NAVEGACION AUTOMATICA ENTRE RUTAS ---
async function navigateIfNeeded(step: TutorialStep) {
  if (!step.route) return
  if (step.route === 'dashboard' && route.name !== 'dashboard') {
    await router.push({ name: 'dashboard' })
  } else if (step.route === 'care' && route.name !== 'care') {
    const mimeId = tutorial.careMimeId
    if (mimeId) {
      await router.push({ name: 'care', params: { id: mimeId } })
    }
  }
}

// --- LOCALIZAR EL TARGET EN EL DOM ---
async function locateTarget(step: TutorialStep | null) {
  if (!step || !step.target) {
    targetRect.value = null
    return
  }

  // Reintentar varias veces: el DOM puede no haber montado aun
  // (tras navegar a CareScreen hay que esperar a que termine loadMime()).
  // 40 × 100ms = 4s maximo antes de caer a tooltip centrado.
  for (let attempt = 0; attempt < 40; attempt++) {
    await nextTick()
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial="${step.target}"]`,
    )
    if (el) {
      targetRect.value = el.getBoundingClientRect()
      // Scroll el elemento a la vista si hace falta
      const vh = window.innerHeight
      if (targetRect.value.top < 0 || targetRect.value.bottom > vh) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Dar tiempo al smooth scroll antes de recalcular
        await new Promise(r => setTimeout(r, 350))
        targetRect.value = el.getBoundingClientRect()
      }
      return
    }
    await new Promise(r => setTimeout(r, 100))
  }
  // No encontrado: caemos a tooltip centrado
  targetRect.value = null
}

// --- REACCIONAR A CAMBIOS DE PASO ---
watch(
  () => tutorial.currentStep,
  async (step) => {
    if (!step) {
      targetRect.value = null
      return
    }
    await navigateIfNeeded(step)
    await locateTarget(step)
  },
  { immediate: true },
)

// --- RECALCULAR RECT EN RESIZE / SCROLL ---
function recalc() {
  if (tutorial.currentStep) locateTarget(tutorial.currentStep)
}

onMounted(() => {
  window.addEventListener('resize', recalc)
  window.addEventListener('scroll', recalc, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', recalc)
  window.removeEventListener('scroll', recalc, true)
})

// --- POSICION DEL TOOLTIP ---
// Si hay rect: lo colocamos encima o debajo segun placement y espacio.
// Si no: centrado en pantalla.
const TOOLTIP_MARGIN = 16
const TOOLTIP_WIDTH = 300

const tooltipStyle = computed<Record<string, string | undefined>>(() => {
  const step = tutorial.currentStep
  const rect = targetRect.value

  if (!step || !rect || step.placement === 'center') {
    return {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Centrado horizontalmente sobre el target, pero limitado a la viewport
  const targetCenterX = rect.left + rect.width / 2
  let left = targetCenterX - TOOLTIP_WIDTH / 2
  left = Math.max(TOOLTIP_MARGIN, Math.min(vw - TOOLTIP_WIDTH - TOOLTIP_MARGIN, left))

  // Placement vertical: top o bottom
  // Si no entra por el lado pedido, intenta el otro
  const placement = step.placement ?? 'bottom'
  const tooltipHeight = 200 // estimacion — el real lo maneja min-height

  let top: number
  if (placement === 'top') {
    const space = rect.top
    top = space >= tooltipHeight + TOOLTIP_MARGIN
      ? rect.top - tooltipHeight - TOOLTIP_MARGIN
      : rect.bottom + TOOLTIP_MARGIN
  } else {
    const space = vh - rect.bottom
    top = space >= tooltipHeight + TOOLTIP_MARGIN
      ? rect.bottom + TOOLTIP_MARGIN
      : Math.max(TOOLTIP_MARGIN, rect.top - tooltipHeight - TOOLTIP_MARGIN)
  }

  // Clamp final
  top = Math.max(TOOLTIP_MARGIN, Math.min(vh - tooltipHeight - TOOLTIP_MARGIN, top))

  return {
    left: `${left}px`,
    top: `${top}px`,
  }
})

// --- SPOTLIGHT: clip-path recorta el overlay sobre el rect del target ---
const spotlightStyle = computed<Record<string, string | undefined>>(() => {
  const rect = targetRect.value
  if (!rect) return {}
  const padding = 8
  const x = Math.max(0, rect.left - padding)
  const y = Math.max(0, rect.top - padding)
  const w = rect.width + padding * 2
  const h = rect.height + padding * 2
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
  }
})

const hasSpotlight = computed(() => !!targetRect.value)
const progressText = computed(
  () => `${tutorial.stepIndex + 1} / ${tutorial.totalSteps}`,
)
</script>

<template>
  <Teleport to="body">
    <div v-if="tutorial.active && tutorial.currentStep" class="tutorial-root">
      <!-- Overlay oscuro. Si hay spotlight lo recortamos con 4 bandas
           alrededor del target; si no, un overlay completo centrado. -->
      <template v-if="hasSpotlight">
        <!-- Banda superior -->
        <div
          class="tutorial-dim"
          :style="{
            left: '0',
            top: '0',
            right: '0',
            height: spotlightStyle.top,
          }"
        ></div>
        <!-- Banda inferior -->
        <div
          class="tutorial-dim"
          :style="{
            left: '0',
            top: `calc(${spotlightStyle.top} + ${spotlightStyle.height})`,
            right: '0',
            bottom: '0',
          }"
        ></div>
        <!-- Banda izquierda -->
        <div
          class="tutorial-dim"
          :style="{
            left: '0',
            top: spotlightStyle.top,
            width: spotlightStyle.left,
            height: spotlightStyle.height,
          }"
        ></div>
        <!-- Banda derecha -->
        <div
          class="tutorial-dim"
          :style="{
            left: `calc(${spotlightStyle.left} + ${spotlightStyle.width})`,
            top: spotlightStyle.top,
            right: '0',
            height: spotlightStyle.height,
          }"
        ></div>
        <!-- Halo luminoso del spotlight -->
        <div class="tutorial-spotlight" :style="spotlightStyle"></div>
      </template>
      <div v-else class="tutorial-dim tutorial-dim-full"></div>

      <!-- Tooltip -->
      <div class="tutorial-tooltip" :style="tooltipStyle">
        <div class="tutorial-progress">Paso {{ progressText }}</div>
        <h3 class="tutorial-title">{{ tutorial.currentStep.title }}</h3>
        <p class="tutorial-body">{{ tutorial.currentStep.body }}</p>
        <div class="tutorial-actions">
          <button
            class="tutorial-btn tutorial-btn-ghost"
            @click="tutorial.skip()"
          >
            Saltar
          </button>
          <div class="tutorial-nav">
            <button
              v-if="!tutorial.isFirstStep"
              class="tutorial-btn tutorial-btn-secondary"
              @click="tutorial.prev()"
            >
              Atras
            </button>
            <button
              class="tutorial-btn tutorial-btn-primary"
              @click="tutorial.next()"
            >
              {{ tutorial.isLastStep ? 'Terminar' : 'Siguiente' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tutorial-root {
  position: fixed;
  inset: 0;
  z-index: 1000;
  font-family: 'Baloo 2', cursive;
  pointer-events: none;
}

.tutorial-dim {
  position: fixed;
  background: rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.tutorial-dim-full {
  inset: 0;
}

.tutorial-spotlight {
  position: fixed;
  border-radius: 16px;
  box-shadow:
    0 0 0 3px rgba(92, 107, 192, 0.9),
    0 0 40px 6px rgba(92, 107, 192, 0.45);
  pointer-events: none;
  animation: tutorial-pulse 2s ease-in-out infinite;
}

@keyframes tutorial-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(92, 107, 192, 0.9),
      0 0 40px 6px rgba(92, 107, 192, 0.45);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(92, 107, 192, 1),
      0 0 60px 10px rgba(92, 107, 192, 0.6);
  }
}

.tutorial-tooltip {
  position: fixed;
  width: 300px;
  max-width: calc(100vw - 32px);
  background: white;
  border-radius: 20px;
  padding: 20px 22px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  animation: tutorial-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes tutorial-pop {
  from { opacity: 0; transform: translate(var(--tx, 0), calc(var(--ty, 0) + 10px)); }
  to { opacity: 1; }
}

.tutorial-progress {
  font-size: 11px;
  font-weight: 700;
  color: #5c6bc0;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.tutorial-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin: 0 0 10px;
  line-height: 1.25;
}

.tutorial-body {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  margin: 0 0 16px;
}

.tutorial-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tutorial-nav {
  display: flex;
  gap: 8px;
}

.tutorial-btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.tutorial-btn-primary {
  background: #5c6bc0;
  color: white;
}
.tutorial-btn-primary:active {
  background: #3f51b5;
}

.tutorial-btn-secondary {
  background: #e8eaf6;
  color: #5c6bc0;
}
.tutorial-btn-secondary:active {
  background: #c5cae9;
}

.tutorial-btn-ghost {
  background: none;
  color: #999;
}
.tutorial-btn-ghost:active {
  color: #666;
}
</style>
