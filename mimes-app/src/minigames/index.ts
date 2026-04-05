/**
 * Barrel export de los mini-juegos.
 *
 * Mapea cada CareAction a su componente de juego correspondiente.
 * CareScreen usa esto para saber qué juego mostrar.
 */
export { default as MiniGameShell } from './MiniGameShell.vue'
export { default as CleanGame } from './CleanGame.vue'
export { default as FeedGame } from './FeedGame.vue'
export { default as PlayGame } from './PlayGame.vue'
export { default as LoveGame } from './LoveGame.vue'
export { default as RestGame } from './RestGame.vue'
export { default as DressGame } from './DressGame.vue'
export { GAME_CONFIGS } from './types'
export type { MiniGameResult, MiniGameConfig } from './types'

import type { CareAction } from '../models/MimeModel'
import type { Component } from 'vue'
import CleanGame from './CleanGame.vue'
import FeedGame from './FeedGame.vue'
import PlayGame from './PlayGame.vue'
import LoveGame from './LoveGame.vue'
import RestGame from './RestGame.vue'
import DressGame from './DressGame.vue'

/** Mapeo acción → componente del mini-juego */
export const ACTION_GAMES: Record<CareAction, Component> = {
  alimentar: FeedGame,
  limpiar: CleanGame,
  jugar: PlayGame,
  carino: LoveGame,
  descansar: RestGame,
  vestir: DressGame,
}
