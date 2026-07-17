/**
 * Tests de las utilidades compartidas (helpers.ts).
 */
import { describe, it, expect } from 'vitest'
import { toStats, statsToDbFields } from '../helpers'

const DB_ROW = {
  hambre: 10,
  higiene: 20,
  diversion: 30,
  carino: 40,
  energia: 50,
  apariencia: 60,
}

describe('toStats', () => {
  it('extrae solo los 6 stats de un registro de DB', () => {
    const stats = toStats({ ...DB_ROW, id: 'x', nombre: 'Mimo' } as never)
    expect(stats).toEqual(DB_ROW)
  })
})

describe('statsToDbFields', () => {
  it('convierte MimeStats a objeto plano para Supabase', () => {
    expect(statsToDbFields(DB_ROW)).toEqual(DB_ROW)
  })

  it('ida y vuelta sin perdida: toStats(statsToDbFields(x)) === x', () => {
    expect(toStats(statsToDbFields(DB_ROW))).toEqual(DB_ROW)
  })
})
