import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/userStore'

const app = createApp(App)

// Pinia DEBE registrarse antes de usar cualquier store
app.use(createPinia())
app.use(router)

// Inicializar el store de usuario: comprueba si hay sesión guardada.
// Esto se hace ANTES de montar la app para que el route guard
// ya tenga la info de si el usuario está logueado o no.
const userStore = useUserStore()
userStore.init().then(() => {
  app.mount('#app')
})
