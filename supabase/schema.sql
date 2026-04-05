-- ============================================================
-- Mimes Care Corp — Schema de base de datos
-- ============================================================
-- Ejecuta este SQL en el SQL Editor de Supabase:
--   https://supabase.com/dashboard → tu proyecto → SQL Editor → New query
--   Pega todo este contenido y dale a "Run"
-- ============================================================

-- ========================
-- 1. TABLA: profiles
-- ========================
-- Extiende la tabla de auth de Supabase con datos del juego.
-- Supabase ya tiene una tabla interna "auth.users" para login,
-- pero ahí no podemos añadir columnas propias (puntos, nombre visible).
-- Así que creamos "profiles" que enlaza con auth.users via el id.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Jugador',
    avatar_url TEXT,
    puntos_mimes INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 2. TABLA: mimes
-- ========================
-- Cada Mime con su dueño, cuidador, personalidad, color y 6 stats.
CREATE TABLE mimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dueno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cuidador_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    personalidad TEXT NOT NULL CHECK (personalidad IN ('aventurero', 'tranquilo', 'picaro')),
    color_theme TEXT NOT NULL CHECK (color_theme IN ('celeste', 'lila', 'melocoton')),
    -- 6 stats (0-100)
    hambre INTEGER NOT NULL DEFAULT 70,
    higiene INTEGER NOT NULL DEFAULT 70,
    diversion INTEGER NOT NULL DEFAULT 70,
    carino INTEGER NOT NULL DEFAULT 70,
    energia INTEGER NOT NULL DEFAULT 70,
    apariencia INTEGER NOT NULL DEFAULT 70,
    -- Relación
    afinidad REAL NOT NULL DEFAULT 0,
    last_decay_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 3. TABLA: connections
-- ========================
-- Conexiones entre usuarios (via QR presencial).
-- Si user_a y user_b están conectados, pueden cederse Mimes.
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_a_id, user_b_id)
);

-- ========================
-- 4. TABLA: care_actions
-- ========================
-- Log de cada acción de cuidado. Sirve para historial y auditoría.
CREATE TABLE care_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mime_id UUID NOT NULL REFERENCES mimes(id) ON DELETE CASCADE,
    cuidador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('alimentar', 'limpiar', 'jugar', 'carino', 'descansar', 'vestir')),
    puntos_cost INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 5. TABLA: messages
-- ========================
-- Mensajes entre dueño y cuidador a través del Mime.
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mime_id UUID NOT NULL REFERENCES mimes(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('dueno', 'mime')),
    content TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Activar RLS en todas las tablas. Sin estas políticas,
-- NADIE puede leer ni escribir (ni siquiera usuarios autenticados).

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- === PROFILES ===
-- Cada usuario puede ver y editar su propio perfil
CREATE POLICY "users_read_own_profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Permitir insertar su propio perfil (al registrarse)
CREATE POLICY "users_insert_own_profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- === MIMES ===
-- El dueño y el cuidador pueden ver un Mime
CREATE POLICY "mime_visible_to_participants" ON mimes
    FOR SELECT USING (dueno_id = auth.uid() OR cuidador_id = auth.uid());

-- Solo el cuidador puede actualizar los stats
CREATE POLICY "cuidador_updates_stats" ON mimes
    FOR UPDATE USING (cuidador_id = auth.uid());

-- Solo el dueño puede ceder (asignar cuidador)
-- Esto se hará via una Edge Function más adelante, por ahora permitimos update del dueño
CREATE POLICY "dueno_manages_mime" ON mimes
    FOR UPDATE USING (dueno_id = auth.uid());

-- El sistema inserta Mimes (al registrarse), habilitamos insert para el dueño
CREATE POLICY "dueno_inserts_mime" ON mimes
    FOR INSERT WITH CHECK (dueno_id = auth.uid());

-- === CONNECTIONS ===
-- Ambos usuarios pueden ver sus conexiones
CREATE POLICY "connection_visible_to_both" ON connections
    FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Cualquier usuario autenticado puede crear una conexión
CREATE POLICY "users_create_connections" ON connections
    FOR INSERT WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- === CARE ACTIONS ===
-- El cuidador puede registrar acciones
CREATE POLICY "cuidador_logs_actions" ON care_actions
    FOR INSERT WITH CHECK (cuidador_id = auth.uid());

-- El dueño y el cuidador pueden ver el historial
CREATE POLICY "participants_view_actions" ON care_actions
    FOR SELECT USING (
        cuidador_id = auth.uid() OR
        mime_id IN (SELECT id FROM mimes WHERE dueno_id = auth.uid())
    );

-- === MESSAGES ===
-- Participantes del Mime pueden ver mensajes
CREATE POLICY "participants_view_messages" ON messages
    FOR SELECT USING (
        mime_id IN (
            SELECT id FROM mimes
            WHERE dueno_id = auth.uid() OR cuidador_id = auth.uid()
        )
    );

-- El dueño puede enviar mensajes (tipo 'dueno')
CREATE POLICY "dueno_sends_messages" ON messages
    FOR INSERT WITH CHECK (
        sender_type = 'dueno' AND
        mime_id IN (SELECT id FROM mimes WHERE dueno_id = auth.uid())
    );

-- ============================================================
-- 7. FUNCIÓN: crear 3 Mimes al registrarse
-- ============================================================
-- Esta función se ejecuta automáticamente cuando un usuario se registra.
-- Crea su perfil y le asigna 3 Mimes (uno de cada personalidad).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear perfil
    INSERT INTO profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Jugador'));

    -- Crear 3 Mimes con personalidades y colores distintos
    INSERT INTO mimes (dueno_id, nombre, personalidad, color_theme) VALUES
        (NEW.id, 'Aventurero', 'aventurero', 'celeste'),
        (NEW.id, 'Tranquilo', 'tranquilo', 'lila'),
        (NEW.id, 'Pícaro', 'picaro', 'melocoton');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: ejecutar handle_new_user() cada vez que se registra alguien
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FIN
-- ============================================================
-- Después de ejecutar esto, tu base de datos tiene:
--   ✓ 5 tablas (profiles, mimes, connections, care_actions, messages)
--   ✓ RLS activado con políticas de seguridad
--   ✓ Trigger que crea 3 Mimes al registrarse un usuario
-- ============================================================
