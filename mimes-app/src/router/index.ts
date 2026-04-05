import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      // Lazy loading: CareScreen solo se carga cuando el usuario navega a /care.
      // Esto hace que la carga inicial de la app sea más rápida.
      path: '/care',
      name: 'care',
      component: () => import('../views/CareScreen.vue'),
    },
  ],
})

export default router
