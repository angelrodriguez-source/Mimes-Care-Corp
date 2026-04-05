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
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/care/:id',
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

// Rutas que no requieren login
const publicRoutes = ['login', 'explore']

router.beforeEach((to) => {
  const userStore = useUserStore()

  // Rutas publicas: acceso libre
  if (to.meta.public || publicRoutes.includes(to.name as string)) return true

  // Mientras carga la sesion inicial, no bloqueamos
  if (userStore.loading) return true

  // Si va a login y ya esta logueado → dashboard
  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'dashboard' }
  }

  // Si va a ruta protegida y NO esta logueado → login
  if (!publicRoutes.includes(to.name as string) && !userStore.isLoggedIn) {
    return { name: 'login' }
  }

  return true
})

export default router
