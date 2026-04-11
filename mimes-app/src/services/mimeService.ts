/**
 * mimeService.ts — Operaciones de base de datos para Mimes
 *
 * Centraliza todas las llamadas a Supabase relacionadas con Mimes.
 * Los componentes llaman a estas funciones en vez de usar supabase directamente.
 */
import { supabase } from './supabase'
import { createInitialStats, applyDecay, shouldAbandon } from '../models/MimeModel'
import { statsToDbFields, toStats } from '../utils/helpers'
import { INITIAL_PUNTOS, CESION_DURATION_DAYS, PM_PER_AFFINITY } from '../constants/gameConstants'
import type { MimeStats, Personality, ColorTheme, CareAction } from '../models/MimeModel'

// --- TIPOS ---

export interface MimeFromDB {
  id: string
  nombre: string
  personalidad: Personality
  color_theme: ColorTheme
  hambre: number
  higiene: number
  diversion: number
  carino: number
  energia: number
  apariencia: number
  afinidad: number
  dueno_id: string
  cuidador_id: string | null
  share_code: string | null
  last_decay_at?: string
  cesion_start?: string | null
  created_at?: string
}

export interface MimeWithNames extends MimeFromDB {
  dueno_name?: string
  cuidador_name?: string
}

// --- CARGAR MIME ---

export async function fetchMimeById(id: string) {
  const { data, error } = await supabase
    .from('mimes')
    .select('*')
    .eq('id', id)
    .single()

  return { mime: data as MimeFromDB | null, error }
}

// --- ACTUALIZAR STATS ---

export async function updateMimeStats(
  mimeId: string,
  stats: MimeStats,
  afinidad: number,
) {
  return supabase
    .from('mimes')
    .update({ ...statsToDbFields(stats), afinidad })
    .eq('id', mimeId)
}

// --- REGISTRAR ACCION DE CUIDADO ---

export async function logCareAction(
  mimeId: string,
  cuidadorId: string,
  action: CareAction,
  cost: number,
) {
  return supabase
    .from('care_actions')
    .insert({
      mime_id: mimeId,
      cuidador_id: cuidadorId,
      action_type: action,
      puntos_cost: cost,
    })
}

// --- ACTUALIZAR PUNTOS DEL USUARIO ---

export async function updateUserPoints(userId: string, puntos: number) {
  return supabase
    .from('profiles')
    .update({ puntos_mimes: puntos })
    .eq('id', userId)
}

// --- RESET DE UN MIME ---

export async function resetMime(mimeId: string, userId: string) {
  const initialStats = createInitialStats()
  return Promise.all([
    supabase
      .from('mimes')
      .update({ ...statsToDbFields(initialStats), afinidad: 0 })
      .eq('id', mimeId),
    updateUserPoints(userId, INITIAL_PUNTOS),
  ])
}

// --- RESET DE TODOS LOS MIMES DE UN USUARIO ---

export async function resetAllMimes(userId: string) {
  const initialStats = createInitialStats()
  await supabase
    .from('mimes')
    .update({
      ...statsToDbFields(initialStats),
      afinidad: 0,
      cuidador_id: null,
      share_code: null,
    })
    .eq('dueno_id', userId)

  await updateUserPoints(userId, INITIAL_PUNTOS)
}

// --- CARGAR MIMES DEL DASHBOARD ---

export async function loadDashboardData(userId: string) {
  // Cargar Mimes propios y a cargo en paralelo
  const [ownResult, caringResult] = await Promise.all([
    supabase.from('mimes').select('*').eq('dueno_id', userId).order('created_at'),
    supabase.from('mimes').select('*').eq('cuidador_id', userId).order('created_at'),
  ])

  const own = (ownResult.data ?? []) as MimeFromDB[]
  const caring = (caringResult.data ?? []) as MimeFromDB[]

  // Recoger IDs de usuarios para buscar nombres
  const userIds = new Set<string>()
  own.forEach(m => { if (m.cuidador_id) userIds.add(m.cuidador_id) })
  caring.forEach(m => { userIds.add(m.dueno_id) })

  // Buscar nombres de perfiles
  const profileMap: Record<string, string> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', Array.from(userIds))

    profiles?.forEach(p => { profileMap[p.id] = p.display_name })
  }

  // Enriquecer con nombres
  const myMimes: MimeWithNames[] = own.map(m => ({
    ...m,
    cuidador_name: m.cuidador_id ? profileMap[m.cuidador_id] : undefined,
  }))

  const caringMimes: MimeWithNames[] = caring.map(m => ({
    ...m,
    dueno_name: profileMap[m.dueno_id] || 'Desconocido',
  }))

  return { myMimes, caringMimes }
}

// --- RPC: COMPARTIR ---

export async function generateShareCode(mimeId: string) {
  return supabase.rpc('generate_share_code', { p_mime_id: mimeId })
}

// --- RPC: ADOPTAR ---

export async function claimMime(code: string) {
  return supabase.rpc('claim_mime', { p_code: code.trim().toUpperCase() })
}

// --- RPC: SOLTAR ---

export async function releaseMime(mimeId: string) {
  return supabase.rpc('release_mime', { p_mime_id: mimeId })
}

// --- CARGAR MIMES PARA HOME ---

export async function loadAllMimes() {
  const { data, error } = await supabase
    .from('mimes')
    .select('*')
    .order('created_at')

  return { mimes: (data ?? []) as MimeFromDB[], error }
}

// --- LAZY DECAY: calcula y aplica el decay acumulado al cargar un Mime ---

export async function applyLazyDecay<T extends MimeFromDB>(mime: T): Promise<T> {
  const now = new Date()
  const lastDecay = new Date(mime.last_decay_at ?? mime.created_at ?? now)
  const elapsedMs = now.getTime() - lastDecay.getTime()
  const elapsedHours = elapsedMs / (1000 * 60 * 60)

  // Solo aplicar si ha pasado al menos 1 minuto
  if (elapsedHours < 1 / 60) return mime

  const oldStats = toStats(mime)
  const newStats = applyDecay(oldStats, mime.personalidad, elapsedHours)

  // Solo persistir si los stats cambiaron
  const changed = Object.keys(newStats).some(
    k => newStats[k as keyof MimeStats] !== oldStats[k as keyof MimeStats]
  )

  if (!changed) return mime

  await supabase
    .from('mimes')
    .update({ ...statsToDbFields(newStats), last_decay_at: now.toISOString() })
    .eq('id', mime.id)

  return { ...mime, ...statsToDbFields(newStats), last_decay_at: now.toISOString() }
}

// --- ABANDONO AUTOMATICO: si afinidad < 10%, el Mime vuelve al dueño ---

export async function checkAbandon(mime: MimeFromDB): Promise<{ abandoned: boolean }> {
  if (!mime.cuidador_id) return { abandoned: false }
  if (!shouldAbandon(mime.afinidad)) return { abandoned: false }

  await supabase
    .from('mimes')
    .update({ cuidador_id: null, share_code: null, afinidad: 0 })
    .eq('id', mime.id)

  return { abandoned: true }
}

// --- CESION: comprobar si han pasado 7 dias ---

export interface CesionResult {
  expired: boolean
  reward?: number           // PM ganados por el cuidador
  cuidadorId?: string       // para actualizar sus puntos
}

export async function checkCesionExpiry(mime: MimeFromDB): Promise<CesionResult> {
  if (!mime.cuidador_id || !mime.cesion_start) return { expired: false }

  const now = new Date()
  const start = new Date(mime.cesion_start)
  const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (elapsedDays < CESION_DURATION_DAYS) return { expired: false }

  // Cesion expirada: calcular recompensa
  const reward = Math.round((mime.afinidad / 100) * PM_PER_AFFINITY)
  const cuidadorId = mime.cuidador_id

  // Buscar puntos actuales del cuidador
  const { data: profile } = await supabase
    .from('profiles')
    .select('puntos_mimes')
    .eq('id', cuidadorId)
    .single()

  const currentPuntos = profile?.puntos_mimes ?? 0

  // Devolver Mime al dueno + dar PM al cuidador
  await Promise.all([
    supabase
      .from('mimes')
      .update({
        cuidador_id: null,
        share_code: null,
        afinidad: 0,
        cesion_start: null,
      })
      .eq('id', mime.id),
    supabase
      .from('profiles')
      .update({ puntos_mimes: currentPuntos + reward })
      .eq('id', cuidadorId),
  ])

  return { expired: true, reward, cuidadorId }
}

// --- DIAS RESTANTES DE CESION ---

export function getCesionDaysLeft(cesionStart: string | null | undefined): number | null {
  if (!cesionStart) return null
  const start = new Date(cesionStart)
  const now = new Date()
  const elapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const remaining = Math.max(0, Math.ceil(CESION_DURATION_DAYS - elapsed))
  return remaining
}

// --- DIA ACTUAL DE CESION (para crecimiento) ---

export function getCesionDay(cesionStart: string | null | undefined): number {
  if (!cesionStart) return 1
  const start = new Date(cesionStart)
  const now = new Date()
  const elapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.min(7, Math.max(1, Math.ceil(elapsed)))
}

// --- RENOMBRAR MIME ---

export async function renameMime(mimeId: string, nombre: string) {
  return supabase
    .from('mimes')
    .update({ nombre })
    .eq('id', mimeId)
}

// --- PERSISTIR RESULTADO DE MINI-JUEGO ---

export async function persistCareActionResult(
  mimeId: string,
  userId: string,
  action: CareAction,
  cost: number,
  stats: MimeStats,
  afinidad: number,
  puntos: number,
) {
  return Promise.all([
    updateMimeStats(mimeId, stats, afinidad),
    logCareAction(mimeId, userId, action, cost),
    updateUserPoints(userId, puntos),
  ])
}

// --- RECOMPENSA DIARIA POR LOGIN ---

export interface DailyRewardResult {
  already_claimed: boolean
  streak: number
  reward: number
  puntos_mimes: number
  error?: string
}

/**
 * Reclama la recompensa diaria via RPC. Envia la fecha local del cliente
 * (YYYY-MM-DD en TZ del navegador) para que la decision "hoy" no dependa
 * de la TZ del servidor Postgres (UTC en Supabase).
 *
 * El RPC es atomico e idempotente: si el usuario ya reclamo hoy, devuelve
 * already_claimed=true sin modificar puntos.
 */
export async function claimDailyReward(): Promise<DailyRewardResult> {
  // 'sv-SE' devuelve YYYY-MM-DD en la TZ local del navegador
  const clientDate = new Date().toLocaleDateString('sv-SE')
  const { data, error } = await supabase.rpc('claim_daily_reward', {
    p_client_date: clientDate,
  })
  if (error) {
    return {
      already_claimed: false,
      streak: 0,
      reward: 0,
      puntos_mimes: 0,
      error: error.message,
    }
  }
  return data as DailyRewardResult
}

// --- TUTORIAL INTERACTIVO ---

/**
 * Marca el tutorial como completado en el profile del usuario.
 * Llama al RPC `mark_tutorial_completed` que hace UPDATE para auth.uid().
 */
export async function markTutorialCompleted(): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('mark_tutorial_completed')
  if (error) return { error: error.message }
  return {}
}
