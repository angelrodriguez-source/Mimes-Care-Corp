/**
 * useCharacterMovement.ts — Composable para el movimiento del Mime
 *
 * Gestiona la logica de caminar por la habitacion:
 * posicion X, direccion, animacion de caminar,
 * y los intervalos de movimiento.
 */
import { ref, onUnmounted } from 'vue'

interface MovementOptions {
  /** Posicion X inicial en porcentaje (default: 50) */
  startX?: number
  /** Limite izquierdo en porcentaje (default: 20) */
  minX?: number
  /** Limite derecho en porcentaje (default: 80) */
  maxX?: number
  /** Velocidad del paso (default: 0.5) */
  stepSize?: number
  /** Intervalo de tick en ms (default: 100) */
  tickMs?: number
}

export function useCharacterMovement(options: MovementOptions = {}) {
  const {
    startX = 50,
    minX = 20,
    maxX = 80,
    stepSize = 0.5,
    tickMs = 100,
  } = options

  const mimeX = ref(startX)
  const mimeDirection = ref(1) // 1 = derecha, -1 = izquierda
  const isWalking = ref(false)
  let walkInterval: ReturnType<typeof setInterval> | null = null

  function startWalking() {
    if (walkInterval) return
    walkInterval = setInterval(() => {
      // 3% chance de cambiar de direccion
      if (Math.random() < 0.03) {
        mimeDirection.value *= -1
      }
      // 60% chance de caminar, 40% de quedarse quieto
      if (Math.random() < 0.6) {
        isWalking.value = true
        const step = stepSize * mimeDirection.value
        const newX = mimeX.value + step
        if (newX < minX) { mimeDirection.value = 1; mimeX.value = minX }
        else if (newX > maxX) { mimeDirection.value = -1; mimeX.value = maxX }
        else { mimeX.value = newX }
      } else {
        isWalking.value = false
      }
    }, tickMs)
  }

  function stopWalking() {
    if (walkInterval) { clearInterval(walkInterval); walkInterval = null }
    isWalking.value = false
  }

  function pauseWalking(durationMs: number) {
    stopWalking()
    setTimeout(() => startWalking(), durationMs)
  }

  onUnmounted(stopWalking)

  return {
    mimeX,
    mimeDirection,
    isWalking,
    startWalking,
    stopWalking,
    pauseWalking,
  }
}
