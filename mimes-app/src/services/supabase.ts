/**
 * supabase.ts — Cliente de conexión a Supabase
 *
 * Este archivo crea UNA SOLA instancia del cliente Supabase y la exporta.
 * Todos los demás archivos (stores, services, componentes) importan
 * este cliente para hablar con la base de datos.
 *
 * createClient() necesita 2 cosas:
 *   1. SUPABASE_URL: la dirección de tu proyecto (como la dirección de un edificio)
 *   2. SUPABASE_ANON_KEY: la llave pública (como la llave del portal, no la del piso)
 *
 * La anon key es SEGURA para poner en código frontend. Solo permite acceder
 * a lo que las políticas de RLS permitan. No es la service_role key (esa sí es secreta).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://igcvucyhcfyupmzstoqg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY3Z1Y3loY2Z5dXBtenN0b3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDc1MTcsImV4cCI6MjA5MDk4MzUxN30.dpC179HbuVLvSE_vs9DaED6eI3g0GDkllZoxg74N4YM'

// createClient() devuelve un objeto con métodos para:
//   .auth     → registro, login, logout, sesión actual
//   .from()   → leer/escribir en tablas de la base de datos
//   .channel()→ escuchar cambios en tiempo real
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
