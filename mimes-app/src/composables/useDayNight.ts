/**
 * useDayNight.ts — Composable para ciclo dia/noche
 *
 * Devuelve la fase del dia segun la hora real del usuario.
 * Actualiza automaticamente cada minuto.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night'

export interface DayNightState {
  phase: TimePhase
  hour: number
  /** Opacidad del overlay nocturno (0 = dia pleno, 0.4 = noche) */
  nightOverlay: number
  /** Tinte del cielo para mezclar con el tema base */
  skyTint: string
}

function getPhase(hour: number): TimePhase {
  if (hour >= 6 && hour < 10) return 'dawn'
  if (hour >= 10 && hour < 18) return 'day'
  if (hour >= 18 && hour < 21) return 'dusk'
  return 'night'
}

function getNightOverlay(hour: number): number {
  if (hour >= 10 && hour < 18) return 0        // dia pleno
  if (hour >= 6 && hour < 10) return 0.05       // amanecer
  if (hour >= 18 && hour < 21) return 0.15      // atardecer
  return 0.35                                    // noche
}

function getSkyTint(phase: TimePhase): string {
  switch (phase) {
    case 'dawn': return 'rgba(255, 183, 77, 0.15)'   // naranja suave
    case 'day': return 'rgba(255, 255, 255, 0)'       // sin tinte
    case 'dusk': return 'rgba(255, 138, 101, 0.2)'    // rojo atardecer
    case 'night': return 'rgba(26, 35, 126, 0.3)'     // azul noche
  }
}

export function useDayNight() {
  const hour = ref(new Date().getHours())
  let timer: ReturnType<typeof setInterval> | null = null

  function update() {
    hour.value = new Date().getHours()
  }

  onMounted(() => {
    update()
    timer = setInterval(update, 60_000) // actualizar cada minuto
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const phase = computed<TimePhase>(() => getPhase(hour.value))
  const nightOverlay = computed(() => getNightOverlay(hour.value))
  const skyTint = computed(() => getSkyTint(phase.value))

  const state = computed<DayNightState>(() => ({
    phase: phase.value,
    hour: hour.value,
    nightOverlay: nightOverlay.value,
    skyTint: skyTint.value,
  }))

  return { phase, hour, nightOverlay, skyTint, state }
}
