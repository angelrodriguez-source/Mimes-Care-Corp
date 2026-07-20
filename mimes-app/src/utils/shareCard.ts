/**
 * shareCard.ts — Generador de tarjetas de logro compartibles
 *
 * Dibuja una tarjeta cuadrada (1080x1080) en un canvas con el logro del
 * jugador y la comparte via Web Share API (con imagen si el dispositivo
 * lo soporta). Fallbacks: compartir solo texto o copiar al portapapeles.
 */
import { copyToClipboard } from './helpers'

/** Datos necesarios para componer la tarjeta de logro. */
export interface ShareCardData {
  /** Titulo principal, ej: "He criado a Trufa" */
  titulo: string
  /** Linea secundaria, ej: "Afinidad 92% · 7 dias de cesion" */
  subtitulo: string
  /** Emoji grande central, ej: '🐣' o '👑' */
  emoji: string
  /** Paleta del fondo (default: 'celeste') */
  colorTheme?: 'celeste' | 'lila' | 'melocoton' | 'dorado'
}

/** Lado del canvas cuadrado de la tarjeta. */
const LADO = 1080

/** URL publica del juego (sin protocolo, para el pie de la tarjeta). */
const URL_CORTA = 'angelrodriguez-source.github.io/Mimes-Care-Corp'

/** URL completa del juego (para el texto compartido). */
const URL_JUEGO = 'https://angelrodriguez-source.github.io/Mimes-Care-Corp/'

/** Gradientes [colorInicio, colorFin] por tema. */
const TEMAS: Record<NonNullable<ShareCardData['colorTheme']>, [string, string]> = {
  celeste: ['#1565c0', '#42a5f5'],
  lila: ['#4a148c', '#ab47bc'],
  melocoton: ['#e65100', '#ffb74d'],
  dorado: ['#b8860b', '#ffd700'],
}

/**
 * Divide un texto en lineas que no excedan el ancho maximo indicado.
 * Corta por palabras usando measureText del contexto actual.
 */
function partirEnLineas(ctx: CanvasRenderingContext2D, texto: string, anchoMax: number): string[] {
  const palabras = texto.split(' ')
  const lineas: string[] = []
  let lineaActual = ''

  for (const palabra of palabras) {
    const candidata = lineaActual === '' ? palabra : `${lineaActual} ${palabra}`
    if (ctx.measureText(candidata).width <= anchoMax || lineaActual === '') {
      // Cabe en la linea actual (o es la primera palabra, que va si o si)
      lineaActual = candidata
    } else {
      // No cabe: cerramos la linea y empezamos otra con esta palabra
      lineas.push(lineaActual)
      lineaActual = palabra
    }
  }
  if (lineaActual !== '') lineas.push(lineaActual)
  return lineas
}

/**
 * Dibuja la tarjeta completa en un canvas nuevo y lo devuelve.
 */
function dibujarTarjeta(data: ShareCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = LADO
  canvas.height = LADO
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas')

  // --- Fondo: gradiente diagonal segun el tema elegido ---
  const [colorIni, colorFin] = TEMAS[data.colorTheme ?? 'celeste']
  const gradiente = ctx.createLinearGradient(0, 0, LADO, LADO)
  gradiente.addColorStop(0, colorIni)
  gradiente.addColorStop(1, colorFin)
  ctx.fillStyle = gradiente
  ctx.fillRect(0, 0, LADO, LADO)

  // --- Circulos decorativos semitransparentes ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  const circulos: Array<[number, number, number]> = [
    [140, 160, 180],
    [960, 120, 130],
    [1000, 860, 220],
    [90, 940, 150],
    [540, 60, 90],
  ]
  for (const [cx, cy, radio] of circulos) {
    ctx.beginPath()
    ctx.arc(cx, cy, radio, 0, Math.PI * 2)
    ctx.fill()
  }

  // Alineacion centrada para todos los textos
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // --- Emoji central enorme ---
  ctx.font = '340px serif'
  ctx.fillText(data.emoji, LADO / 2, 360)

  // --- Titulo en blanco, con salto de linea si excede el ancho ---
  ctx.fillStyle = '#ffffff'
  ctx.font = "bold 72px 'Baloo 2', sans-serif"
  const lineasTitulo = partirEnLineas(ctx, data.titulo, LADO - 160)
  const interlinea = 88
  let y = 640
  for (const linea of lineasTitulo) {
    ctx.fillText(linea, LADO / 2, y)
    y += interlinea
  }

  // --- Subtitulo en blanco al 90% de opacidad ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = "44px 'Baloo 2', sans-serif"
  ctx.fillText(data.subtitulo, LADO / 2, y + 20)

  // --- Pie: marca y URL del juego ---
  ctx.font = "bold 34px 'Baloo 2', sans-serif"
  ctx.fillStyle = '#ffffff'
  ctx.fillText('🐾 Mimes Care Corp', LADO / 2, LADO - 120)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = "34px 'Baloo 2', sans-serif"
  ctx.fillText(URL_CORTA, LADO / 2, LADO - 68)

  return canvas
}

/**
 * Convierte el canvas a Blob PNG (promisificando toBlob).
 */
function canvasABlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

/**
 * Genera la tarjeta de logro y la comparte:
 * 1. Web Share con imagen si el dispositivo soporta compartir archivos.
 * 2. Web Share solo texto si no soporta archivos (algunos desktop).
 * 3. Copia el texto al portapapeles como ultimo recurso.
 *
 * Retorna 'shared' si se compartio (o el usuario cancelo el dialogo),
 * 'copied' si se copio el texto, 'failed' si nada funciono.
 */
export async function shareAchievement(data: ShareCardData): Promise<'shared' | 'copied' | 'failed'> {
  const texto = `${data.titulo} · juega en ${URL_JUEGO}`

  try {
    // 1) Intento con imagen: dibujar tarjeta y compartir como archivo
    const canvas = dibujarTarjeta(data)
    const blob = await canvasABlob(canvas)
    if (blob) {
      const file = new File([blob], 'mime-logro.png', { type: 'image/png' })
      const files = [file]
      if (navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, text: texto })
          return 'shared'
        } catch (err) {
          // Si el usuario cancela el dialogo no lo tratamos como fallo
          if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
          throw err
        }
      }
    }

    // 2) Fallback: compartir solo texto (sin imagen)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: texto })
        return 'shared'
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
        // Si el share de texto falla, seguimos al portapapeles
      }
    }

    // 3) Ultimo recurso: copiar el texto al portapapeles
    const copiado = await copyToClipboard(texto)
    return copiado ? 'copied' : 'failed'
  } catch {
    // Cualquier excepcion inesperada (canvas, blob, share...)
    return 'failed'
  }
}
