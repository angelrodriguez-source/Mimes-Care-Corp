/**
 * mimeService.ts — Operaciones de base de datos para Mimes
 *
 * Centraliza todas las llamadas a Supabase relacionadas con Mimes.
 * Los componentes llaman a estas funciones en vez de usar supabase directamente.
 */
import { supabase } from './supabase'
import { createInitialStats, applyDecay, shouldAbandon } from '../models/MimeModel'
import { statsToDbFields, toStats } from '../utils/helpers'
import {
  INITIAL_PUNTOS,
  CESION_DURATION_DAYS,
  getAccessory,
} from '../constants/gameConstants'
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
  /** null en el Mime inicial: no tiene dueno hasta que se gradua (v13) */
  dueno_id: string | null
  cuidador_id: string | null
  share_code: string | null
  last_decay_at?: string
  cesion_start?: string | null
  accessory?: string | null
  /** Mime inicial: al acabar su semana se convierte en propiedad del cuidador */
  is_starter?: boolean
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

/** Categorias de movimiento de PM (deben coincidir con el libro mayor, v12) */
export type PmReason = 'diaria' | 'cesion' | 'video' | 'accion' | 'tienda' | 'truco' | 'ajuste'

/**
 * Suma (o resta) PM de forma atomica via RPC `add_points` (migracion v7).
 * Desde la v12 registra el movimiento en el libro mayor (pm_ledger) con
 * su motivo y detalle, que es lo que alimenta el historial de PM.
 * Si el RPC aun no existe, cae al metodo antiguo (leer + escribir absoluto).
 */
export async function addPoints(
  userId: string,
  delta: number,
  reason: PmReason = 'ajuste',
  detail?: string,
): Promise<{ puntos: number | null; error: string | null }> {
  const { data, error } = await supabase.rpc('add_points', {
    p_delta: delta,
    p_reason: reason,
    p_detail: detail ?? null,
  })
  if (!error) {
    const res = data as { puntos_mimes?: number; error?: string }
    return { puntos: res?.puntos_mimes ?? null, error: res?.error ?? null }
  }

  // Fallback pre-v7: no atomico, pero funcional
  const { data: prof } = await supabase
    .from('profiles')
    .select('puntos_mimes')
    .eq('id', userId)
    .single()
  const nuevo = Math.max(0, (prof?.puntos_mimes ?? 0) + delta)
  const { error: upErr } = await updateUserPoints(userId, nuevo)
  return { puntos: nuevo, error: upErr?.message ?? null }
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
  // El Mime inicial no tiene dueno, asi que no hay nombre que buscar
  caring.forEach(m => { if (m.dueno_id) userIds.add(m.dueno_id) })

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
    // Sin dueno (Mime inicial) se deja undefined: la tarjeta muestra su
    // propia etiqueta en vez de "De Desconocido"
    dueno_name: m.dueno_id ? (profileMap[m.dueno_id] || 'Desconocido') : undefined,
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

  // El Mime inicial no abandona: no tiene dueno al que volver (y el
  // trigger protect_mime_identity rechazaria el UPDATE del cliente)
  if (mime.is_starter) return { abandoned: false }

  // No abandonar durante las primeras 24h de cesion — el cuidador
  // aun no ha tenido tiempo de interactuar y la afinidad empieza en 0
  if (mime.cesion_start) {
    const hoursElapsed = (Date.now() - new Date(mime.cesion_start).getTime()) / (1000 * 60 * 60)
    if (hoursElapsed < 24) return { abandoned: false }
  }

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
  /** True si era el Mime inicial y ha pasado a ser propiedad del cuidador */
  graduated?: boolean
  /** True si los PM han ido al dueno (cesion normal); false en el Mime inicial */
  paidOwner?: boolean
  cuidadorName?: string
  mimeName?: string
}

export async function checkCesionExpiry(mime: MimeFromDB): Promise<CesionResult> {
  if (!mime.cuidador_id || !mime.cesion_start) return { expired: false }

  const now = new Date()
  const start = new Date(mime.cesion_start)
  const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (elapsedDays < CESION_DURATION_DAYS) return { expired: false }

  // RPC atomico: aunque dueno y cuidador detecten la expiracion a la vez,
  // el FOR UPDATE del servidor garantiza que solo se paga una vez. Desde
  // la v14 el pago va al DUENO (o al cuidador si es el Mime inicial).
  const { data, error } = await supabase.rpc('expire_cesion', { p_mime_id: mime.id })

  // Sin fallback a proposito: replicar el cierre en el cliente ya no seria
  // atomico ni sabria a quien pagar. Si el RPC falla, no se toca nada y se
  // reintenta en la siguiente carga.
  if (error || !data || data.error) return { expired: false }

  return {
    expired: !!data.expired,
    reward: data.reward,
    cuidadorId: data.cuidador_id,
    cuidadorName: data.cuidador_name ?? undefined,
    graduated: !!data.graduated,
    paidOwner: !!data.paid_owner,
    mimeName: data.mime_name,
  }
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

/**
 * Guarda el resultado completo de un mini-juego (stats + log + cobro de PM).
 * El coste se cobra como delta atomico via addPoints (no valor absoluto).
 * Devuelve el primer error encontrado (o null si todo se guardo bien)
 * para que la UI pueda avisar al usuario si sus cambios no persistieron.
 */
export async function persistCareActionResult(
  mimeId: string,
  userId: string,
  action: CareAction,
  cost: number,
  stats: MimeStats,
  afinidad: number,
): Promise<{ error: string | null }> {
  try {
    const [statsRes, actionRes, pointsRes] = await Promise.all([
      updateMimeStats(mimeId, stats, afinidad),
      logCareAction(mimeId, userId, action, cost),
      addPoints(userId, -cost, 'accion', action),
    ])
    const err = statsRes.error?.message ?? actionRes.error?.message ?? pointsRes.error
    return { error: err ?? null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error de red' }
  }
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

// --- MENSAJERIA (dueno -> Mime -> cuidador) ---

export interface MimeMessage {
  id: string
  mime_id: string
  sender_type: 'dueno' | 'mime'
  content: string
  read: boolean
  created_at: string
}

/** El dueno deja un mensaje que el Mime "dira" a su cuidador */
export async function sendMimeMessage(mimeId: string, content: string) {
  const { error } = await supabase.from('messages').insert({
    mime_id: mimeId,
    sender_type: 'dueno',
    content: content.trim().slice(0, 200),
  })
  return { error: error?.message ?? null }
}

/** Mensajes sin leer de un Mime (los que el Mime aun tiene que "decir") */
export async function fetchUnreadMessages(mimeId: string): Promise<MimeMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('mime_id', mimeId)
    .eq('read', false)
    .order('created_at')
  return (data ?? []) as MimeMessage[]
}

/** Marca un mensaje como leido (requiere policy de UPDATE de la v7) */
export async function markMessageRead(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', messageId)
  return { error: error?.message ?? null }
}

// --- REALTIME (requiere publicacion de la migracion v7) ---

/**
 * Suscripcion en vivo a cambios en los Mimes de un dueno.
 * Devuelve una funcion para cancelar la suscripcion.
 */
export function subscribeMimesChanges(
  userId: string,
  onChange: (mime: MimeFromDB) => void,
): () => void {
  const channel = supabase
    .channel(`mimes-de-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mimes', filter: `dueno_id=eq.${userId}` },
      payload => onChange(payload.new as MimeFromDB),
    )
    .subscribe()

  return () => { void supabase.removeChannel(channel) }
}

/**
 * Suscripcion en vivo a mensajes nuevos de un Mime (para que el cuidador
 * vea la burbuja aparecer sin recargar). Devuelve funcion de cancelacion.
 */
export function subscribeMimeMessages(
  mimeId: string,
  onMessage: (msg: MimeMessage) => void,
): () => void {
  const channel = supabase
    .channel(`mensajes-${mimeId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `mime_id=eq.${mimeId}` },
      payload => onMessage(payload.new as MimeMessage),
    )
    .subscribe()

  return () => { void supabase.removeChannel(channel) }
}

// --- TIENDA DE ACCESORIOS (requiere columnas de la migracion v7) ---

/** Accesorios que el usuario ya compro (ids del catalogo) */
export async function getOwnedAccessories(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('owned_accessories')
    .eq('id', userId)
    .single()
  // Pre-v7 la columna no existe: tratamos como "sin accesorios"
  if (error) return []
  return (data?.owned_accessories ?? []) as string[]
}

/** Compra un accesorio: cobra el precio y lo anade a la coleccion */
export async function buyAccessory(
  userId: string,
  accessoryId: string,
  price: number,
  owned: string[],
): Promise<{ error: string | null }> {
  if (owned.includes(accessoryId)) return { error: 'Ya lo tienes' }

  const nombre = getAccessory(accessoryId)?.label ?? accessoryId
  const { error: payErr } = await addPoints(userId, -price, 'tienda', nombre)
  if (payErr) return { error: payErr }

  const { error } = await supabase
    .from('profiles')
    .update({ owned_accessories: [...owned, accessoryId] })
    .eq('id', userId)

  if (error) {
    // Devolver los PM si no se pudo guardar la compra
    await addPoints(userId, price, 'ajuste', `Devolucion: ${nombre}`)
    return { error: error.message }
  }
  return { error: null }
}

/** Equipa (o quita, con null) un accesorio a un Mime */
export async function equipAccessory(mimeId: string, accessoryId: string | null) {
  const { error } = await supabase
    .from('mimes')
    .update({ accessory: accessoryId })
    .eq('id', mimeId)
  return { error: error?.message ?? null }
}

// --- OLA 1: HISTORICO, BONUS DE VIDEO Y MIME LEGENDARIO ---

/** Historial completo de mensajes de un Mime (mas antiguos primero) */
export async function fetchMessageHistory(mimeId: string, limit = 50): Promise<MimeMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('mime_id', mimeId)
    .order('created_at', { ascending: true })
    .limit(limit)
  return (data ?? []) as MimeMessage[]
}

export interface VideoBonusResult {
  success?: boolean
  count: number
  puntos_mimes: number
  error?: string
}

/**
 * Reclama el bonus de video (+5 PM, max 3/dia). RPC atomico de la v10;
 * la fecha viaja en TZ local del cliente como en claim_daily_reward.
 */
export async function claimVideoBonus(): Promise<VideoBonusResult> {
  const clientDate = new Date().toLocaleDateString('sv-SE')
  const { data, error } = await supabase.rpc('claim_video_bonus', {
    p_client_date: clientDate,
  })
  if (error) return { count: 0, puntos_mimes: 0, error: error.message }
  return data as VideoBonusResult
}

/**
 * Desbloquea el Mime legendario (dorado) si el usuario completo 3
 * cesiones y aun no lo tiene. RPC de la v10.
 */
export async function unlockLegendary(): Promise<{ success?: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('unlock_legendary')
  if (error) return { error: error.message }
  return data as { success?: boolean; error?: string }
}

// --- HISTORIAL DE PUNTOS MIMES (libro mayor, v12) ---

export interface PmEntry {
  id: number
  delta: number
  reason: PmReason
  detail: string | null
  balance_after: number | null
  created_at: string
}

/**
 * Ultimos movimientos de PM del usuario autenticado. La RLS de
 * pm_ledger ya filtra por usuario, asi que no hace falta pasar el id.
 */
export async function fetchPmHistory(limit = 40): Promise<PmEntry[]> {
  const { data, error } = await supabase
    .from('pm_ledger')
    .select('id, delta, reason, detail, balance_after, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  // Pre-v12 la tabla no existe: historial vacio en vez de romper la UI
  if (error) return []
  return (data ?? []) as PmEntry[]
}
