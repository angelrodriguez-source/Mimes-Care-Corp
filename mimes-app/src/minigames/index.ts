/**
 * Barrel export y REGISTRO DE POOLS de los mini-juegos.
 *
 * Cada accion tiene un pool de juegos por dificultad. Al pulsar una
 * accion, `pickGame()` elige uno al azar del pool correspondiente,
 * evitando repetir el mismo que la vez anterior (anti-repeticion).
 *
 * Para anadir un juego nuevo: crear el .vue (mismo contrato de props
 * que los demas) y anadir una entrada { component, config } al pool.
 */
export { default as MiniGameShell } from './MiniGameShell.vue'
export type { MiniGameResult, MiniGameConfig } from './types'

import type { CareAction } from '../models/MimeModel'
import type { MiniGameConfig } from './types'
import type { Component } from 'vue'

// --- Juegos clasicos (facil) ---
import FeedGame from './FeedGame.vue'
import CleanGame from './CleanGame.vue'
import PlayGame from './PlayGame.vue'
import LoveGame from './LoveGame.vue'
import RestGame from './RestGame.vue'
import DressGame from './DressGame.vue'

// --- Segunda tanda (facil) ---
import RipeFruitGame from './RipeFruitGame.vue'
import BubblePopGame from './BubblePopGame.vue'
import WhackToyGame from './WhackToyGame.vue'
import CaressGame from './CaressGame.vue'
import LightsOffGame from './LightsOffGame.vue'
import FindClothesGame from './FindClothesGame.vue'

// --- Avanzados ---
import FeedCatchGame from './FeedCatchGame.vue'
import ScrubGame from './ScrubGame.vue'
import BasketGame from './BasketGame.vue'
import SimonHeartsGame from './SimonHeartsGame.vue'
import LullabyGame from './LullabyGame.vue'
import OutfitMemoryGame from './OutfitMemoryGame.vue'

// --- Segunda tanda (avanzado) ---
import RecipeGame from './RecipeGame.vue'
import DustChaseGame from './DustChaseGame.vue'
import MemoryPairsGame from './MemoryPairsGame.vue'
import HeartBeatGame from './HeartBeatGame.vue'
import SheepCountGame from './SheepCountGame.vue'
import LaundryGame from './LaundryGame.vue'

export type Difficulty = 'easy' | 'advanced'

/** Un juego del pool: componente + su configuracion para el shell */
export interface GameEntry {
  component: Component
  config: MiniGameConfig
}

const cfg = (
  title: string,
  icon: string,
  instruction: string,
  duration: number,
  timeoutIsWin?: boolean,
): MiniGameConfig => ({ title, icon, instruction, duration, timeoutIsWin })

/** Pools de dificultad FACIL (juegos de 5-8 segundos) */
const EASY_POOLS: Record<CareAction, GameEntry[]> = {
  alimentar: [
    { component: FeedGame, config: cfg('Alimentar', '🍖', 'Atrapa la comida!', 5000) },
    { component: RipeFruitGame, config: cfg('Fruta madura', '🍎', 'Toca solo la fruta buena!', 8000) },
  ],
  limpiar: [
    { component: CleanGame, config: cfg('Limpiar', '🛁', 'Limpia todas las manchas!', 5000) },
    { component: BubblePopGame, config: cfg('Pompas', '🫧', 'Explota 10 pompas!', 8000) },
  ],
  jugar: [
    { component: PlayGame, config: cfg('Jugar', '🎮', 'Toca al Mime 8 veces!', 5000) },
    { component: WhackToyGame, config: cfg('Toca-topo', '🐹', 'Dale al juguete 8 veces!', 8000) },
  ],
  carino: [
    { component: LoveGame, config: cfg('Cariño', '💕', 'Recoge los corazones!', 5000) },
    { component: CaressGame, config: cfg('Mimitos', '🤗', 'Acaricia sin parar!', 8000) },
  ],
  descansar: [
    { component: RestGame, config: cfg('Descansar', '😴', 'No toques la pantalla!', 5000, true) },
    { component: LightsOffGame, config: cfg('Luces fuera', '💡', 'Apaga todas las luces!', 8000) },
  ],
  vestir: [
    { component: DressGame, config: cfg('Vestir', '👔', 'Toca los del color correcto!', 5000) },
    { component: FindClothesGame, config: cfg('Encuentra la prenda', '🔍', 'Busca las 3 iguales!', 8000) },
  ],
}

/** Pools de dificultad AVANZADA (juegos de 20-30 segundos, recompensa x1.5) */
const ADVANCED_POOLS: Record<CareAction, GameEntry[]> = {
  alimentar: [
    { component: FeedCatchGame, config: cfg('Cosecha', '🧺', 'Atrapa 10 comidas buenas!', 25000) },
    { component: RecipeGame, config: cfg('La receta', '👨‍🍳', 'Memoriza y repite la receta!', 25000) },
  ],
  limpiar: [
    { component: ScrubGame, config: cfg('Campo minado', '🧽', 'Limpia sin tocar las minas!', 25000) },
    { component: DustChaseGame, config: cfg('Caza el polvo', '💨', 'Atrapa las motas de polvo!', 20000) },
  ],
  jugar: [
    { component: BasketGame, config: cfg('Baloncesto', '🏀', 'Encesta 3 de 5 tiros!', 20000) },
    { component: MemoryPairsGame, config: cfg('Parejas', '🃏', 'Encuentra las 3 parejas!', 25000) },
  ],
  carino: [
    { component: SimonHeartsGame, config: cfg('Simon de corazones', '💞', 'Repite la secuencia!', 30000) },
    { component: HeartBeatGame, config: cfg('Al ritmo', '💓', 'Toca los corazones en la linea!', 20000) },
  ],
  descansar: [
    { component: LullabyGame, config: cfg('Nana', '🌙', 'Toca cuando pase por la zona verde!', 20000) },
    { component: SheepCountGame, config: cfg('Cuenta ovejas', '🐑', 'Cuantas ovejas han pasado?', 20000) },
  ],
  vestir: [
    { component: OutfitMemoryGame, config: cfg('Conjunto perfecto', '🧥', 'Memoriza y elige las 3 prendas!', 20000) },
    { component: LaundryGame, config: cfg('Tendedero', '👕', 'Descuelga el color que se pide!', 20000) },
  ],
}

// Ultimo juego mostrado por (accion, dificultad), para no repetir seguidos
const lastPicked = new Map<string, number>()

/**
 * Elige un juego al azar del pool (accion, dificultad).
 * Si el pool tiene mas de un juego, nunca repite el ultimo mostrado.
 */
export function pickGame(action: CareAction, difficulty: Difficulty): GameEntry {
  const pool = difficulty === 'advanced' ? ADVANCED_POOLS[action] : EASY_POOLS[action]
  const key = `${action}:${difficulty}`

  let idx = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && idx === lastPicked.get(key)) {
    idx = (idx + 1) % pool.length
  }
  lastPicked.set(key, idx)
  return pool[idx]!
}

/** Tamanos de pool (para tests y docs) */
export function poolSizes(): Record<CareAction, { easy: number; advanced: number }> {
  const actions = Object.keys(EASY_POOLS) as CareAction[]
  return Object.fromEntries(
    actions.map(a => [a, { easy: EASY_POOLS[a].length, advanced: ADVANCED_POOLS[a].length }]),
  ) as Record<CareAction, { easy: number; advanced: number }>
}
