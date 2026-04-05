import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '../stores/userStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/care',
      name: 'care',
      component: () => import('../views/CareScreen.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
  ],
})

/**
 * Navigation guard — se ejecuta ANTES de cada navegación.
 *
 * Lógica:
 *   - Si vas a /login y ya estás logueado → te manda a /
 *   - Si vas a cualquier otra ruta y NO estás logueado → te manda a /login
 *   - En cualquier otro caso → te deja pasar
 */
router.beforeEach((to) => {
  const userStore = useUserStore()

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
