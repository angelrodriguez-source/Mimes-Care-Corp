/**
 * useVoice.ts — Voz "Animalese" (balbuceo tipo Animal Crossing)
 *
 * Sintetiza un balbuceo silabico con Web Audio API (sin archivos de
 * audio): cada caracter alfabetico del texto se convierte en una
 * "silaba" corta (pio agudo con envolvente rapida) cuyo pitch deriva
 * deterministicamente del charCode, alrededor de una frecuencia base
 * que depende de la personalidad del mime. Asi cada mime "habla" con
 * su propio tono sin necesidad de grabar voces.
 *
 * Respeta el toggle global de sonido de useSfx: si el usuario apago
 * el audio, babble() no suena.
 */
import { useSfx } from './useSfx'

export type VoicePersonality = 'aventurero' | 'tranquilo' | 'picaro'

export interface BabbleOptions {
  /** Maximo de silabas a reproducir (recorta textos largos). Default: 14 */
  maxSyllables?: number
}

/** Parametros de voz por personalidad */
interface VoiceProfile {
  /** Frecuencia base en Hz alrededor de la que oscilan las silabas */
  baseFreq: number
  /** Duracion de cada silaba en ms */
  syllableMs: number
  /** Hueco entre silabas en ms */
  gapMs: number
  /** Variacion relativa de pitch entre silabas (0.3 = ±30%) */
  pitchSpread: number
  /** Tipo de onda del oscilador */
  wave: OscillatorType
  /** Volumen pico de cada silaba */
  volume: number
}

const PROFILES: Record<VoicePersonality, VoiceProfile> = {
  // Agudo y rapido: parlanchin, energico
  aventurero: { baseFreq: 420, syllableMs: 70, gapMs: 30, pitchSpread: 0.22, wave: 'triangle', volume: 0.07 },
  // Grave y pausado: silabas mas largas y huecos mayores
  tranquilo: { baseFreq: 280, syllableMs: 95, gapMs: 45, pitchSpread: 0.14, wave: 'triangle', volume: 0.06 },
  // Medio pero con mucha variacion de pitch: jugueton, imprevisible
  picaro: { baseFreq: 340, syllableMs: 80, gapMs: 35, pitchSpread: 0.35, wave: 'square', volume: 0.06 },
}

// AudioContext perezoso: se crea en el primer balbuceo (los navegadores
// exigen un gesto del usuario antes de poder reproducir audio)
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Nodos programados del balbuceo en curso: se guardan a nivel de modulo
// para poder cortarlos si empieza un balbuceo nuevo antes de que acabe
let scheduled: { osc: OscillatorNode; gain: GainNode }[] = []

/** Corta el balbuceo en curso: para y desconecta los osciladores pendientes */
function stopCurrentBabble() {
  for (const { osc, gain } of scheduled) {
    try {
      osc.stop()
    } catch {
      // Ya estaba parado o sin arrancar: lo ignoramos
    }
    osc.disconnect()
    gain.disconnect()
  }
  scheduled = []
}

/** Solo los caracteres alfabeticos generan silaba (incluye acentos y ñ) */
function isAlphabetic(char: string): boolean {
  return /[a-záéíóúüñ]/i.test(char)
}

/**
 * Programa una silaba: tono corto con ataque rapido, caida exponencial
 * y un pequeño glide de frecuencia para que suene organico y no a beep.
 */
function scheduleSyllable(
  audio: AudioContext,
  profile: VoiceProfile,
  charCode: number,
  startTime: number,
) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()

  // Pitch deterministico: el charCode elige un punto dentro del rango
  // [-spread/2, +spread/2] alrededor de la frecuencia base
  const slot = (charCode % 12) / 11 // 0..1, estable por caracter
  const freq = profile.baseFreq * (1 + profile.pitchSpread * (slot - 0.5))

  // Glide: la silaba sube o baja ligeramente segun la paridad del
  // charCode, imitando la entonacion de una voz real
  const glide = charCode % 2 === 0 ? 1.12 : 0.9
  const durS = profile.syllableMs / 1000

  osc.type = profile.wave
  osc.frequency.setValueAtTime(freq, startTime)
  osc.frequency.exponentialRampToValueAtTime(freq * glide, startTime + durS)

  // Envolvente: ataque muy rapido y caida exponencial (tipo pio-pio)
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.linearRampToValueAtTime(profile.volume, startTime + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + durS)

  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(startTime)
  osc.stop(startTime + durS)

  scheduled.push({ osc, gain })
}

export function useVoice() {
  const { enabled } = useSfx()

  /**
   * Balbucea un texto: una silaba por caracter alfabetico, hasta
   * maxSyllables. Si ya habia un balbuceo sonando, lo corta primero.
   */
  function babble(text: string, personality: VoicePersonality, options?: BabbleOptions) {
    if (!enabled.value) return

    const audio = getCtx()
    if (!audio) return

    stopCurrentBabble()

    const profile = PROFILES[personality]
    const maxSyllables = options?.maxSyllables ?? 14
    const stepS = (profile.syllableMs + profile.gapMs) / 1000

    let count = 0
    for (const char of text) {
      if (count >= maxSyllables) break
      if (!isAlphabetic(char)) continue

      const startTime = audio.currentTime + count * stepS
      scheduleSyllable(audio, profile, char.charCodeAt(0), startTime)
      count++
    }
  }

  return { babble }
}
