/**
 * Tests de las utilidades compartidas (helpers.ts).
 */
import { describe, it, expect } from 'vitest'
import { toStats, statsToDbFields, formatRelativeDate } from '../helpers'

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

describe('formatRelativeDate', () => {
  it('menos de un minuto -> "ahora"', () => {
    expect(formatRelativeDate(new Date())).toBe('ahora')
  })

  it('minutos y horas del mismo dia', () => {
    const hace5min = new Date(Date.now() - 5 * 60_000)
    expect(formatRelativeDate(hace5min)).toBe('hace 5 min')

    const hace3h = new Date(Date.now() - 3 * 3_600_000)
    expect(formatRelativeDate(hace3h)).toBe('hace 3 h')
  })

  it('el dia anterior -> "ayer"', () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    expect(formatRelativeDate(ayer)).toBe('ayer')
  })

  it('fechas antiguas usan dia y mes abreviado', () => {
    const antigua = new Date(2020, 2, 12) // 12 de marzo de 2020
    expect(formatRelativeDate(antigua)).toBe('12 mar 2020')
  })

  it('acepta tanto Date como string ISO', () => {
    const d = new Date(Date.now() - 2 * 3_600_000)
    expect(formatRelativeDate(d.toISOString())).toBe(formatRelativeDate(d))
  })
})
