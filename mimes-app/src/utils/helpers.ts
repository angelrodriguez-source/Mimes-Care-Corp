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
