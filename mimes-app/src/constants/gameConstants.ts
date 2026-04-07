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

// --- ROOM THEMES POR PERSONALIDAD ---

export interface RoomObject {
  id: string
  emoji: string
  label: string
  x: number     // porcentaje desde la izquierda (0-100)
  y: number     // porcentaje desde abajo (0-100)
  size: number   // tamaño en px
  action?: CareAction // accion asociada al tocar
}

export interface RoomTheme {
  wall: string[]       // gradiente de colores para la pared
  floor: string[]      // gradiente de colores para el suelo
  floorBorder: string  // linea entre pared y suelo
  objects: RoomObject[]
}

export const ROOM_THEMES: Record<Personality, RoomTheme> = {
  aventurero: {
    wall: ['#e8f5e9', '#a5d6a7', '#66bb6a'],
    floor: ['#a1887f', '#8d6e63', '#795548'],
    floorBorder: '#5d4037',
    objects: [
      { id: 'cama', emoji: '🛏️', label: 'Cama', x: 85, y: 42, size: 36, action: 'descansar' },
      { id: 'plato', emoji: '🍖', label: 'Comida', x: 12, y: 38, size: 30, action: 'alimentar' },
      { id: 'pelota', emoji: '⚽', label: 'Pelota', x: 30, y: 34, size: 26, action: 'jugar' },
      { id: 'mochila', emoji: '🎒', label: 'Mochila', x: 90, y: 70, size: 28 },
      { id: 'mapa', emoji: '🗺️', label: 'Mapa', x: 15, y: 78, size: 32 },
    ],
  },
  tranquilo: {
    wall: ['#ede7f6', '#d1c4e9', '#b39ddb'],
    floor: ['#bcaaa4', '#a1887f', '#8d6e63'],
    floorBorder: '#6d4c41',
    objects: [
      { id: 'cama', emoji: '🛋️', label: 'Sofa', x: 85, y: 42, size: 36, action: 'descansar' },
      { id: 'plato', emoji: '🍵', label: 'Te', x: 12, y: 38, size: 28, action: 'alimentar' },
      { id: 'libro', emoji: '📚', label: 'Libros', x: 28, y: 34, size: 28, action: 'jugar' },
      { id: 'planta', emoji: '🪴', label: 'Planta', x: 92, y: 72, size: 30 },
      { id: 'cuadro', emoji: '🖼️', label: 'Cuadro', x: 50, y: 82, size: 32 },
    ],
  },
  picaro: {
    wall: ['#fff3e0', '#ffe0b2', '#ffcc80'],
    floor: ['#d7ccc8', '#bcaaa4', '#a1887f'],
    floorBorder: '#8d6e63',
    objects: [
      { id: 'cama', emoji: '🛏️', label: 'Cama', x: 85, y: 42, size: 36, action: 'descansar' },
      { id: 'plato', emoji: '🍕', label: 'Pizza', x: 12, y: 38, size: 28, action: 'alimentar' },
      { id: 'dado', emoji: '🎲', label: 'Dados', x: 30, y: 34, size: 26, action: 'jugar' },
      { id: 'espejo', emoji: '🪞', label: 'Espejo', x: 10, y: 75, size: 30, action: 'vestir' },
      { id: 'cofre', emoji: '🎁', label: 'Cofre', x: 90, y: 68, size: 28 },
    ],
  },
}
