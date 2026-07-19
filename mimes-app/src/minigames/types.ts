/**
 * Tipos compartidos para los mini-juegos.
 *
 * Cada mini-juego tiene la misma interfaz:
 *   - Recibe `active` (el juego está en marcha)
 *   - Emite `complete` con el resultado
 *
 * MiniGameShell se encarga del flujo: cuenta atrás → juego → resultado.
 * Los juegos individuales solo se preocupan de su mecánica.
 * Las configuraciones viven en los pools de `index.ts`.
 */

/** Resultado de un mini-juego */
export interface MiniGameResult {
  success: boolean
}

/** Configuración de un mini-juego */
export interface MiniGameConfig {
  /** Título que se muestra en la cuenta atrás */
  title: string
  /** Icono del juego */
  icon: string
  /** Instrucción breve */
  instruction: string
  /** Duración en ms */
  duration: number
  /** Si true, que el timer llegue a 0 cuenta como victoria (ej: RestGame) */
  timeoutIsWin?: boolean
}
