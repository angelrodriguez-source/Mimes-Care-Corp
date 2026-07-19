/**
 * Barrel export y REGISTRO DE POOLS de los mini-juegos.
 *
 * Cada accion tiene un pool de juegos por dificultad. Al pulsar una
 * accion, `pickGame()` elige uno al azar del pool correspondiente,
 * evitando repetir el mismo que la vez anterior (anti-repeticion).
 *
 * CARGA PEREZOSA: los juegos NO se importan estaticamente — cada uno
 * es un chunk propio que se descarga al ser elegido (pickGame lanza la
 * descarga en ese momento; la cuenta atras del shell la cubre de sobra
 * y el service worker lo cachea para la proxima).
 *
 * Para anadir un juego: crear el .vue (contrato estandar de props) y
 * anadir { load, config } al pool. Nada mas.
 */
export { default as MiniGameShell } from './MiniGameShell.vue'
export type { MiniGameResult, MiniGameConfig } from './types'

import { defineAsyncComponent, type Component } from 'vue'
import type { CareAction } from '../models/MimeModel'
import type { MiniGameConfig } from './types'

export type Difficulty = 'easy' | 'advanced'

/** Definicion interna de un juego del pool */
interface GameDef {
  load: () => Promise<{ default: Component }>
  config: MiniGameConfig
}

/** Lo que recibe CareScreen: componente listo para renderizar + config */
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
const EASY_POOLS: Record<CareAction, GameDef[]> = {
  alimentar: [
    { load: () => import('./FeedGame.vue'), config: cfg('Alimentar', '🍖', 'Atrapa la comida!', 5000) },
    { load: () => import('./RipeFruitGame.vue'), config: cfg('Fruta madura', '🍎', 'Toca solo la fruta buena!', 8000) },
    { load: () => import('./DropFeedGame.vue'), config: cfg('Punteria', '🍩', 'Suelta la comida en la boca!', 8000) },
  ],
  limpiar: [
    { load: () => import('./CleanGame.vue'), config: cfg('Limpiar', '🛁', 'Limpia todas las manchas!', 5000) },
    { load: () => import('./BubblePopGame.vue'), config: cfg('Pompas', '🫧', 'Explota 10 pompas!', 8000) },
    { load: () => import('./TrashSortGame.vue'), config: cfg('A su cubo', '♻️', 'Cada cosa a su cubo!', 8000) },
  ],
  jugar: [
    { load: () => import('./PlayGame.vue'), config: cfg('Jugar', '🎮', 'Toca al Mime 8 veces!', 5000) },
    { load: () => import('./WhackToyGame.vue'), config: cfg('Toca-topo', '🐹', 'Dale al juguete 8 veces!', 8000) },
    { load: () => import('./BalloonBlowGame.vue'), config: cfg('Globos', '🎈', 'Infla hasta la zona verde!', 8000) },
  ],
  carino: [
    { load: () => import('./LoveGame.vue'), config: cfg('Cariño', '💕', 'Recoge los corazones!', 5000) },
    { load: () => import('./CaressGame.vue'), config: cfg('Mimitos', '🤗', 'Acaricia sin parar!', 8000) },
    { load: () => import('./HeartTraceGame.vue'), config: cfg('Traza el corazon', '💘', 'Une los puntos en orden!', 8000) },
  ],
  descansar: [
    { load: () => import('./RestGame.vue'), config: cfg('Descansar', '😴', 'No toques la pantalla!', 5000, true) },
    { load: () => import('./LightsOffGame.vue'), config: cfg('Luces fuera', '💡', 'Apaga todas las luces!', 8000) },
    { load: () => import('./HushGame.vue'), config: cfg('Silencio', '🤫', 'Silencia los ruidos a tiempo!', 8000) },
  ],
  vestir: [
    { load: () => import('./DressGame.vue'), config: cfg('Vestir', '👔', 'Toca los del color correcto!', 5000) },
    { load: () => import('./FindClothesGame.vue'), config: cfg('Encuentra la prenda', '🔍', 'Busca las 3 iguales!', 8000) },
    { load: () => import('./ShadowMatchGame.vue'), config: cfg('Sombras', '👥', 'Adivina la prenda por su sombra!', 8000) },
  ],
}

/** Pools de dificultad AVANZADA (20-30 segundos, recompensa x1.5) */
const ADVANCED_POOLS: Record<CareAction, GameDef[]> = {
  alimentar: [
    { load: () => import('./FeedCatchGame.vue'), config: cfg('Cosecha', '🧺', 'Atrapa 10 comidas buenas!', 25000) },
    { load: () => import('./RecipeGame.vue'), config: cfg('La receta', '👨‍🍳', 'Memoriza y repite la receta!', 25000) },
    { load: () => import('./BurgerStackGame.vue'), config: cfg('Torre de burger', '🍔', 'Apila 6 pisos sin fallar!', 25000) },
  ],
  limpiar: [
    { load: () => import('./ScrubGame.vue'), config: cfg('Campo minado', '🧽', 'Limpia sin tocar las minas!', 25000) },
    { load: () => import('./DustChaseGame.vue'), config: cfg('Caza el polvo', '💨', 'Atrapa las motas de polvo!', 20000) },
    { load: () => import('./RecycleRushGame.vue'), config: cfg('Recicla rapido', '♻️', 'Cada objeto a su cubo!', 25000) },
  ],
  jugar: [
    { load: () => import('./BasketGame.vue'), config: cfg('Baloncesto', '🏀', 'Encesta 3 de 5 tiros!', 20000) },
    { load: () => import('./MemoryPairsGame.vue'), config: cfg('Parejas', '🃏', 'Encuentra las 3 parejas!', 25000) },
    { load: () => import('./ReflexGame.vue'), config: cfg('Semaforo', '🚦', 'Toca solo en verde!', 20000) },
  ],
  carino: [
    { load: () => import('./SimonHeartsGame.vue'), config: cfg('Simon de corazones', '💞', 'Repite la secuencia!', 30000) },
    { load: () => import('./HeartBeatGame.vue'), config: cfg('Al ritmo', '💓', 'Toca los corazones en la linea!', 20000) },
    { load: () => import('./HugMeterGame.vue'), config: cfg('Abrazo perfecto', '🫂', 'Suelta en la zona ideal!', 20000) },
  ],
  descansar: [
    { load: () => import('./LullabyGame.vue'), config: cfg('Nana', '🌙', 'Toca cuando pase por la zona verde!', 20000) },
    { load: () => import('./SheepCountGame.vue'), config: cfg('Cuenta ovejas', '🐑', 'Cuantas ovejas han pasado?', 20000) },
    { load: () => import('./DreamCatchGame.vue'), config: cfg('Cazasuenos', '🌠', 'Caza estrellas, evita pesadillas!', 20000) },
  ],
  vestir: [
    { load: () => import('./OutfitMemoryGame.vue'), config: cfg('Conjunto perfecto', '🧥', 'Memoriza y elige las 3 prendas!', 20000) },
    { load: () => import('./LaundryGame.vue'), config: cfg('Tendedero', '👕', 'Descuelga el color que se pide!', 20000) },
    { load: () => import('./SpotChangeGame.vue'), config: cfg('Que ha cambiado?', '🧐', 'Encuentra la prenda que cambio!', 20000) },
  ],
}

// Wrapper async de cada juego, creado una sola vez
const componentCache = new Map<GameDef, Component>()

function componentOf(def: GameDef): Component {
  let comp = componentCache.get(def)
  if (!comp) {
    comp = defineAsyncComponent(def.load)
    componentCache.set(def, comp)
  }
  return comp
}

// Ultimo juego mostrado por (accion, dificultad), para no repetir seguidos
const lastPicked = new Map<string, number>()

/**
 * Elige un juego al azar del pool (accion, dificultad).
 * Nunca repite el ultimo mostrado del mismo pool, y lanza la descarga
 * del chunk inmediatamente (la cuenta atras del shell la absorbe).
 */
export function pickGame(action: CareAction, difficulty: Difficulty): GameEntry {
  const pool = difficulty === 'advanced' ? ADVANCED_POOLS[action] : EASY_POOLS[action]
  const key = `${action}:${difficulty}`

  let idx = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && idx === lastPicked.get(key)) {
    idx = (idx + 1) % pool.length
  }
  lastPicked.set(key, idx)

  const def = pool[idx]!
  void def.load() // precarga: empieza a bajar el chunk ya
  return { component: componentOf(def), config: def.config }
}

/** Tamanos de pool (para tests y docs) */
export function poolSizes(): Record<CareAction, { easy: number; advanced: number }> {
  const actions = Object.keys(EASY_POOLS) as CareAction[]
  return Object.fromEntries(
    actions.map(a => [a, { easy: EASY_POOLS[a].length, advanced: ADVANCED_POOLS[a].length }]),
  ) as Record<CareAction, { easy: number; advanced: number }>
}
