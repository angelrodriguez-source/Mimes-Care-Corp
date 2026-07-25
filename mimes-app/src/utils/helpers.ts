/**
 * helpers.ts — Utilidades compartidas
 *
 * Funciones auxiliares reutilizables en toda la app.
 */
import type { MimeStats } from '../models/MimeModel'

/**
 * Convierte un registro de Mime de la DB (campos planos) a MimeStats.
 */
export function toStats(m: {
  hambre: number
  higiene: number
  diversion: number
  carino: number
  energia: number
  apariencia: number
}): MimeStats {
  return {
    hambre: m.hambre,
    higiene: m.higiene,
    diversion: m.diversion,
    carino: m.carino,
    energia: m.energia,
    apariencia: m.apariencia,
  }
}

/**
 * Convierte MimeStats a un objeto plano para updates de Supabase.
 */
export function statsToDbFields(stats: MimeStats) {
  return {
    hambre: stats.hambre,
    higiene: stats.higiene,
    diversion: stats.diversion,
    carino: stats.carino,
    energia: stats.energia,
    apariencia: stats.apariencia,
  }
}

/**
 * Copia texto al portapapeles con fallback para movil.
 * Retorna true si se copio correctamente.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

/**
 * Convierte una fecha a texto relativo amigable en español:
 *   - hace <1 min  -> "ahora"
 *   - mismo dia    -> "hace 5 min" / "hace 2 h"
 *   - dia anterior -> "ayer"
 *   - mas antiguo  -> "12 mar" (con año si no es el actual: "12 mar 2025")
 *
 * Lo usan los historiales de mensajes y de Puntos Mimes.
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHoras = Math.floor(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras} h`

  // ¿Fue ayer? (comparacion por dia de calendario, no por 24h exactas)
  const ayer = new Date(now)
  ayer.setDate(now.getDate() - 1)
  if (
    d.getDate() === ayer.getDate() &&
    d.getMonth() === ayer.getMonth() &&
    d.getFullYear() === ayer.getFullYear()
  ) {
    return 'ayer'
  }

  const base = `${d.getDate()} ${MESES_CORTOS[d.getMonth()] ?? ''}`
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`
}
