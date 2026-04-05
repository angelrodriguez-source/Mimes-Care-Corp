/**
 * Tipos compartidos para los mini-juegos.
 *
 * Cada mini-juego tiene la misma interfaz:
 *   - Recibe `active` (el juego está en marcha)
 *   - Emite `complete` con el resultado
 *
 * MiniGameShell se encarga del flujo: cuenta atrás → juego → resultado.
 * Los juegos individuales solo se preocupan de su mecánica.
 */
import type { CareAction } from '../models/MimeModel'

/** Resultado de un mini-juego */
export interface MiniGameResult {
  success: boolean
}

/** Configuración de un mini-juego */
export interface MiniGameConfig {
  /** Título que se muestra en la cuenta atrás */
  title: string
  /** Icono del juego */
  icon: string
  /** Instrucción breve */
  instruction: string
  /** Duración en ms */
  duration: number
}

/** Mapeo acción → configuración del mini-juego */
export const GAME_CONFIGS: Record<CareAction, MiniGameConfig> = {
  alimentar: {
    title: 'Alimentar',
    icon: '🍖',
    instruction: 'Atrapa la comida!',
    duration: 5000,
  },
  limpiar: {
    title: 'Limpiar',
    icon: '🛁',
    instruction: 'Limpia todas las manchas!',
    duration: 5000,
  },
  jugar: {
    title: 'Jugar',
    icon: '🎮',
    instruction: 'Toca al Mime 8 veces!',
    duration: 5000,
  },
  carino: {
    title: 'Cariño',
    icon: '💕',
    instruction: 'Recoge los corazones!',
    duration: 5000,
  },
  descansar: {
    title: 'Descansar',
    icon: '😴',
    instruction: 'No toques la pantalla!',
    duration: 5000,
  },
  vestir: {
    title: 'Vestir',
    icon: '👔',
    instruction: 'Toca los del color correcto!',
    duration: 5000,
  },
}
