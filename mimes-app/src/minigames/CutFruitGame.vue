<script setup lang="ts">
/**
 * CutFruitGame.vue — Mini-juego avanzado de alimentar: "Mitad y mitad".
 *
 * Aparece una fruta ASIMETRICA (blob generado al azar) y hay que
 * cortarla en dos mitades lo mas iguales posible trazando una linea
 * con el dedo (cualquier angulo). El reparto se mide contando los
 * pixeles reales de cada lado del corte y se muestra ("54% / 46%").
 *
 * Corte bueno: ningun lado por debajo del 42%. 3 frutas; con 2 cortes
 * buenos se gana (y se termina antes si ya es imposible o innecesario
 * seguir). El shell da 20 segundos.
 */
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES ---
const TOTAL_FRUTAS = 3
const ACIERTOS_PARA_GANAR = 2
const MIN_LADO_BUENO = 42       // % minimo del lado pequeno para ser "buen corte"
const MIN_DRAG_PX = 30          // arrastre minimo para considerar que hay corte
const VB = 320                  // lado del viewBox cuadrado del SVG
const SEPARACION = 16           // px que se separan las mitades al cortar
const RESULT_PAUSE_MS = 1400    // pausa mostrando el reparto antes de la siguiente
const FEEDBACK_DELAY_MS = 700

/** Paletas: piel, piel oscura (borde) y pulpa que asoma al cortar */
const PALETAS = [
  { piel: '#66bb6a', borde: '#2e7d32', pulpa: '#ef5350' }, // sandia
  { piel: '#ffa726', borde: '#e65100', pulpa: '#ffe0b2' }, // naranja
  { piel: '#8d6e63', borde: '#4e342e', pulpa: '#aed581' }, // kiwi
  { piel: '#ffd54f', borde: '#f57f17', pulpa: '#fff9c4' }, // mango
] as const

interface Punto { x: number; y: number }

interface Fruta {
  path: string
  piel: string
  borde: string
  pulpa: string
}

// --- ESTADO ---
const frutas = ref<Fruta[]>([])
const idx = ref(0)              // fruta actual (0-based)
const aciertos = ref(0)
const fallos = ref(0)
/** 'apuntar' = se puede trazar; 'cortada' = mitades separadas; 'fin' = overlay */
const fase = ref<'apuntar' | 'cortada' | 'fin'>('apuntar')
const gano = ref(false)
const aviso = ref('')           // "corta ATRAVESANDO la fruta"

// Trazo en curso y corte aplicado
const arrastrando = ref(false)
const trazoA = ref<Punto | null>(null)
const trazoB = ref<Punto | null>(null)
const clipIzq = ref('')         // puntos del <polygon> de cada mitad
const clipDer = ref('')
const desplIzq = ref('')        // transform de cada mitad al separarse
const desplDer = ref('')
const pctIzq = ref(0)
const pctDer = ref(0)
const corteBueno = ref(false)

let done = false
let nextTimer: ReturnType<typeof setTimeout> | null = null
let endTimer: ReturnType<typeof setTimeout> | null = null
let avisoTimer: ReturnType<typeof setTimeout> | null = null

const svgEl = ref<SVGSVGElement | null>(null)

// --- GENERACION DE LA FRUTA (blob asimetrico) ---

/**
 * Blob radial: 14 radios aleatorios alrededor del centro, con un lado
 * deliberadamente mas gordo para garantizar la asimetria, unidos con
 * curvas suaves (puntos medios como anclas y vertices como control).
 */
function generarFruta(): Fruta {
  const paleta = PALETAS[Math.floor(Math.random() * PALETAS.length)]!
  const N = 14
  const cx = VB / 2
  const cy = VB / 2
  const base = VB * 0.30
  const sesgo = Math.random() * Math.PI * 2 // direccion del lado "gordo"

  const pts: Punto[] = []
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2
    const irregular = 0.72 + Math.random() * 0.42
    const gordura = 1 + 0.30 * Math.max(0, Math.cos(ang - sesgo))
    const r = base * irregular * gordura
    pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })
  }

  // Curva cerrada suave: Q con el vertice como control y el punto medio
  // del segmento siguiente como ancla
  const medio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  let d = `M ${medio(pts[N - 1]!, pts[0]!).x.toFixed(1)} ${medio(pts[N - 1]!, pts[0]!).y.toFixed(1)}`
  for (let i = 0; i < N; i++) {
    const p = pts[i]!
    const m = medio(p, pts[(i + 1) % N]!)
    d += ` Q ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`
  }
  d += ' Z'

  return { path: d, ...paleta }
}

// --- ARRANQUE / RESET ---
function start() {
  done = false
  limpiarTimers()
  frutas.value = Array.from({ length: TOTAL_FRUTAS }, generarFruta)
  idx.value = 0
  aciertos.value = 0
  fallos.value = 0
  fase.value = 'apuntar'
  aviso.value = ''
  resetTrazo()
}

function resetTrazo() {
  arrastrando.value = false
  trazoA.value = null
  trazoB.value = null
  clipIzq.value = ''
  clipDer.value = ''
  desplIzq.value = ''
  desplDer.value = ''
}

watch(() => props.active, v => { if (v) start() }, { immediate: true })

function limpiarTimers() {
  if (nextTimer) { clearTimeout(nextTimer); nextTimer = null }
  if (endTimer) { clearTimeout(endTimer); endTimer = null }
  if (avisoTimer) { clearTimeout(avisoTimer); avisoTimer = null }
}

onUnmounted(limpiarTimers)

// --- INPUT (pointer events sobre el SVG) ---

function aSvg(e: PointerEvent): Punto | null {
  const el = svgEl.value
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) / r.width) * VB,
    y: ((e.clientY - r.top) / r.height) * VB,
  }
}

function onDown(e: PointerEvent) {
  if (!props.active || done || fase.value !== 'apuntar') return
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  const p = aSvg(e)
  if (!p) return
  arrastrando.value = true
  trazoA.value = p
  trazoB.value = p
}

function onMove(e: PointerEvent) {
  if (!arrastrando.value) return
  trazoB.value = aSvg(e)
}

function onUp() {
  if (!arrastrando.value || !props.active || done) return
  arrastrando.value = false
  const a = trazoA.value
  const b = trazoB.value
  if (!a || !b) return

  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.hypot(dx, dy) < MIN_DRAG_PX) { resetTrazo(); return }

  cortar(a, b)
}

// --- EL CORTE ---

/**
 * Cuenta los pixeles de la fruta a cada lado de la recta AB rasterizando
 * el path en un canvas fuera de pantalla. Devuelve null si el corte no
 * atraviesa la fruta de verdad (un lado con menos del 3%).
 */
function medirReparto(a: Punto, b: Punto): { menor: number; ladoIzq: number } | null {
  const fruta = frutas.value[idx.value]!
  const canvas = document.createElement('canvas')
  canvas.width = VB
  canvas.height = VB
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fill(new Path2D(fruta.path))
  const data = ctx.getImageData(0, 0, VB, VB).data

  const dx = b.x - a.x
  const dy = b.y - a.y
  let izq = 0
  let der = 0
  for (let y = 0; y < VB; y += 2) {
    for (let x = 0; x < VB; x += 2) {
      if (data[(y * VB + x) * 4 + 3]! > 0) {
        if ((x - a.x) * dy - (y - a.y) * dx > 0) izq++
        else der++
      }
    }
  }
  const total = izq + der
  if (total === 0) return null
  const pIzq = (izq / total) * 100
  const menor = Math.min(pIzq, 100 - pIzq)
  if (menor < 3) return null // rozo el borde: no es un corte de verdad
  return { menor, ladoIzq: pIzq }
}

function cortar(a: Punto, b: Punto) {
  const reparto = medirReparto(a, b)
  if (!reparto) {
    resetTrazo()
    aviso.value = '¡Corta atravesando la fruta!'
    if (avisoTimer) clearTimeout(avisoTimer)
    avisoTimer = setTimeout(() => (aviso.value = ''), 1200)
    return
  }

  // Prolongar la recta y construir los poligonos de recorte (medio plano
  // a cada lado del corte) para separar visualmente las dos mitades
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy // normal unitaria (lado "izquierdo" del recorrido)
  const ny = ux
  const L = VB * 3
  const A = { x: a.x - ux * L, y: a.y - uy * L }
  const B = { x: b.x + ux * L, y: b.y + uy * L }
  const quad = (s: number) =>
    `${A.x},${A.y} ${B.x},${B.y} ${B.x + nx * s * L},${B.y + ny * s * L} ${A.x + nx * s * L},${A.y + ny * s * L}`

  // Ojo con los signos: el producto cruzado de medirReparto marca como
  // "izq" el lado con (x-a)·dy - (y-a)·dx > 0, que es el lado -n
  clipDer.value = quad(1)
  clipIzq.value = quad(-1)
  desplIzq.value = `translate(${(-nx * SEPARACION).toFixed(1)}, ${(-ny * SEPARACION).toFixed(1)})`
  desplDer.value = `translate(${(nx * SEPARACION).toFixed(1)}, ${(ny * SEPARACION).toFixed(1)})`

  pctIzq.value = Math.round(reparto.ladoIzq)
  pctDer.value = 100 - Math.round(reparto.ladoIzq)
  corteBueno.value = reparto.menor >= MIN_LADO_BUENO
  if (corteBueno.value) aciertos.value++
  else fallos.value++

  fase.value = 'cortada'

  nextTimer = setTimeout(siguiente, RESULT_PAUSE_MS)
}

function siguiente() {
  if (done) return

  // ¿Ya esta decidido? (2 aciertos = victoria; 2 fallos = imposible ganar)
  if (aciertos.value >= ACIERTOS_PARA_GANAR) { terminar(true); return }
  if (fallos.value > TOTAL_FRUTAS - ACIERTOS_PARA_GANAR) { terminar(false); return }
  if (idx.value + 1 >= TOTAL_FRUTAS) { terminar(false); return }

  idx.value++
  fase.value = 'apuntar'
  resetTrazo()
}

function terminar(exito: boolean) {
  if (done) return
  done = true
  gano.value = exito
  fase.value = 'fin'
  endTimer = setTimeout(() => props.onComplete(exito), FEEDBACK_DELAY_MS)
}
</script>

<template>
  <div class="cut-game">
    <!-- HUD -->
    <div class="hud">
      🔪 Fruta {{ Math.min(idx + 1, TOTAL_FRUTAS) }}/{{ TOTAL_FRUTAS }}
      <span class="hud-hits">{{ '✓'.repeat(aciertos) }}{{ '✗'.repeat(fallos) }}</span>
    </div>
    <p class="hint" v-if="fase === 'apuntar'">Traza una linea que la parta en dos mitades iguales</p>

    <div class="tabla">
      <svg
        ref="svgEl"
        class="lienzo"
        :viewBox="`0 0 ${VB} ${VB}`"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <defs>
          <clipPath id="clip-izq"><polygon :points="clipIzq" /></clipPath>
          <clipPath id="clip-der"><polygon :points="clipDer" /></clipPath>
        </defs>

        <template v-if="frutas[idx]">
          <!-- Fruta entera mientras se apunta -->
          <g v-if="fase === 'apuntar'">
            <path :d="frutas[idx]!.path" :fill="frutas[idx]!.piel" :stroke="frutas[idx]!.borde" stroke-width="5" />
          </g>

          <!-- Mitades separadas tras el corte (la pulpa asoma debajo) -->
          <g v-else-if="fase === 'cortada' || fase === 'fin'">
            <g clip-path="url(#clip-izq)" :transform="desplIzq" class="mitad">
              <path :d="frutas[idx]!.path" :fill="frutas[idx]!.pulpa" />
              <path :d="frutas[idx]!.path" :fill="frutas[idx]!.piel" fill-opacity="0.75" :stroke="frutas[idx]!.borde" stroke-width="5" />
            </g>
            <g clip-path="url(#clip-der)" :transform="desplDer" class="mitad">
              <path :d="frutas[idx]!.path" :fill="frutas[idx]!.pulpa" />
              <path :d="frutas[idx]!.path" :fill="frutas[idx]!.piel" fill-opacity="0.75" :stroke="frutas[idx]!.borde" stroke-width="5" />
            </g>
          </g>

          <!-- Trazo del cuchillo -->
          <line
            v-if="arrastrando && trazoA && trazoB"
            :x1="trazoA.x" :y1="trazoA.y" :x2="trazoB.x" :y2="trazoB.y"
            class="trazo"
          />
        </template>
      </svg>

      <!-- Reparto tras el corte -->
      <div v-if="fase === 'cortada' || fase === 'fin'" class="reparto" :class="corteBueno ? 'bien' : 'mal'">
        {{ pctIzq }}% / {{ pctDer }}%
        <span>{{ corteBueno ? '¡Buen corte!' : 'Muy descompensado...' }}</span>
      </div>

      <div v-if="aviso" class="aviso">{{ aviso }}</div>
    </div>

    <!-- OVERLAY FINAL -->
    <div v-if="fase === 'fin'" class="overlay">
      <span class="overlay-emoji">{{ gano ? '🍉' : '🔪' }}</span>
      <span class="overlay-texto">{{ gano ? '¡Chef de precision!' : 'Se te resistio el cuchillo...' }}</span>
    </div>
  </div>
</template>

<style scoped>
.cut-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #33413a 0%, #1f2d26 100%);
  touch-action: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hud {
  margin-top: 12px;
  color: #ffd54f;
  font-size: 15px;
  font-weight: 700;
}

.hud-hits { margin-left: 8px; letter-spacing: 2px; }

.hint {
  color: rgba(255, 255, 255, 0.75);
  font-size: 12.5px;
  margin: 4px 16px 0;
  text-align: center;
}

.tabla {
  position: relative;
  width: min(86vw, 340px);
  margin-top: 8px;
}

.lienzo {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  cursor: crosshair;
}

.mitad { transition: transform 0.25s ease-out; }

.trazo {
  stroke: #fff;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dasharray: 10 7;
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.8));
}

.reparto {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 6px 18px;
  border-radius: 14px;
  font-size: 19px;
  font-weight: 700;
  color: white;
  text-align: center;
  animation: pop-centrado 0.25s ease-out;
  white-space: nowrap;
}

.reparto span { display: block; font-size: 12px; font-weight: 600; opacity: 0.9; }
.reparto.bien { background: #2e7d32; }
.reparto.mal { background: #c62828; }

.aviso {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.65);
  color: #ffd54f;
  font-size: 14px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 12px;
  white-space: nowrap;
  animation: pop-centrado 0.2s ease-out;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 5;
}

.overlay-emoji { font-size: 64px; animation: pop 0.35s ease-out; }
.overlay-texto { color: white; font-size: 18px; font-weight: 700; }

@keyframes pop {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Variante para elementos centrados con translateX(-50%): la animacion
   debe conservar ese desplazamiento o el cartel "salta" al aparecer */
@keyframes pop-centrado {
  from { transform: translateX(-50%) scale(0.6); opacity: 0; }
  to { transform: translateX(-50%) scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .mitad, .overlay-emoji, .reparto, .aviso { transition: none; animation: none; }
}
</style>
