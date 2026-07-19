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
  const profile = ref<{
    display_name: string
    puntos_mimes: number
    last_daily_claim_date: string | null
    daily_streak: number
    tutorial_completed: boolean
  } | null>(null)
  // Para mostrar spinners mientras carga
  const loading = ref(true)

  // Promesa que se resuelve cuando init() termina. El router guard la
  // espera antes de decidir, para no dejar pasar a rutas protegidas
  // mientras la sesion inicial aun se esta comprobando.
  let resolveReady: () => void
  const ready = new Promise<void>(resolve => { resolveReady = resolve })

  // --- COMPUTED ---
  // Atajo: ¿está logueado?
  const isLoggedIn = computed(() => !!user.value)

  // --- ACTIONS ---

  /**
   * Devuelve una promesa que se resuelve cuando la sesión inicial
   * ya está comprobada (init() terminó, con o sin sesión).
   */
  function waitUntilReady() {
    return ready
  }

  /**
   * Inicializa el store: comprueba si ya hay una sesión activa.
   * Se llama UNA VEZ al arrancar la app (en main.ts).
   *
   * Supabase guarda la sesión en localStorage del navegador.
   * Si el usuario cerró la app y vuelve, sigue logueado.
   */
  async function init() {
    loading.value = true

    try {
      // getSession() comprueba si hay un token guardado en localStorage
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      }

      // onAuthStateChange escucha cambios de sesión (login, logout, token refresh).
      // OJO: el callback corre con el lock interno de auth cogido — hacer
      // llamadas a Supabase DENTRO (await fetchProfile) puede deadlockear
      // el refresh de token. Se difiere fuera del lock con setTimeout(0).
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
        if (session?.user) {
          setTimeout(() => { void fetchProfile() }, 0)
        } else {
          profile.value = null
        }
      })
    } finally {
      // Resolver SIEMPRE, incluso si Supabase falla — si no, el router
      // guard se quedaria esperando para siempre
      loading.value = false
      resolveReady()
    }
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
      .select('display_name, puntos_mimes, last_daily_claim_date, daily_streak, tutorial_completed')
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
        // URL exacta a la que vuelve el enlace de confirmacion del email.
        // Sin esto, Supabase redirige a la Site URL del dashboard y un
        // typo alli provocaba un 404 en GitHub Pages.
        // OJO: esta URL debe estar en la allow-list de Redirect URLs
        // (Supabase Dashboard > Authentication > URL Configuration).
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
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
   * Login con Google (OAuth). Redirige el navegador a Google; al volver,
   * supabase-js detecta el ?code= de la URL, crea la sesion y
   * onAuthStateChange hace el resto. Si es la primera vez, el trigger
   * handle_new_user crea el perfil + 3 mimes igual que en el registro
   * por email (v8: toma el nombre de la cuenta de Google).
   */
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Volver a la raiz de la app (funciona en GitHub Pages y en dev)
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
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
    waitUntilReady,
    init,
    fetchProfile,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }
})
