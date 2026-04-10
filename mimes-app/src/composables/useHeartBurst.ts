/**
 * useHeartBurst.ts — Composable para la animacion de corazones/besos
 *
 * Crea una explosion de emojis alrededor de un elemento.
 * Usado para la accion de carino y el click en el personaje.
 */
import type { Ref } from 'vue'

const KISS_EMOJIS = ['\uD83D\uDC8B', '\uD83D\uDC95', '\uD83D\uDC96', '\u2764\uFE0F']
const HEART_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDC9B', '\uD83D\uDC96', '\uD83E\uDDE1', '\uD83D\uDC9C', '\uD83D\uDC97']
const BURST_DURATION_MS = 1200

interface BurstOptions {
  /** Emojis a usar */
  emojis?: string[]
  /** Cantidad de particulas */
  count?: number
  /** Radio minimo */
  minRadius?: number
  /** Radio maximo */
  maxRadius?: number
  /** Offset vertical */
  offsetY?: number
  /** Rotacion maxima */
  maxRotation?: number
}

function createBurst(
  container: HTMLElement,
  left: string,
  top: string,
  options: BurstOptions = {},
) {
  const {
    emojis = KISS_EMOJIS,
    count = 6,
    minRadius = 30,
    maxRadius = 50,
    offsetY = -40,
    maxRotation = 60,
  } = options

  const burst = document.createElement('div')
  burst.className = 'heart-burst'
  burst.style.left = left
  burst.style.top = top

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'mini-heart'
    el.textContent = emojis[i % emojis.length] ?? ''
    const angle = Math.random() * Math.PI * 2
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    el.style.setProperty('--tx', `${Math.cos(angle) * radius}px`)
    el.style.setProperty('--ty', `${Math.sin(angle) * radius + offsetY}px`)
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * maxRotation}deg`)
    el.style.animationDelay = `${i * 0.05}s`
    burst.appendChild(el)
  }

  container.appendChild(burst)
  setTimeout(() => burst.remove(), BURST_DURATION_MS)
}

export function useHeartBurst(characterRef: Ref<HTMLElement | null>) {
  /** Explosion de besos (accion de carino) */
  function showKissBurst() {
    const ch = characterRef.value
    if (!ch) return
    createBurst(ch, '50%', '30%', {
      emojis: KISS_EMOJIS,
      count: 6,
      minRadius: 30,
      maxRadius: 80,
      offsetY: -40,
      maxRotation: 60,
    })
  }

  /** Explosion de corazones al hacer click */
  function showClickBurst(event: MouseEvent) {
    const ch = characterRef.value
    if (!ch) return
    const rect = ch.getBoundingClientRect()
    const left = event.clientX - rect.left + 'px'
    const top = event.clientY - rect.top + 'px'
    createBurst(ch, left, top, {
      emojis: HEART_EMOJIS,
      count: 8,
      minRadius: 40,
      maxRadius: 100,
      offsetY: -30,
      maxRotation: 90,
    })
  }

  return { showKissBurst, showClickBurst }
}
