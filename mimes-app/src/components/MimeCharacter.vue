<script setup lang="ts">
/**
 * MimeCharacter.vue
 *
 * Componente visual de un Mime. Renderiza el personaje con su personalidad,
 * color, humor y escala. Portado directamente de mime-preview.html.
 *
 * Uso:
 *   <MimeCharacter personality="aventurero" color-theme="celeste" mood="feliz" :scale="1" />
 */
import { computed, ref, onMounted, onUnmounted } from 'vue'

// --- PROPS ---
// defineProps() le dice a Vue qué "atributos" acepta este componente.
// Cuando alguien escriba <MimeCharacter personality="aventurero" />,
// Vue pasa "aventurero" como valor de props.personality.
const props = defineProps<{
  // Tipo de personalidad: determina el estilo de pelo y animaciones
  personality: 'aventurero' | 'tranquilo' | 'picaro'
  // Tema de color: define las CSS variables (--body-color, etc.)
  colorTheme: 'celeste' | 'lila' | 'melocoton'
  // Estado de ánimo: cambia la expresión de la boca y los ojos
  mood?: 'feliz' | 'euforico' | 'triste' | 'dormido' | 'hambriento' | ''
  // Factor de escala (1 = 150x180px, el tamaño original)
  scale?: number
}>()

// --- COMPUTED ---
// computed() crea valores que se recalculan automáticamente cuando las props cambian.
// Es como una fórmula de Excel: si cambias la celda de entrada, el resultado se actualiza solo.

// Mapeo personalidad → tipo de pelo
const hairType = computed(() => {
  const map = { aventurero: 'punk', tranquilo: 'curly', picaro: 'quiff' }
  return map[props.personality]
})

// Clases CSS que se ponen en el div .character
// Ejemplo resultado: "character aventurero mime-celeste mood-feliz"
const characterClasses = computed(() => {
  const classes = ['character', props.personality, `mime-${props.colorTheme}`]
  if (props.mood) classes.push(`mood-${props.mood}`)
  return classes
})

// Estilo inline para la escala (transform: scale)
const scaleStyle = computed(() => {
  if (!props.scale || props.scale === 1) return {}
  return { transform: `scale(${props.scale})` }
})

// --- EYE TRACKING ---
// ref() crea una "referencia reactiva". characterRef apunta al div .character del DOM.
// Es como hacer document.querySelector('.character') pero Vue lo conecta automáticamente
// gracias al atributo ref="characterRef" en el template.
const characterRef = ref<HTMLElement | null>(null)

function trackEyes(e: { clientX: number; clientY: number }) {
  const ch = characterRef.value
  if (!ch) return

  const rect = ch.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height * 0.3
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const max = 5
  const mx = (dx / dist) * Math.min(dist * 0.02, max)
  const my = (dy / dist) * Math.min(dist * 0.02, max)

  ch.querySelectorAll<HTMLElement>('.pupil').forEach((p) => {
    p.style.transform = `translate(calc(-50% + ${mx}px), ${my}px)`
  })
}

function onMouseMove(e: MouseEvent) {
  trackEyes(e)
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  trackEyes({ clientX: t.clientX, clientY: t.clientY })
}

// --- HEART BURST (click interaction) ---
function onCharacterClick(e: MouseEvent) {
  const ch = characterRef.value
  if (!ch) return

  const burst = document.createElement('div')
  burst.className = 'heart-burst'
  const rect = ch.getBoundingClientRect()
  burst.style.left = e.clientX - rect.left + 'px'
  burst.style.top = e.clientY - rect.top + 'px'

  const hearts = ['\u2764\uFE0F', '\uD83D\uDC9B', '\uD83D\uDC96', '\uD83E\uDDE1', '\uD83D\uDC9C', '\uD83D\uDC97']
  for (let i = 0; i < 6; i++) {
    const h = document.createElement('div')
    h.className = 'mini-heart'
    h.textContent = hearts[i]
    const a = ((Math.PI * 2) / 6) * i + (Math.random() - 0.5)
    const r = 30 + Math.random() * 25
    h.style.setProperty('--tx', `${Math.cos(a) * r}px`)
    h.style.setProperty('--ty', `${Math.sin(a) * r - 20}px`)
    h.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`)
    h.style.animationDelay = `${i * 0.05}s`
    burst.appendChild(h)
  }
  ch.appendChild(burst)
  setTimeout(() => burst.remove(), 1200)
}

// --- LIFECYCLE ---
// onMounted se ejecuta cuando el componente se "monta" en el DOM (aparece en pantalla).
// Aquí registramos los event listeners para el eye tracking.
// onUnmounted los quita cuando el componente desaparece (para no dejar listeners huérfanos).
onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('touchmove', onTouchMove as EventListener)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('touchmove', onTouchMove as EventListener)
})
</script>

<template>
  <!--
    El template es el HTML del componente.
    Fíjate que es EXACTAMENTE la misma estructura que en mime-preview.html,
    pero en vez de clases fijas, usamos :class (binding dinámico) para que
    Vue ponga las clases según las props.

    :class="characterClasses" → Vue evalúa el computed y pone las clases resultantes
    :style="scaleStyle" → Vue aplica el estilo de escala si la prop scale existe
    ref="characterRef" → conecta este div con la variable characterRef del script
    @click → llama a onCharacterClick cuando haces click (como addEventListener)
  -->
  <div class="scene" :style="scaleStyle">
    <div :class="characterClasses" ref="characterRef" @click="onCharacterClick">
      <!-- Orejas -->
      <div class="ear left"></div>
      <div class="ear right"></div>

      <!-- Pelo: el tipo de pelo depende de la personalidad -->
      <div class="hair" :class="hairType">
        <div class="strand"></div>
        <div class="strand"></div>
        <div class="strand"></div>
        <div class="strand"></div>
        <div class="strand"></div>
      </div>

      <!-- Cuerpo + barriga -->
      <div class="body">
        <div class="belly"></div>
      </div>

      <!-- Ojos con pupilas y párpados -->
      <div class="eye left">
        <div class="pupil"></div>
        <div class="eye-lid"></div>
      </div>
      <div class="eye right">
        <div class="pupil"></div>
        <div class="eye-lid"></div>
      </div>

      <!-- Mejillas rosadas -->
      <div class="blush left"></div>
      <div class="blush right"></div>

      <!-- Boca estilo :3 de gato -->
      <div class="mouth">
        <div class="mouth-nose"></div>
        <div class="mouth-w"></div>
        <div class="mouth-open">
          <div class="mouth-tongue"></div>
        </div>
      </div>

      <!-- Collar -->
      <div class="collar"></div>

      <!-- Manos corazón (carácter ♥ que respeta CSS color) -->
      <div class="hand left">&#9829;</div>
      <div class="hand right">&#9829;</div>

      <!-- Pies -->
      <div class="foot left"></div>
      <div class="foot right"></div>
    </div>

    <!-- Sombra en el suelo -->
    <div class="ground-shadow"></div>
  </div>
</template>

<style scoped>
/*
  "scoped" hace que TODO este CSS solo afecte a ESTE componente.
  Vue lo consigue añadiendo un atributo único (data-v-xxxx) a cada elemento
  y reescribiendo los selectores para incluirlo. Así no hay conflictos
  con otros componentes que usen los mismos nombres de clase.

  IMPORTANTE: Para selectores que dependen de clases del padre (.aventurero .hair.punk),
  Vue necesita :deep() o que estén en el mismo scope. Como el .character contiene todo,
  funciona directamente con scoped.
*/

/* === SCENE & CHARACTER === */
.scene {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ground-shadow {
  width: 100px;
  height: 10px;
  background: rgba(26, 26, 46, 0.12);
  border-radius: 50%;
  margin-top: -6px;
  filter: blur(5px);
  animation: shadow-breathe 3s ease-in-out infinite;
}

@keyframes shadow-breathe {
  0%,
  100% {
    transform: scaleX(1);
    opacity: 0.5;
  }
  50% {
    transform: scaleX(1.08);
    opacity: 0.35;
  }
}

.character {
  position: relative;
  width: 150px;
  height: 180px;
  cursor: pointer;
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* === BODY === */
.body {
  position: absolute;
  bottom: 26px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 132px;
  background: var(--body-color);
  border-radius: 50% 50% 45% 45%;
  overflow: hidden;
  box-shadow:
    inset -8px -6px 16px rgba(255, 255, 255, 0.04),
    0 4px 16px rgba(26, 26, 46, 0.12);
}

.belly {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 112px;
  background: var(--belly-color);
  border-radius: 50%;
  box-shadow: inset 0 -6px 12px rgba(251, 191, 36, 0.08);
}

/* === EARS === */
.ear {
  position: absolute;
  top: 12px;
  width: 30px;
  height: 30px;
  background: var(--body-color);
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.ear.left {
  left: 22px;
  border-radius: 5px 20px 5px 5px;
  transform: rotate(-15deg);
}

.ear.right {
  right: 22px;
  border-radius: 20px 5px 5px 5px;
  transform: rotate(15deg);
}

.ear::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 15px;
  height: 15px;
  background: var(--ear-inner);
  border-radius: inherit;
  opacity: 0.4;
}

.character:hover .ear.left {
  transform: rotate(-25deg) translateY(-3px);
}

.character:hover .ear.right {
  transform: rotate(25deg) translateY(-3px);
}

/* === HAIR === */
.hair {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.strand {
  position: absolute;
  background: var(--hair-color);
  box-shadow:
    inset -2px -2px 4px rgba(0, 0, 0, 0.15),
    inset 2px 2px 4px rgba(255, 255, 255, 0.1);
}

/* Aventurero: Punk / Mohawk */
.aventurero .hair.punk .strand:nth-child(1) {
  width: 12px;
  height: 34px;
  top: -24px;
  left: -10px;
  transform: rotate(-12deg);
  border-radius: 40% 40% 10% 10%;
}

.aventurero .hair.punk .strand:nth-child(2) {
  width: 14px;
  height: 42px;
  top: -30px;
  left: 0px;
  transform: rotate(3deg);
  border-radius: 40% 40% 10% 10%;
}

.aventurero .hair.punk .strand:nth-child(3) {
  width: 11px;
  height: 30px;
  top: -18px;
  left: 10px;
  transform: rotate(14deg);
  border-radius: 40% 40% 10% 10%;
}

.aventurero .hair.punk .strand:nth-child(4) {
  width: 38px;
  height: 12px;
  top: 2px;
  left: -19px;
  border-radius: 50%;
}

.aventurero .hair.punk .strand:nth-child(5) {
  width: 11px;
  height: 28px;
  top: -16px;
  left: -20px;
  transform: rotate(-18deg);
  border-radius: 40% 40% 10% 10%;
}

/* Tranquilo: Curly / Rulos */
.tranquilo .hair.curly .strand:nth-child(1) {
  width: 24px;
  height: 24px;
  top: -8px;
  left: -18px;
  border-radius: 50%;
}

.tranquilo .hair.curly .strand:nth-child(2) {
  width: 28px;
  height: 28px;
  top: -14px;
  left: -3px;
  border-radius: 50%;
}

.tranquilo .hair.curly .strand:nth-child(3) {
  width: 22px;
  height: 22px;
  top: -6px;
  left: 12px;
  border-radius: 50%;
}

.tranquilo .hair.curly .strand:nth-child(4) {
  display: none;
}

.tranquilo .hair.curly .strand:nth-child(5) {
  width: 22px;
  height: 22px;
  top: -4px;
  left: -34px;
  border-radius: 50%;
}

/* Picaro: Copete / Pompadour */
.picaro .hair.quiff .strand:nth-child(1) {
  width: 44px;
  height: 14px;
  top: 0px;
  left: -22px;
  border-radius: 50% 50% 40% 40%;
}

.picaro .hair.quiff .strand:nth-child(2) {
  width: 30px;
  height: 28px;
  top: -20px;
  left: -8px;
  border-radius: 50% 60% 30% 40%;
  transform: rotate(8deg);
}

.picaro .hair.quiff .strand:nth-child(3) {
  width: 20px;
  height: 18px;
  top: -24px;
  left: 14px;
  border-radius: 50% 70% 50% 30%;
  transform: rotate(20deg);
}

.picaro .hair.quiff .strand:nth-child(4) {
  width: 16px;
  height: 14px;
  top: -10px;
  left: -18px;
  border-radius: 50% 40% 30% 50%;
  transform: rotate(-10deg);
}

.picaro .hair.quiff .strand:nth-child(5) {
  width: 14px;
  height: 10px;
  top: -16px;
  left: 2px;
  border-radius: 50%;
  background: var(--hair-highlight);
  opacity: 0.25;
}

/* === COLLAR === */
.collar {
  position: absolute;
  top: 78px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 18px;
  background: var(--collar-color);
  border-radius: 50px;
  z-index: 10;
  box-shadow:
    0 2px 0 rgba(0, 0, 0, 0.04),
    inset 0 -2px 4px rgba(0, 0, 0, 0.03);
}

/* === EYES === */
.eye {
  position: absolute;
  top: 40px;
  width: 40px;
  height: 50px;
  background: white;
  border-radius: 50%;
  z-index: 5;
  border: 1.5px solid #0f0f1a;
  overflow: hidden;
  box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.04);
}

.eye.left {
  left: 31px;
}

.eye.right {
  right: 31px;
}

.pupil {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 28px;
  background: #0f0f1a;
  border-radius: 50%;
  transition: transform 0.15s ease-out;
}

.pupil::before {
  content: '';
  position: absolute;
  top: 4px;
  right: 3px;
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: sparkle 2.5s ease-in-out infinite;
}

.pupil::after {
  content: '';
  position: absolute;
  top: 14px;
  right: 5px;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

@keyframes sparkle {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
  }
}

.eye-lid {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 0%;
  background: var(--body-color);
  z-index: 6;
  border-radius: 50% 50% 0 0;
  animation: blink 4s ease-in-out infinite;
}

@keyframes blink {
  0%,
  95%,
  100% {
    height: 0%;
  }
  97% {
    height: 100%;
  }
}

/* === BLUSH === */
.blush {
  position: absolute;
  top: 72px;
  width: 18px;
  height: 10px;
  background: #fca5a5;
  border-radius: 50%;
  z-index: 8;
  opacity: 0.5;
  filter: blur(2px);
  transition: opacity 0.4s;
}

.blush.left {
  left: 26px;
}

.blush.right {
  right: 26px;
}

.character:hover .blush {
  opacity: 0.8;
}

/* === MOUTH - cat ":3" style === */
.mouth {
  position: absolute;
  top: 82px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
}

.mouth-nose {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #f48fb1;
  z-index: 5;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.1));
}

.mouth-w {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 12px;
  z-index: 4;
  animation: mouth-idle 5s ease-in-out infinite;
}

.mouth-w::before,
.mouth-w::after {
  content: '';
  position: absolute;
  top: 0;
  width: 16px;
  height: 10px;
  border: 2.5px solid #3a3a3a;
  border-top: none;
}

.mouth-w::before {
  left: 0;
  border-right: none;
  border-radius: 0 0 0 10px;
}

.mouth-w::after {
  right: 0;
  border-left: none;
  border-radius: 0 0 10px 0;
}

@keyframes mouth-idle {
  0%,
  100% {
    transform: translateX(-50%) scaleY(1);
  }
  40% {
    transform: translateX(-50%) scaleY(1.06);
  }
  70% {
    transform: translateX(-50%) scaleY(0.96);
  }
}

.mouth-open {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 10px;
  width: 0;
  height: 0;
  background: #2a1a1a;
  border-radius: 0 0 50% 50%;
  z-index: 6;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.mouth-tongue {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 5px;
  background: #f48fb1;
  border-radius: 50%;
  z-index: 7;
}

/* === MOOD EXPRESSIONS === */

/* Feliz */
.mood-feliz .mouth-w {
  width: 36px;
  animation: mouth-happy 3.5s ease-in-out infinite;
}

.mood-feliz .mouth-w::before,
.mood-feliz .mouth-w::after {
  width: 19px;
  height: 13px;
  border-width: 3px;
}

.mood-feliz .mouth-open {
  width: 18px;
  height: 10px;
  top: 12px;
}

.mood-feliz .mouth-tongue {
  width: 10px;
  height: 6px;
}

@keyframes mouth-happy {
  0%,
  100% {
    transform: translateX(-50%) scaleY(1);
  }
  30% {
    transform: translateX(-50%) scaleY(1.1);
  }
  60% {
    transform: translateX(-50%) scaleY(0.96);
  }
}

/* Triste */
.mood-triste .mouth-w {
  width: 24px;
  animation: mouth-sad 5s ease-in-out infinite;
}

.mood-triste .mouth-w::before,
.mood-triste .mouth-w::after {
  width: 13px;
  height: 8px;
  border: 2.5px solid #3a3a3a;
  border-bottom: none;
  border-top: none;
  top: auto;
  bottom: 0;
}

.mood-triste .mouth-w::before {
  border-right: none;
  border-radius: 10px 0 0 0;
  border-top: 2.5px solid #3a3a3a;
}

.mood-triste .mouth-w::after {
  border-left: none;
  border-radius: 0 10px 0 0;
  border-top: 2.5px solid #3a3a3a;
}

.mood-triste .mouth-open {
  width: 0;
  height: 0;
}

@keyframes mouth-sad {
  0%,
  100% {
    transform: translateX(-50%) scaleY(1);
  }
  50% {
    transform: translateX(-50%) scaleY(1.08) translateY(-1px);
  }
}

.mood-triste .blush {
  opacity: 0.2 !important;
}

/* Euforico */
.mood-euforico .mouth-w {
  width: 42px;
  animation: mouth-euphoric 2.5s ease-in-out infinite;
}

.mood-euforico .mouth-w::before,
.mood-euforico .mouth-w::after {
  width: 22px;
  height: 16px;
  border-width: 3px;
}

.mood-euforico .mouth-open {
  width: 26px;
  height: 16px;
  top: 14px;
  animation: open-euphoric 2.5s ease-in-out infinite;
}

.mood-euforico .mouth-tongue {
  width: 14px;
  height: 9px;
}

@keyframes mouth-euphoric {
  0%,
  100% {
    transform: translateX(-50%) scaleY(1);
  }
  25% {
    transform: translateX(-50%) scaleY(1.18);
  }
  50% {
    transform: translateX(-50%) scaleY(0.92);
  }
  75% {
    transform: translateX(-50%) scaleY(1.12);
  }
}

@keyframes open-euphoric {
  0%,
  100% {
    transform: translateX(-50%) scale(1);
  }
  25% {
    transform: translateX(-50%) scale(1.15);
  }
  50% {
    transform: translateX(-50%) scale(0.9);
  }
  75% {
    transform: translateX(-50%) scale(1.1);
  }
}

.mood-euforico .blush {
  opacity: 0.9 !important;
}

/* Dormido */
.mood-dormido .mouth-w {
  width: 12px;
  animation: none;
}

.mood-dormido .mouth-w::before,
.mood-dormido .mouth-w::after {
  width: 7px;
  height: 7px;
}

.mood-dormido .mouth-w::before {
  border-radius: 0 0 0 50%;
}

.mood-dormido .mouth-w::after {
  border-radius: 0 0 50% 0;
}

.mood-dormido .mouth-open {
  width: 6px;
  height: 6px;
  top: 10px;
  border-radius: 50%;
}

.mood-dormido .mouth-tongue {
  display: none;
}

.mood-dormido .eye-lid {
  animation: sleepy-eyes 5s ease-in-out infinite !important;
}

@keyframes sleepy-eyes {
  0%,
  30%,
  100% {
    height: 70%;
  }
  15% {
    height: 100%;
  }
}

/* Hambriento */
.mood-hambriento .mouth-w {
  width: 34px;
  animation: mouth-hungry 3.5s ease-in-out infinite;
}

.mood-hambriento .mouth-w::before,
.mood-hambriento .mouth-w::after {
  width: 18px;
  height: 12px;
}

.mood-hambriento .mouth-open {
  width: 20px;
  height: 12px;
  top: 12px;
}

.mood-hambriento .mouth-tongue {
  width: 12px;
  height: 7px;
  animation: tongue-lick 3.5s ease-in-out infinite;
}

@keyframes tongue-lick {
  0%,
  45%,
  100% {
    transform: translateX(-50%);
  }
  15% {
    transform: translateX(-10%);
  }
  30% {
    transform: translateX(-90%);
  }
}

@keyframes mouth-hungry {
  0%,
  45%,
  100% {
    transform: translateX(-50%) scaleY(1);
  }
  15%,
  30% {
    transform: translateX(-50%) scaleY(1.12);
  }
}

/* === HANDS === */
.hand {
  position: absolute;
  top: 96px;
  z-index: 20;
  font-size: 38px;
  line-height: 1;
  cursor: pointer;
  color: var(--body-color);
}

.hand.left {
  left: -8px;
  animation: wave-left 2.8s ease-in-out infinite;
  transform-origin: right center;
}

.hand.right {
  right: -8px;
  animation: wave-right 2.8s ease-in-out infinite;
  transform-origin: left center;
}

@keyframes wave-left {
  0%,
  100% {
    transform: rotate(0deg);
  }
  20% {
    transform: rotate(-20deg);
  }
  40% {
    transform: rotate(10deg);
  }
  60% {
    transform: rotate(-15deg);
  }
  80% {
    transform: rotate(5deg);
  }
}

@keyframes wave-right {
  0%,
  100% {
    transform: rotate(0deg);
  }
  15% {
    transform: rotate(20deg);
  }
  35% {
    transform: rotate(-10deg);
  }
  55% {
    transform: rotate(15deg);
  }
  75% {
    transform: rotate(-5deg);
  }
}

.character:hover .hand.left {
  animation: wave-left-fast 0.5s ease-in-out infinite;
}

.character:hover .hand.right {
  animation: wave-right-fast 0.5s ease-in-out infinite;
}

@keyframes wave-left-fast {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-30deg) translateY(-6px);
  }
}

@keyframes wave-right-fast {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(30deg) translateY(-6px);
  }
}

/* === FEET === */
.foot {
  position: absolute;
  bottom: 16px;
  width: 32px;
  height: 20px;
  background: var(--feet-color);
  border-radius: 12px 12px 6px 6px;
  border: 1.5px solid #b45309;
  box-shadow:
    inset 0 -2px 3px rgba(180, 83, 9, 0.12),
    0 1px 2px rgba(26, 26, 46, 0.12);
}

.foot.left {
  left: 38px;
}

.foot.right {
  right: 38px;
}

.foot::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 10px;
  border-left: 1.5px solid rgba(180, 83, 9, 0.2);
  border-right: 1.5px solid rgba(180, 83, 9, 0.2);
}

/* === HEART BURST === */
.heart-burst {
  position: absolute;
  pointer-events: none;
  z-index: 100;
}

.mini-heart {
  position: absolute;
  font-size: 14px;
  animation: heart-fly 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  opacity: 0;
}

@keyframes heart-fly {
  0% {
    transform: translate(0, 0) scale(0) rotate(0deg);
    opacity: 1;
  }
  60% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(var(--rot));
    opacity: 0;
  }
}

/* === COLOR THEMES === */
.mime-celeste {
  --body-color: #1565c0;
  --belly-color: #e3f2fd;
  --collar-color: #bbdefb;
  --feet-color: #ffb74d;
  --ear-inner: #1e88e5;
  --hair-color: #0d47a1;
  --hair-highlight: #42a5f5;
}

.mime-lila {
  --body-color: #6a1b9a;
  --belly-color: #f3e5f5;
  --collar-color: #e1bee7;
  --feet-color: #ffb74d;
  --ear-inner: #8e24aa;
  --hair-color: #4a148c;
  --hair-highlight: #ba68c8;
}

.mime-melocoton {
  --body-color: #e65100;
  --belly-color: #fff3e0;
  --collar-color: #ffe0b2;
  --feet-color: #ffb74d;
  --ear-inner: #f4511e;
  --hair-color: #bf360c;
  --hair-highlight: #ff8a65;
}
</style>
