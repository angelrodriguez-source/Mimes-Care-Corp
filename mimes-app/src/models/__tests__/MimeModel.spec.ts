/**
 * Tests de la logica pura del juego (MimeModel).
 *
 * MimeModel no tiene side-effects (ni DOM ni Supabase), asi que se
 * testea directo: entrada → salida. Ejecutar con `npm run test`.
 */
import { describe, it, expect } from 'vitest'
import {
  applyDecay,
  applyCareAction,
  updateAffinity,
  deriveMood,
  getStatsAverage,
  createInitialStats,
  shouldAbandon,
  ACTION_EFFECTS,
  ACTION_PRIMARY_STAT,
  PERSONALITY_MODIFIERS,
  type MimeStats,
} from '../MimeModel'

function statsWith(overrides: Partial<MimeStats> = {}): MimeStats {
  return { ...createInitialStats(), ...overrides }
}

describe('createInitialStats', () => {
  it('todos los stats empiezan a 70', () => {
    const stats = createInitialStats()
    for (const value of Object.values(stats)) {
      expect(value).toBe(70)
    }
  })
})

describe('getStatsAverage', () => {
  it('calcula la media de los 6 stats', () => {
    expect(getStatsAverage(createInitialStats())).toBe(70)
    expect(getStatsAverage(statsWith({ hambre: 10 }))).toBe(60)
  })
})

describe('applyDecay', () => {
  it('resta puntos segun las horas transcurridas', () => {
    const decayed = applyDecay(createInitialStats(), 'tranquilo', 5)
    // Con DECAY_PER_HOUR=2 y modificadores, tras 5h todo baja
    for (const key of Object.keys(decayed) as (keyof MimeStats)[]) {
      expect(decayed[key]).toBeLessThan(70)
    }
  })

  it('nunca baja de 0', () => {
    const decayed = applyDecay(createInitialStats(), 'aventurero', 10000)
    for (const value of Object.values(decayed)) {
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  it('con 0 horas no cambia nada', () => {
    expect(applyDecay(createInitialStats(), 'picaro', 0)).toEqual(createInitialStats())
  })

  it('cada personalidad tiene modificadores definidos', () => {
    for (const personality of ['aventurero', 'tranquilo', 'picaro'] as const) {
      expect(PERSONALITY_MODIFIERS[personality]).toBeDefined()
    }
  })
})

describe('applyCareAction', () => {
  it('sube el stat principal segun ACTION_EFFECTS', () => {
    const stats = statsWith({ hambre: 40 })
    const result = applyCareAction(stats, 'alimentar')
    expect(result.hambre).toBe(40 + ACTION_EFFECTS.alimentar.primary)
  })

  it('no pasa de 100 (clamp)', () => {
    const result = applyCareAction(statsWith({ hambre: 95 }), 'alimentar')
    expect(result.hambre).toBe(100)
  })

  it('no muta los stats originales', () => {
    const stats = statsWith()
    applyCareAction(stats, 'jugar')
    expect(stats).toEqual(statsWith())
  })

  it('el multiplicador avanzado sube mas que el normal', () => {
    const stats = statsWith({ diversion: 30 })
    const normal = applyCareAction(stats, 'jugar', 1)
    const advanced = applyCareAction(stats, 'jugar', 1.5)
    expect(advanced.diversion).toBeGreaterThan(normal.diversion)
    expect(advanced.diversion).toBe(30 + Math.round(ACTION_EFFECTS.jugar.primary * 1.5))
  })

  it('cada accion tiene stat principal definido', () => {
    for (const action of ['alimentar', 'limpiar', 'jugar', 'carino', 'descansar', 'vestir'] as const) {
      expect(ACTION_PRIMARY_STAT[action]).toBeDefined()
    }
  })
})

describe('updateAffinity', () => {
  it('sube lentamente hacia la media de stats', () => {
    const result = updateAffinity(50, statsWith({ }), 0.1) // media 70
    expect(result).toBe(52) // 50*0.9 + 70*0.1 = 52
  })

  it('con mas peso sube mas rapido', () => {
    const slow = updateAffinity(50, statsWith(), 0.1)
    const fast = updateAffinity(50, statsWith(), 0.15)
    expect(fast).toBeGreaterThan(slow)
  })

  it('se mantiene en el rango 0-100', () => {
    expect(updateAffinity(100, statsWith(), 1)).toBeLessThanOrEqual(100)
    expect(updateAffinity(0, statsWith({ hambre: 0, higiene: 0, diversion: 0, carino: 0, energia: 0, apariencia: 0 }), 1)).toBe(0)
  })
})

describe('deriveMood', () => {
  it('energia < 20 → dormido (prioridad maxima)', () => {
    expect(deriveMood(statsWith({ energia: 10 }))).toBe('dormido')
  })

  it('hambre < 20 → hambriento', () => {
    expect(deriveMood(statsWith({ hambre: 10 }))).toBe('hambriento')
  })

  it('media >= 80 → euforico', () => {
    const alto = statsWith({ hambre: 90, higiene: 90, diversion: 90, carino: 90, energia: 90, apariencia: 90 })
    expect(deriveMood(alto)).toBe('euforico')
  })

  it('media < 30 → triste', () => {
    const bajo = statsWith({ hambre: 25, higiene: 25, diversion: 25, carino: 25, energia: 25, apariencia: 25 })
    expect(deriveMood(bajo)).toBe('triste')
  })
})

describe('shouldAbandon', () => {
  it('abandona con afinidad < 10', () => {
    expect(shouldAbandon(9.9)).toBe(true)
    expect(shouldAbandon(0)).toBe(true)
  })

  it('no abandona con afinidad >= 10', () => {
    expect(shouldAbandon(10)).toBe(false)
    expect(shouldAbandon(50)).toBe(false)
  })
})
