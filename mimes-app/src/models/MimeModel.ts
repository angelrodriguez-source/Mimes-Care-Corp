/**
 * MimeModel.ts — Modelo de datos y lógica de un Mime
 *
 * Este archivo define:
 *   1. Los TIPOS (interfaces/types) — la forma de los datos
 *   2. Las CONSTANTES — configuración del juego (decay, costes, modificadores)
 *   3. Las FUNCIONES — lógica pura que transforma datos
 *
 * "Función pura" = recibe datos, devuelve datos nuevos, sin efectos secundarios.
 * No toca la pantalla, no guarda en base de datos. Solo calcula.
 */

// ============================================================
// 1. TIPOS — ¿Qué forma tienen los datos?
// ============================================================

/**
 * Las 3 personalidades posibles de un Mime.
 * En TypeScript, un "type" con strings literales funciona como un enum:
 * solo permite esos valores exactos, nada más.
 */
export type Personality = 'aventurero' | 'tranquilo' | 'picaro'

/**
 * Los 3 temas de color disponibles.
 */
export type ColorTheme = 'celeste' | 'lila' | 'melocoton'

/**
 * Las 6 estadísticas que tiene cada Mime.
 * Cada una va de 0 a 100.
 */
export type StatName = 'hambre' | 'higiene' | 'diversion' | 'carino' | 'energia' | 'apariencia'

/**
 * Las 6 acciones de cuidado que puede hacer un cuidador.
 * Cada acción afecta principalmente a una stat.
 */
export type CareAction = 'alimentar' | 'limpiar' | 'jugar' | 'carino' | 'descansar' | 'vestir'

/**
 * Los estados de ánimo del Mime.
 * Se derivan automáticamente del promedio de los stats.
 * Van de mejor a peor: euforico > feliz > normal > triste > dormido > hambriento
 *
 * Nota: "dormido" y "hambriento" son especiales — se activan cuando
 * energía o hambre están muy bajas, independientemente del promedio.
 */
export type Mood = 'euforico' | 'feliz' | '' | 'triste' | 'dormido' | 'hambriento'

/**
 * Interface = un "contrato" que dice qué campos debe tener un objeto.
 * Si creas un objeto de tipo MimeStats, TypeScript te obliga a poner los 6 campos.
 */
export interface MimeStats {
  hambre: number    // 0 = muerto de hambre, 100 = lleno
  higiene: number   // 0 = sucio, 100 = reluciente
  diversion: number // 0 = aburrido, 100 = pasándolo genial
  carino: number    // 0 = solitario, 100 = muy querido
  energia: number   // 0 = agotado, 100 = lleno de energía
  apariencia: number // 0 = descuidado, 100 = perfecto
}

/**
 * Un Mime completo con todos sus datos.
 * Esto se corresponde con las columnas de la tabla "mimes" en Supabase.
 */
export interface Mime {
  id: string
  duenoId: string
  cuidadorId: string | null // null = sin cuidador asignado
  nombre: string
  personalidad: Personality
  colorTheme: ColorTheme
  stats: MimeStats
  afinidad: number // 0-100
  lastDecayAt: Date // última vez que se aplicó el decay
}

// ============================================================
// 2. CONSTANTES — Configuración del juego
// ============================================================

/**
 * Decay base: cuántos puntos pierde CADA stat por hora.
 * Es el ritmo "normal" — luego la personalidad lo modifica.
 *
 * Ejemplo: con DECAY_PER_HOUR = 2, un stat de 70 bajará a 68 después de 1 hora.
 * En 24h sin cuidados, bajaría de 70 a 22.
 */
export const DECAY_PER_HOUR = 2

/**
 * Modificadores de personalidad.
 *
 * Cada personalidad tiene un multiplicador para cada stat:
 *   > 1.0 = ese stat decae MÁS RÁPIDO (pide mucho de eso)
 *   < 1.0 = ese stat decae MÁS LENTO (pide poco de eso)
 *   = 1.0 = ritmo normal
 *
 * Ejemplo: El Aventurero tiene diversion: 1.4, así que su diversión
 * decae un 40% más rápido que lo normal. Necesita que lo entretengan más.
 *
 * Estos valores salen directamente de la tabla del GAME_DESIGN.md:
 *   Aventurero → pide mucho: Diversión, Hambre, Energía
 *   Tranquilo  → pide mucho: Cariño, Higiene, Apariencia
 *   Pícaro     → pide mucho: Apariencia, Diversión, Cariño
 */
export const PERSONALITY_MODIFIERS: Record<Personality, Record<StatName, number>> = {
  aventurero: {
    hambre: 1.3,     // pide mucho
    higiene: 0.7,    // pide poco
    diversion: 1.4,  // pide mucho
    carino: 1.0,     // normal
    energia: 1.3,    // pide mucho
    apariencia: 0.6, // pide poco
  },
  tranquilo: {
    hambre: 0.7,     // pide poco
    higiene: 1.3,    // pide mucho
    diversion: 0.7,  // pide poco
    carino: 1.4,     // pide mucho
    energia: 0.7,    // pide poco
    apariencia: 1.3, // pide mucho
  },
  picaro: {
    hambre: 0.8,     // pide poco
    higiene: 1.0,    // normal
    diversion: 1.3,  // pide mucho
    carino: 1.2,     // pide mucho
    energia: 0.8,    // pide poco
    apariencia: 1.5, // pide mucho (el más presumido)
  },
}

/**
 * Mapeo acción → qué stat sube principalmente.
 *
 * Ejemplo: la acción "alimentar" sube el stat "hambre".
 * Esto conecta cada botón de la UI con su efecto en el Mime.
 */
export const ACTION_PRIMARY_STAT: Record<CareAction, StatName> = {
  alimentar: 'hambre',
  limpiar: 'higiene',
  jugar: 'diversion',
  carino: 'carino',
  descansar: 'energia',
  vestir: 'apariencia',
}

/**
 * Cuánto sube el stat principal con cada acción.
 * También hay un efecto secundario menor en otros stats.
 */
export const ACTION_EFFECTS: Record<CareAction, { primary: number; secondary: number }> = {
  alimentar: { primary: 25, secondary: 3 },
  limpiar: { primary: 20, secondary: 2 },
  jugar: { primary: 22, secondary: 4 },
  carino: { primary: 20, secondary: 5 },
  descansar: { primary: 30, secondary: 2 },
  vestir: { primary: 18, secondary: 1 },
}

/**
 * Coste en Puntos Mimes de cada acción.
 */
export const ACTION_COSTS: Record<CareAction, number> = {
  alimentar: 5,
  limpiar: 4,
  jugar: 6,
  carino: 3,
  descansar: 3,
  vestir: 8,
}

/**
 * Stats secundarios que sube cada acción (los que no son el principal).
 *
 * Ejemplo: "alimentar" principalmente sube "hambre", pero también un poco
 * "energia" y "carino" (el Mime se siente querido cuando le dan de comer).
 */
export const ACTION_SECONDARY_STATS: Record<CareAction, StatName[]> = {
  alimentar: ['energia', 'carino'],
  limpiar: ['apariencia', 'carino'],
  jugar: ['energia', 'carino'],
  carino: ['diversion', 'energia'],
  descansar: ['higiene', 'carino'],
  vestir: ['apariencia', 'carino'],
}

/**
 * Umbrales de ánimo: rango de promedio de stats → mood.
 * Se evalúan de arriba a abajo, el primero que coincide gana.
 *
 * Pero OJO: "dormido" y "hambriento" son prioritarios si su stat
 * específico está muy bajo (ver función deriveMood).
 */
export const MOOD_THRESHOLDS: { min: number; mood: Mood }[] = [
  { min: 80, mood: 'euforico' },
  { min: 55, mood: 'feliz' },
  { min: 30, mood: '' },       // "normal" = string vacío (sin clase CSS extra)
  { min: 0, mood: 'triste' },
]

// ============================================================
// 3. FUNCIONES — Lógica pura
// ============================================================

/**
 * Limita un número entre un mínimo y un máximo.
 *
 * Ejemplo: clamp(105, 0, 100) → 100
 *          clamp(-5, 0, 100)  → 0
 *          clamp(50, 0, 100)  → 50
 *
 * Lo usamos para asegurar que los stats nunca se salgan de 0-100.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calcula el promedio de los 6 stats.
 *
 * Ejemplo: si un Mime tiene todos los stats a 70, el promedio es 70.
 * Si tiene hambre=20, higiene=80, etc., hace la media aritmética.
 */
export function getStatsAverage(stats: MimeStats): number {
  const values = Object.values(stats)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Deriva el humor (mood) del Mime a partir de sus stats.
 *
 * Reglas especiales (tienen prioridad):
 *   - Si energía < 20 → "dormido" (está agotado, se duerme)
 *   - Si hambre < 20 → "hambriento" (no puede pensar en otra cosa)
 *
 * Si no se aplica ninguna regla especial, usamos el promedio de todos
 * los stats para determinar el humor general.
 */
export function deriveMood(stats: MimeStats): Mood {
  // Reglas especiales: si un stat crítico está muy bajo, domina el humor
  if (stats.energia < 20) return 'dormido'
  if (stats.hambre < 20) return 'hambriento'

  // Humor general basado en el promedio
  const avg = getStatsAverage(stats)

  for (const threshold of MOOD_THRESHOLDS) {
    if (avg >= threshold.min) return threshold.mood
  }

  return 'triste'
}

/**
 * Aplica el decay (deterioro) de stats según el tiempo transcurrido.
 *
 * El decay simula que los Mimes necesitan atención continua:
 * si nadie los cuida, sus stats bajan poco a poco.
 *
 * @param stats - Los stats actuales del Mime
 * @param personality - La personalidad (modifica la velocidad de decay)
 * @param elapsedHours - Cuántas horas han pasado desde el último decay
 * @returns Los stats nuevos después del decay
 *
 * Ejemplo con un Aventurero después de 2 horas:
 *   hambre: 70 - (2 * 2 * 1.3) = 70 - 5.2 = 64.8 → redondeado a 65
 *   higiene: 70 - (2 * 2 * 0.7) = 70 - 2.8 = 67.2 → redondeado a 67
 *   (la diversión baja más rápido porque el Aventurero necesita mucha)
 */
export function applyDecay(
  stats: MimeStats,
  personality: Personality,
  elapsedHours: number,
): MimeStats {
  const modifiers = PERSONALITY_MODIFIERS[personality]
  const newStats = { ...stats } // copia para no mutar el original

  // Object.keys() devuelve las claves del objeto como array de strings.
  // Recorremos cada stat y le aplicamos el decay con su modificador.
  for (const stat of Object.keys(newStats) as StatName[]) {
    const decay = DECAY_PER_HOUR * elapsedHours * modifiers[stat]
    newStats[stat] = clamp(Math.round(newStats[stat] - decay), 0, 100)
  }

  return newStats
}

/**
 * Aplica una acción de cuidado a los stats de un Mime.
 *
 * @param stats - Los stats actuales
 * @param action - Qué acción de cuidado se hizo (alimentar, limpiar, etc.)
 * @returns Los stats nuevos después de la acción
 *
 * Ejemplo: si haces "alimentar":
 *   hambre (primary) sube +25
 *   energia y carino (secondary) suben +3 cada uno
 *   el resto no cambia
 */
export function applyCareAction(stats: MimeStats, action: CareAction): MimeStats {
  const primaryStat = ACTION_PRIMARY_STAT[action]
  const effects = ACTION_EFFECTS[action]
  const secondaryStats = ACTION_SECONDARY_STATS[action]

  const newStats = { ...stats }

  // Subir el stat principal
  newStats[primaryStat] = clamp(newStats[primaryStat] + effects.primary, 0, 100)

  // Subir los stats secundarios (efecto menor)
  for (const stat of secondaryStats) {
    newStats[stat] = clamp(newStats[stat] + effects.secondary, 0, 100)
  }

  return newStats
}

/**
 * Calcula la afinidad entre dueño y cuidador.
 *
 * La afinidad es el promedio de los stats a lo largo del tiempo.
 * Aquí hacemos una versión simplificada: promedio ponderado entre
 * la afinidad anterior y los stats actuales.
 *
 * @param currentAffinity - La afinidad actual (0-100)
 * @param stats - Los stats actuales del Mime
 * @param weight - Qué tanto peso tienen los stats nuevos (0-1). Default 0.1
 * @returns La afinidad nueva
 *
 * Con weight=0.1, la afinidad cambia lentamente:
 *   - Si stats promedio = 80 y afinidad actual = 50:
 *     nueva = 50 * 0.9 + 80 * 0.1 = 45 + 8 = 53
 *   - Después: 53 * 0.9 + 80 * 0.1 = 47.7 + 8 = 55.7
 *   - Va subiendo poco a poco, no de golpe
 */
export function updateAffinity(
  currentAffinity: number,
  stats: MimeStats,
  weight: number = 0.1,
): number {
  const avg = getStatsAverage(stats)
  const newAffinity = currentAffinity * (1 - weight) + avg * weight
  return clamp(Math.round(newAffinity * 10) / 10, 0, 100)
}

/**
 * Crea los stats iniciales de un Mime recién nacido.
 * Todos empiezan a 70 (ligeramente por encima del "normal").
 */
export function createInitialStats(): MimeStats {
  return {
    hambre: 70,
    higiene: 70,
    diversion: 70,
    carino: 70,
    energia: 70,
    apariencia: 70,
  }
}

/**
 * Comprueba si un Mime debería abandonar a su cuidador.
 * Según GAME_DESIGN.md: si la afinidad baja de 10%, el Mime vuelve al dueño.
 */
export function shouldAbandon(afinidad: number): boolean {
  return afinidad < 10
}
