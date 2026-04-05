/**
 * userStore.ts — Estado global del usuario autenticado
 *
 * Un "store" de Pinia es como una variable global que toda la app puede leer.
 * Cuando cambia, todos los componentes que la usen se actualizan automáticamente.
 *
 * defineStore('user', () => { ... }) crea el store con Composition API.
 * Dentro usamos ref() y funciones, igual que en un componente.
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  // El usuario de Supabase Auth (email, id, etc.) o null si no está logueado
  const user = ref<User | null>(null)
  // Datos del perfil del juego (nombre, puntos)
  const profile = ref<{ display_name: string; puntos_mimes: number } | null>(null)
  // Para mostrar spinners mientras carga
  const loading = ref(true)

  // --- COMPUTED ---
  // Atajo: ¿está logueado?
  const isLoggedIn = computed(() => !!user.value)

  // --- ACTIONS ---

  /**
   * Inicializa el store: comprueba si ya hay una sesión activa.
   * Se llama UNA VEZ al arrancar la app (en main.ts).
   *
   * Supabase guarda la sesión en localStorage del navegador.
   * Si el usuario cerró la app y vuelve, sigue logueado.
   */
  async function init() {
    loading.value = true

    // getSession() comprueba si hay un token guardado en localStorage
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      user.value = session.user
      await fetchProfile()
    }

    // onAuthStateChange escucha cambios de sesión (login, logout, token refresh)
    // Es como un "vigilante" que avisa cuando el estado de auth cambia
    supabase.auth.onAuthStateChange(async (_event, session) => {
      user.value = session?.user ?? null
      if (session?.user) {
        await fetchProfile()
      } else {
        profile.value = null
      }
    })

    loading.value = false
  }

  /**
   * Carga el perfil del usuario desde la tabla "profiles".
   * Recuerda: auth.users tiene email/password, pero profiles tiene
   * nuestros datos del juego (nombre visible, puntos).
   */
  async function fetchProfile() {
    if (!user.value) return

    const { data } = await supabase
      .from('profiles')
      .select('display_name, puntos_mimes')
      .eq('id', user.value.id)
      .single()

    if (data) {
      profile.value = data
    }
  }

  /**
   * Registro: crea un usuario nuevo con email y contraseña.
   * El trigger de la base de datos (handle_new_user) se encarga de:
   *   1. Crear el perfil en la tabla "profiles"
   *   2. Crear los 3 Mimes
   *
   * @returns error si algo falla, o null si todo OK
   */
  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    return error
  }

  /**
   * Login: entra con email y contraseña existentes.
   */
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return error
  }

  /**
   * Logout: cierra la sesión.
   */
  async function signOut() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    loading,
    isLoggedIn,
    init,
    fetchProfile,
    signUp,
    signIn,
    signOut,
  }
})
