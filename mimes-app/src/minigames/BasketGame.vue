<script setup lang="ts">
/**
 * BasketGame.vue — Mini-juego avanzado de baloncesto (tirachinas)
 *
 * Mecanica: arrastra la pelota hacia atras (tipo tirachinas) y suelta
 * para lanzarla con trayectoria parabolica hacia la canasta.
 * 5 tiros, necesitas encestar al menos 3.
 *
 * Fisicas: gravedad + velocidad proporcional al drag.
 * Escala con el tamano de pantalla (baseline 375x667).
 */
import { ref, watch, onUnmounted, onMounted } from 'vue'

const props = defineProps<{
  active: boolean
  onComplete: (success: boolean) => void
}>()

// --- CONSTANTES FISICAS ---
const B_GRAVITY = 0.35
const MAX_DRAG = 120
const POWER_SCALE = 0.16
const REQUIRED = 3
const TOTAL_SHOTS = 5

// --- STATE ---
const containerRef = ref<HTMLElement | null>(null)
const W = ref(375)
const H = ref(667)

// Posiciones relativas (% de pantalla)
const BALL_START_X = 0.18
const BALL_START_Y = 0.65
const HOOP_X = 0.78
const HOOP_Y = 0.35

// Ball state
const ballX = ref(0)
const ballY = ref(0)
const ballVx = ref(0)
const ballVy = ref(0)
const ballFlying = ref(false)
const ballVisible = ref(true)

// Drag state
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragDx = ref(0)
const dragDy = ref(0)

// Score
const scored = ref(0)
const shotsTaken = ref(0)
const shotResult = ref<'none' | 'score' | 'miss'>('none')
const done = ref(false)

// Trajectory preview
const previewDots = ref<{ x: number; y: number }[]>([])

// Animation
let animFrame = 0
let shotTimeout = 0

// --- SCREEN SCALING ---
const sX = () => W.value / 375
const sY = () => H.value / 667

function ballStartPx() {
  return { x: W.value * BALL_START_X, y: H.value * BALL_START_Y }
}

function hoopPx() {
  return { x: W.value * HOOP_X, y: H.value * HOOP_Y }
}

function rimLeftPx() {
  const hoop = hoopPx()
  const rimW = 55 * sX()
  return hoop.x - rimW / 2
}

function rimRightPx() {
  const hoop = hoopPx()
  const rimW = 55 * sX()
  return hoop.x + rimW / 2
}

function rimY() {
  return hoopPx().y
}

// --- RESET BALL ---
function resetBall() {
  const start = ballStartPx()
  ballX.value = start.x
  ballY.value = start.y
  ballVx.value = 0
  ballVy.value = 0
  ballFlying.value = false
  ballVisible.value = true
  dragging.value = false
  dragDx.value = 0
  dragDy.value = 0
  previewDots.value = []
}

// --- DRAG HANDLING ---
function getEventPos(e: MouseEvent | TouchEvent) {
  if ('touches' in e) {
    const t = e.touches[0]
    if (!t) return null
    return { x: t.clientX, y: t.clientY }
  }
  return { x: e.clientX, y: e.clientY }
}

function onDragStart(e: MouseEvent | TouchEvent) {
  if (!props.active || ballFlying.value || done.value) return
  const pos = getEventPos(e)
  if (!pos) return
  dragging.value = true
  dragStartX.value = pos.x
  dragStartY.value = pos.y
  dragDx.value = 0
  dragDy.value = 0
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return
  const pos = getEventPos(e)
  if (!pos) return

  let dx = pos.x - dragStartX.value
  let dy = pos.y - dragStartY.value
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > MAX_DRAG) {
    dx = (dx / dist) * MAX_DRAG
    dy = (dy / dist) * MAX_DRAG
  }
  dragDx.value = dx
  dragDy.value = dy

  // Compute preview trajectory (launch opposite to drag)
  computePreview(-dx * POWER_SCALE * sX(), -dy * POWER_SCALE * sY())
}

function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false

  const dist = Math.sqrt(dragDx.value ** 2 + dragDy.value ** 2)
  if (dist < 10) {
    dragDx.value = 0
    dragDy.value = 0
    previewDots.value = []
    return
  }

  // Launch!
  ballVx.value = -dragDx.value * POWER_SCALE * sX()
  ballVy.value = -dragDy.value * POWER_SCALE * sY()
  ballFlying.value = true
  dragDx.value = 0
  dragDy.value = 0
  previewDots.value = []

  startPhysicsLoop()
}

// --- PREVIEW ---
function computePreview(vx: number, vy: number) {
  const dots: { x: number; y: number }[] = []
  const start = ballStartPx()
  let px = start.x
  let py = start.y
  let pvx = vx
  let pvy = vy
  const g = B_GRAVITY * sY()
  for (let i = 0; i < 5; i++) {
    // Simulate 6 frames per dot
    for (let f = 0; f < 6; f++) {
      pvy += g
      px += pvx
      py += pvy
    }
    dots.push({ x: px, y: py })
  }
  previewDots.value = dots
}

// --- PHYSICS LOOP ---
function startPhysicsLoop() {
  let prevBallY = ballY.value

  function tick() {
    if (!ballFlying.value) return

    const g = B_GRAVITY * sY()
    ballVy.value += g
    ballX.value += ballVx.value
    ballY.value += ballVy.value

    // Check rim crossing (interpolation)
    const ry = rimY()
    const crossedDown = prevBallY <= ry && ballY.value >= ry
    const crossedUp = prevBallY >= ry && ballY.value <= ry

    if (crossedDown || crossedUp) {
      // Check if X is within rim bounds
      const rl = rimLeftPx()
      const rr = rimRightPx()
      // Interpolate X at crossing point
      const t = (ry - prevBallY) / (ballY.value - prevBallY)
      const crossX = (ballX.value - ballVx.value) + ballVx.value * (1 + (t - 1))

      if (crossX >= rl && crossX <= rr && crossedDown) {
        // Score!
        handleScore()
        prevBallY = ballY.value
        return
      }
    }

    prevBallY = ballY.value

    // Out of bounds
    if (ballX.value > W.value + 50 || ballX.value < -50 || ballY.value > H.value + 50) {
      handleMiss()
      return
    }

    animFrame = requestAnimationFrame(tick)
  }

  animFrame = requestAnimationFrame(tick)
}

function handleScore() {
  ballFlying.value = false
  cancelAnimationFrame(animFrame)
  scored.value++
  shotsTaken.value++
  shotResult.value = 'score'

  checkGameEnd()
}

function handleMiss() {
  ballFlying.value = false
  cancelAnimationFrame(animFrame)
  shotsTaken.value++
  shotResult.value = 'miss'

  checkGameEnd()
}

function checkGameEnd() {
  // Win early: already scored enough
  if (scored.value >= REQUIRED && !done.value) {
    done.value = true
    shotTimeout = window.setTimeout(() => {
      props.onComplete(true)
    }, 800)
    return
  }

  // Lose: can't reach required anymore
  const shotsLeft = TOTAL_SHOTS - shotsTaken.value
  if (scored.value + shotsLeft < REQUIRED && !done.value) {
    done.value = true
    shotTimeout = window.setTimeout(() => {
      props.onComplete(false)
    }, 800)
    return
  }

  // All shots used
  if (shotsTaken.value >= TOTAL_SHOTS && !done.value) {
    done.value = true
    shotTimeout = window.setTimeout(() => {
      props.onComplete(scored.value >= REQUIRED)
    }, 800)
    return
  }

  // Next shot after brief delay
  shotTimeout = window.setTimeout(() => {
    shotResult.value = 'none'
    resetBall()
  }, 700)
}

// --- LIFECYCLE ---
function measureContainer() {
  if (containerRef.value) {
    W.value = containerRef.value.clientWidth
    H.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  measureContainer()
  resetBall()
})

watch(() => props.active, (val) => {
  if (val) {
    measureContainer()
    resetBall()
    scored.value = 0
    shotsTaken.value = 0
    shotResult.value = 'none'
    done.value = false
  }
}, { immediate: true })

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  clearTimeout(shotTimeout)
})

// Ball position during drag (offset from start)
function ballDisplayX() {
  if (dragging.value) return ballStartPx().x + dragDx.value
  return ballX.value
}

function ballDisplayY() {
  if (dragging.value) return ballStartPx().y + dragDy.value
  return ballY.value
}
</script>

<template>
  <div
    ref="containerRef"
    class="basket-game"
    @mousemove="onDragMove"
    @mouseup="onDragEnd"
    @mouseleave="onDragEnd"
    @touchmove.prevent="onDragMove"
    @touchend="onDragEnd"
    @touchcancel="onDragEnd"
  >
    <!-- Court background -->
    <div class="court"></div>

    <!-- Hoop: backboard + rim + net -->
    <div
      class="hoop"
      :style="{
        left: (HOOP_X * 100) + '%',
        top: (HOOP_Y * 100) + '%',
      }"
    >
      <!-- Backboard -->
      <div class="backboard"></div>
      <!-- Pole -->
      <div class="pole"></div>
      <!-- Rim -->
      <div class="rim"></div>
      <!-- Net -->
      <div class="net"></div>
    </div>

    <!-- Slingshot line (while dragging) -->
    <svg v-if="dragging" class="sling-svg">
      <line
        :x1="ballStartPx().x"
        :y1="ballStartPx().y"
        :x2="ballDisplayX()"
        :y2="ballDisplayY()"
        stroke="rgba(255,255,255,0.4)"
        stroke-width="2"
        stroke-dasharray="6,4"
      />
    </svg>

    <!-- Trajectory preview dots -->
    <div
      v-for="(dot, i) in previewDots"
      :key="'dot-' + i"
      class="preview-dot"
      :style="{
        left: dot.x + 'px',
        top: dot.y + 'px',
        opacity: 1 - i * 0.18,
      }"
    ></div>

    <!-- Ball -->
    <div
      v-if="ballVisible"
      class="ball"
      :class="{ dragging: dragging, flying: ballFlying }"
      :style="{
        left: ballDisplayX() + 'px',
        top: ballDisplayY() + 'px',
      }"
      @touchstart.prevent="onDragStart"
      @mousedown.prevent="onDragStart"
    >
      🏀
    </div>

    <!-- Score display -->
    <div class="score-display" v-if="active">
      <span class="score-baskets">🎯 {{ scored }}/{{ REQUIRED }}</span>
      <span class="score-shots">Tiros: {{ shotsTaken }}/{{ TOTAL_SHOTS }}</span>
    </div>

    <!-- Shot feedback -->
    <div v-if="shotResult !== 'none'" class="shot-feedback" :class="shotResult">
      {{ shotResult === 'score' ? '🎯' : '💨' }}
    </div>
  </div>
</template>

<style scoped>
.basket-game {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #1a237e 0%, #283593 40%, #3949ab 100%);
  touch-action: none;
}

.court {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25%;
  background: linear-gradient(180deg, #5d4037 0%, #4e342e 100%);
  border-top: 3px solid #8d6e63;
}

/* --- HOOP --- */
.hoop {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 5;
}

.backboard {
  position: absolute;
  width: 8px;
  height: 65px;
  background: white;
  border: 2px solid #ccc;
  border-radius: 2px;
  right: -30px;
  top: -35px;
}

.pole {
  position: absolute;
  width: 6px;
  height: 120px;
  background: #bdbdbd;
  right: -28px;
  top: 28px;
}

.rim {
  position: absolute;
  width: 55px;
  height: 6px;
  background: #ff5722;
  border-radius: 3px;
  left: -28px;
  top: -3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.net {
  position: absolute;
  left: -24px;
  top: 3px;
  width: 47px;
  height: 40px;
  clip-path: polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%);
  background: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 4px,
    rgba(255, 255, 255, 0.7) 4px,
    rgba(255, 255, 255, 0.7) 6px
  );
  opacity: 0.8;
}

/* --- BALL --- */
.ball {
  position: absolute;
  font-size: 38px;
  transform: translate(-50%, -50%);
  cursor: grab;
  z-index: 10;
  user-select: none;
  -webkit-user-select: none;
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  transition: none;
}

.ball.dragging {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.15);
}

.ball.flying {
  cursor: default;
  pointer-events: none;
}

/* --- SLING SVG --- */
.sling-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9;
}

/* --- PREVIEW DOTS --- */
.preview-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(255, 213, 79, 0.6);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 8;
}

/* --- SCORE --- */
.score-display {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16px;
  z-index: 20;
}

.score-baskets {
  color: #ffd54f;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.score-shots {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: 600;
}

/* --- SHOT FEEDBACK --- */
.shot-feedback {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 64px;
  z-index: 50;
  animation: feedback-float 0.7s ease-out forwards;
  pointer-events: none;
}

@keyframes feedback-float {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
  50% { opacity: 1; transform: translate(-50%, -70%) scale(1.2); }
  100% { opacity: 0; transform: translate(-50%, -90%) scale(1); }
}
</style>
