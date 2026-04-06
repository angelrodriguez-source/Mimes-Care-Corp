/**
 * gameConstants.ts — Constantes compartidas del juego
 *
 * Centraliza todas las etiquetas, colores y configuraciones
 * que se usan en multiples componentes para evitar duplicacion.
 */
import type { Personality, Mood, MimeStats, CareAction, StatName } from '../models/MimeModel'

// --- MOOD LABELS ---
export const MOOD_LABELS: Record<string, string> = {
  euforico: 'Euforico',
  feliz: 'Feliz',
  '': 'Normal',
  triste: 'Triste',
  dormido: 'Dormido',
  hambriento: 'Hambriento',
}

export function getMoodLabel(mood: Mood): string {
  return MOOD_LABELS[mood] ?? 'Normal'
}

// --- PERSONALITY LABELS ---
export const PERSONALITY_LABELS: Record<Personality, string> = {
  aventurero: 'Aventurero',
  tranquilo: 'Tranquilo',
  picaro: 'Picaro',
}

// --- PERSONALITY COLORS ---
export const PERSONALITY_COLORS: Record<Personality, string> = {
  aventurero: '#1565c0',
  tranquilo: '#6a1b9a',
  picaro: '#e65100',
}

// --- HEALTH COLOR THRESHOLDS ---
export function getHealthColor(value: number): string {
  if (value >= 60) return '#4caf50'
  if (value >= 30) return '#ff9800'
  return '#f44336'
}

// --- STAT CONFIG (para barras de stats) ---
export const STAT_CONFIG: { key: StatName; label: string; icon: string }[] = [
  { key: 'hambre', label: 'Hambre', icon: '\uD83C\uDF56' },
  { key: 'higiene', label: 'Higiene', icon: '\uD83D\uDEC1' },
  { key: 'diversion', label: 'Diversion', icon: '\uD83C\uDFAE' },
  { key: 'carino', label: 'Carino', icon: '\uD83D\uDC95' },
  { key: 'energia', label: 'Energia', icon: '\u26A1' },
  { key: 'apariencia', label: 'Apariencia', icon: '\u2728' },
]

// --- ACTION CONFIG (para botones de accion) ---
export const ACTION_CONFIG: { action: CareAction; label: string; icon: string }[] = [
  { action: 'alimentar', label: 'Alimentar', icon: '\uD83C\uDF56' },
  { action: 'limpiar', label: 'Limpiar', icon: '\uD83D\uDEC1' },
  { action: 'jugar', label: 'Jugar', icon: '\uD83C\uDFAE' },
  { action: 'carino', label: 'Carino', icon: '\uD83D\uDC95' },
  { action: 'descansar', label: 'Descansar', icon: '\uD83D\uDE34' },
  { action: 'vestir', label: 'Vestir', icon: '\uD83D\uDC54' },
]

// --- PUNTOS INICIALES (para reset) ---
export const INITIAL_PUNTOS = 100

// --- FEEDBACK DURATION ---
export const FEEDBACK_DURATION_MS = 800
export const REST_PAUSE_DURATION_MS = 5000
export const RESULT_DISPLAY_MS = 1500
