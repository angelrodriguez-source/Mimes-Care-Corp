/**
 * tutorialSteps.ts — Definicion declarativa del tutorial interactivo.
 *
 * Cada paso describe:
 *  - target: selector `data-tutorial` del elemento a destacar (o null = centrado)
 *  - route: ruta a la que hay que navegar ANTES de mostrar el paso
 *           (solo se navega si la ruta actual no coincide)
 *  - title / body: texto del tooltip
 *  - placement: posicion preferida del tooltip respecto al target
 */

export type TutorialPlacement = 'top' | 'bottom' | 'center'

export interface TutorialStep {
  id: string
  target?: string
  route?: 'dashboard' | 'care'
  title: string
  body: string
  placement?: TutorialPlacement
}

/**
 * Capitulos:
 *  1. Bienvenida
 *  2. Dashboard: mis mimes + compartir
 *  3. Cesion de 7 dias + adoptar
 *  4. CareScreen: cuidado, mini-juegos y stats
 *  5. Economia: PM, recompensa diaria y cierre
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // --- CAPITULO 1: BIENVENIDA ---
  {
    id: 'welcome',
    route: 'dashboard',
    title: 'Bienvenido a Mimes Care Corp',
    body: 'Te voy a ensenar como cuidar Mimes, compartirlos con amigos y ganar Puntos Mimes. Son 2 minutos.',
    placement: 'center',
  },

  // --- CAPITULO 2: DASHBOARD Y MIS MIMES ---
  {
    id: 'my-mimes',
    route: 'dashboard',
    target: 'my-mimes-section',
    title: 'Estos son tus 3 Mimes',
    body: 'Tienes un Aventurero, un Tranquilo y un Picaro. Cada uno tiene 6 stats que van bajando con el tiempo.',
    placement: 'bottom',
  },
  {
    id: 'share',
    route: 'dashboard',
    target: 'share-btn-first',
    title: 'Pero tu no los cuidas',
    body: 'La magia es social: tu no cuidas tus Mimes, los cuidan otros. Pulsa "Compartir" para generar un codigo y darselo a un amigo.',
    placement: 'bottom',
  },

  {
    id: 'starter',
    route: 'dashboard',
    target: 'caring-section',
    title: 'Y este es tu Mime inicial',
    body: 'No tiene dueno: es tuyo para practicar. Cuidalo durante su semana y al terminar te llevaras sus Puntos Mimes... y ademas pasara a ser tuyo de verdad.',
    placement: 'top',
  },

  // --- CAPITULO 3: CESION Y ADOPCION ---
  {
    id: 'cesion-info',
    route: 'dashboard',
    title: 'La cesion dura 7 dias',
    body: 'Cuando un amigo adopta tu Mime, empieza una cesion de 7 dias. Al final, recibira Puntos Mimes segun la afinidad que haya conseguido.',
    placement: 'center',
  },
  {
    id: 'adoptar',
    route: 'dashboard',
    target: 'adopt-section',
    title: 'Y tu cuidas los de otros',
    body: 'Si un amigo te pasa un codigo, introducelo aqui para adoptar su Mime durante 7 dias.',
    placement: 'top',
  },

  // --- CAPITULO 4: CARESCREEN ---
  {
    id: 'care-intro',
    route: 'dashboard',
    title: 'Asi se cuida un Mime',
    body: 'Vamos a echar un vistazo a la pantalla de cuidado. Te llevo.',
    placement: 'center',
  },
  {
    id: 'care-actions',
    route: 'care',
    target: 'actions-menu',
    title: 'Las 6 acciones de cuidado',
    body: 'Alimentar, limpiar, jugar, carino, descansar y vestir. Cada una cuesta Puntos Mimes y lanza un mini-juego. Si lo ganas, el stat correspondiente sube.',
    placement: 'bottom',
  },
  {
    id: 'care-difficulty',
    route: 'care',
    target: 'actions-menu',
    title: 'Facil o Avanzado?',
    body: 'Cada accion tiene DOS mini-juegos. El avanzado es mas dificil, pero si lo ganas la recompensa es x1.5: los stats y la afinidad suben mas.',
    placement: 'bottom',
  },
  {
    id: 'care-accessory',
    route: 'care',
    target: 'accessory-btn',
    title: 'Ponle estilo',
    body: 'Con este boton le pones a tu Mime los accesorios que compres en la tienda: lazo, gorra, gafas, chistera o corona.',
    placement: 'bottom',
  },
  {
    id: 'care-messages',
    route: 'care',
    title: 'El Mime lleva mensajes',
    body: 'Si cuidas el Mime de un amigo, puede aparecer una burbuja: es un mensaje que su dueno le ha dejado para ti. Tocala para cerrarla.',
    placement: 'center',
  },
  {
    id: 'care-stats',
    route: 'care',
    target: 'status-summary',
    title: 'Afinidad y mood',
    body: 'Aqui ves la afinidad (0-100%), el estado de animo y la media de stats. Tocalo para abrir el panel con los 6 stats.',
    placement: 'top',
  },

  // --- CAPITULO 5: ECONOMIA Y CIERRE ---
  {
    id: 'pm-dashboard',
    route: 'dashboard',
    target: 'pm-badge',
    title: 'Puntos Mimes',
    body: 'Los PM son la moneda del juego. Los ganas al terminar cesiones, reclamando tu recompensa diaria (racha!) y los gastas en acciones de cuidado.',
    placement: 'bottom',
  },
  {
    id: 'shop',
    route: 'dashboard',
    target: 'shop-btn',
    title: 'La tienda de accesorios',
    body: 'Gasta tus PM en accesorios para tus Mimes. Se compran aqui y se equipan desde la pantalla de cuidado.',
    placement: 'bottom',
  },
  {
    id: 'message-btn-info',
    route: 'dashboard',
    title: 'Habla a traves de tu Mime',
    body: 'Cuando un amigo este cuidando uno de tus Mimes, en su tarjeta aparecera el boton "Mensaje": escribe algo y tu Mime se lo dira de tu parte.',
    placement: 'center',
  },
  {
    id: 'sound-toggle',
    route: 'dashboard',
    target: 'sound-btn',
    title: 'Sonidos',
    body: 'El juego tiene efectos de sonido y vibracion. Con este boton los silencias o los activas cuando quieras.',
    placement: 'bottom',
  },
  {
    id: 'finale',
    route: 'dashboard',
    title: 'Listo!',
    body: 'Ya sabes todo. Puedes volver a ver el tutorial pulsando el boton "?" del header cuando quieras. A cuidar Mimes!',
    placement: 'center',
  },
]
