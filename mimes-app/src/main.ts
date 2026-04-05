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

// Montar la app PRIMERO para que siempre se muestre algo en pantalla.
// Luego inicializar auth en background.
app.mount('#app')

const userStore = useUserStore()
userStore.init()
