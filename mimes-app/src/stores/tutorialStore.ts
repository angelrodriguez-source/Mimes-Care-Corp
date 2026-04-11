/**
 * tutorialStore.ts — Estado global del tutorial interactivo.
 *
 * Gestiona el paso actual, si esta activo y las acciones start/next/skip/finish.
 * El TutorialOverlay (montado globalmente en App.vue) lee este estado y
 * renderiza el spotlight + tooltip correspondiente.
 *
 * La persistencia ("ya completado") vive en Supabase via `profile.tutorial_completed`:
 * - `start()` lo activa manualmente
 * - `finish()` llama al RPC `mark_tutorial_completed` y actualiza el profile local
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { TUTORIAL_STEPS, type TutorialStep } from '../constants/tutorialSteps'
import { markTutorialCompleted } from '../services/mimeService'
import { useUserStore } from './userStore'

export const useTutorialStore = defineStore('tutorial', () => {
  // --- STATE ---
  const active = ref(false)
  const stepIndex = ref(0)
  // Id del Mime a usar cuando el tutorial navega a la pantalla de cuidado.
  // Lo setea DashboardView cuando carga los Mimes del usuario.
  const careMimeId = ref<string | null>(null)

  // --- COMPUTED ---
  const currentStep = computed<TutorialStep | null>(() => {
    if (!active.value) return null
    return TUTORIAL_STEPS[stepIndex.value] ?? null
  })

  const totalSteps = computed(() => TUTORIAL_STEPS.length)
  const isFirstStep = computed(() => stepIndex.value === 0)
  const isLastStep = computed(() => stepIndex.value === TUTORIAL_STEPS.length - 1)

  // --- ACTIONS ---

  /** Arranca el tutorial desde el principio. */
  function start() {
    stepIndex.value = 0
    active.value = true
  }

  /** Setea el Mime que usara el tutorial para la pantalla de cuidado. */
  function setCareMimeId(id: string | null) {
    careMimeId.value = id
  }

  /** Avanza al siguiente paso. Si es el ultimo, termina. */
  function next() {
    if (stepIndex.value < TUTORIAL_STEPS.length - 1) {
      stepIndex.value += 1
    } else {
      finish()
    }
  }

  /** Retrocede un paso (si se puede). */
  function prev() {
    if (stepIndex.value > 0) stepIndex.value -= 1
  }

  /** Cierra el tutorial sin marcarlo como completado en DB. */
  function skip() {
    active.value = false
    stepIndex.value = 0
  }

  /** Marca el tutorial como completado en DB + cierra el overlay. */
  async function finish() {
    active.value = false
    stepIndex.value = 0

    const userStore = useUserStore()
    const { error } = await markTutorialCompleted()
    if (error) {
      console.error('mark_tutorial_completed:', error)
      return
    }
    // Reflejar localmente para que no se vuelva a lanzar automaticamente
    if (userStore.profile) {
      userStore.profile.tutorial_completed = true
    }
  }

  return {
    active,
    stepIndex,
    careMimeId,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    start,
    setCareMimeId,
    next,
    prev,
    skip,
    finish,
  }
})
