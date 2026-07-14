/**
 * useSfx.ts — Efectos de sonido sintetizados + vibracion
 *
 * Genera tonos cortos con Web Audio API (sin archivos de audio) y
 * vibra en movil via navigator.vibrate. El estado on/off se persiste
 * en localStorage y es compartido por toda la app (estado a nivel de
 * modulo, no por componente).
 */
import { ref } from 'vue'

const STORAGE_KEY = 'mimes-sfx-enabled'

const enabled = ref(localStorage.getItem(STORAGE_KEY) !== 'off')

// AudioContext perezoso: se crea en el primer sonido (los navegadores
// exigen un gesto del usuario antes de poder reproducir audio)
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Un tono simple: frecuencia, duracion y tipo de onda */
function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', delayMs = 0, volume = 0.12) {
  const audio = getCtx()
  if (!audio) return

  const t0 = audio.currentTime + delayMs / 1000
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000)
}

export type SfxName = 'tap' | 'success' | 'fail' | 'coin'

const SOUNDS: Record<SfxName, () => void> = {
  // Toque de boton/accion
  tap: () => tone(600, 60, 'sine'),
  // Victoria: arpegio ascendente
  success: () => {
    tone(523, 120, 'sine')        // do
    tone(659, 120, 'sine', 110)   // mi
    tone(784, 200, 'sine', 220)   // sol
  },
  // Derrota: dos notas descendentes
  fail: () => {
    tone(330, 160, 'triangle')
    tone(220, 260, 'triangle', 150)
  },
  // Recompensa/moneda: brillo agudo
  coin: () => {
    tone(988, 90, 'square', 0, 0.07)
    tone(1319, 200, 'square', 90, 0.07)
  },
}

const VIBRATIONS: Record<SfxName, number | number[]> = {
  tap: 10,
  success: [30, 40, 60],
  fail: [80, 40, 80],
  coin: [20, 30, 20],
}

export function useSfx() {
  function play(name: SfxName) {
    if (!enabled.value) return
    SOUNDS[name]()
    if (navigator.vibrate) navigator.vibrate(VIBRATIONS[name])
  }

  function toggle() {
    enabled.value = !enabled.value
    localStorage.setItem(STORAGE_KEY, enabled.value ? 'on' : 'off')
  }

  return { enabled, play, toggle }
}
