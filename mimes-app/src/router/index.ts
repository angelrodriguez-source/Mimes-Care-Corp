import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/care',
      name: 'care',
      component: () => import('../views/CareScreen.vue'),
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/HomeView.vue'),
      meta: { public: true },
    },
  ],
})

/**
 * Navigation guard — se ejecuta ANTES de cada navegación.
 *
 * Lógica:
 *   - Rutas con meta.public → acceso libre (explore)
 *   - Si vas a / (login) y ya estás logueado → te manda a /home
 *   - Si vas a ruta protegida y NO estás logueado → te manda a / (login)
 */
router.beforeEach((to) => {
  const userStore = useUserStore()

  // Rutas públicas: acceso libre
  if (to.meta.public) return true

  // Mientras carga la sesión inicial, no bloqueamos
  if (userStore.loading) return true

  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'home' }
  }

  if (to.name !== 'login' && !userStore.isLoggedIn) {
    return { name: 'login' }
  }

  return true
})

export default router
