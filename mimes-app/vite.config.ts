import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // base: ruta donde se sirve la app en producción.
  // GitHub Pages publica en https://usuario.github.io/Proyectos_1/
  base: '/Proyectos_1/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // host: true hace que Vite escuche en 0.0.0.0 (todas las interfaces de red)
    // en vez de solo localhost (127.0.0.1).
    // Esto permite que otros dispositivos en tu misma red WiFi accedan al servidor.
    host: true,
  },
})
