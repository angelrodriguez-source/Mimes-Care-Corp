<script setup lang="ts">
/**
 * LoginView.vue — Pantalla de login y registro
 *
 * Tiene dos modos: "login" y "register", que se alternan con un botón.
 * Al hacer submit, llama al userStore para autenticarse con Supabase.
 * Si todo va bien, redirige a la home.
 */
import { ref } from 'vue'
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
