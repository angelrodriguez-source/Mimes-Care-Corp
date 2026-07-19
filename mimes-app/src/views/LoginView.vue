<script setup lang="ts">
/**
 * LoginView.vue — Pantalla de login y registro
 *
 * Tiene dos modos: "login" y "register", que se alternan con un botón.
 * Al hacer submit, llama al userStore para autenticarse con Supabase.
 * Si todo va bien, redirige a la home.
 */
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// --- ESTADO DEL FORMULARIO ---
const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const displayName = ref('')
const error = ref('')
const submitting = ref(false)
const googleLoading = ref(false)

// Al volver del OAuth de Google aterrizamos en esta vista con la sesion
// creandose en background — en cuanto exista, saltar al dashboard.
watch(
  () => userStore.isLoggedIn,
  logged => { if (logged) router.push('/dashboard') },
  { immediate: true },
)

async function handleGoogle() {
  error.value = ''
  googleLoading.value = true
  const err = await userStore.signInWithGoogle()
  if (err) {
    error.value = 'No se pudo iniciar sesion con Google'
    googleLoading.value = false
  }
  // Sin error: el navegador esta redirigiendo a Google, no hay mas que hacer
}

async function handleSubmit() {
  error.value = ''
  submitting.value = true

  if (mode.value === 'register') {
    if (!displayName.value.trim()) {
      error.value = 'Elige un nombre'
      submitting.value = false
      return
    }
    const err = await userStore.signUp(email.value, password.value, displayName.value)
    if (err) {
      error.value = err.message
    } else {
      // Supabase puede requerir confirmación de email.
      // Por ahora, si no da error, intentamos login directo.
      const loginErr = await userStore.signIn(email.value, password.value)
      if (loginErr) {
        error.value = 'Cuenta creada. Revisa tu email para confirmarla.'
      } else {
        router.push('/dashboard')
      }
    }
  } else {
    const err = await userStore.signIn(email.value, password.value)
    if (err) {
      error.value = 'Email o contraseña incorrectos'
    } else {
      router.push('/dashboard')
    }
  }

  submitting.value = false
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <h1 class="login-title">Mimes Care Corp</h1>
      <p class="login-subtitle">
        {{ mode === 'login' ? 'Entra en tu cuenta' : 'Crea tu cuenta' }}
      </p>

      <form @submit.prevent="handleSubmit" class="login-form">
        <!-- Nombre (solo en registro) -->
        <div v-if="mode === 'register'" class="form-group">
          <label for="name">Nombre</label>
          <input
            id="name"
            v-model="displayName"
            type="text"
            placeholder="Tu nombre en el juego"
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="tu@email.com"
            autocomplete="email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autocomplete="current-password"
            minlength="6"
            required
          />
        </div>

        <!-- Mensaje de error -->
        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta' }}
        </button>
      </form>

      <div class="divider"><span>o</span></div>

      <button class="google-btn" :disabled="googleLoading" @click="handleGoogle">
        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        {{ googleLoading ? 'Conectando...' : 'Continuar con Google' }}
      </button>

      <p class="toggle-text">
        {{ mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?' }}
        <button class="toggle-btn" @click="toggleMode">
          {{ mode === 'login' ? 'Regístrate' : 'Inicia sesión' }}
        </button>
      </p>
    </div>

    <router-link to="/explore" class="explore-link">
      Explore Mimes 🎭
    </router-link>
  </div>
</template>

<style scoped>
.login-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px 16px;
}

/* Separador "o" entre formulario y Google */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  color: #bbb;
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 11px;
  background: white;
  border: 1.5px solid #dadce0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #3c4043;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
}

.google-btn:active:not(:disabled) {
  background: #f1f3f4;
}

.google-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.google-icon {
  flex-shrink: 0;
}

.login-screen .explore-link {
  position: fixed;
  bottom: 24px;
  left: 0;
  right: 0;
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #5c6bc0;
  text-align: center;
  margin-bottom: 4px;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  text-align: center;
  margin-bottom: 24px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 700;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input {
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-family: 'Baloo 2', cursive;
  transition: border-color 0.2s;
  outline: none;
}

.form-group input:focus {
  border-color: #5c6bc0;
}

.form-error {
  font-size: 13px;
  color: #f44336;
  text-align: center;
}

.submit-btn {
  padding: 12px;
  background: #5c6bc0;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:active {
  background: #3f51b5;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-text {
  text-align: center;
  margin-top: 20px;
  font-size: 13px;
  color: #999;
}

.toggle-btn {
  background: none;
  border: none;
  color: #5c6bc0;
  font-weight: 700;
  font-family: 'Baloo 2', cursive;
  cursor: pointer;
  font-size: 13px;
}

.explore-link {
  display: block;
  text-align: center;
  margin-top: 24px;
  color: #5c6bc0;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.explore-link:active {
  opacity: 1;
}
</style>
