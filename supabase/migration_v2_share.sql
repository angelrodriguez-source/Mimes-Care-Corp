-- ============================================================
-- Mimes Care Corp — Migracion v2: Sistema de compartir
-- ============================================================
-- Ejecuta este SQL en el SQL Editor de Supabase DESPUES del schema.sql
-- ============================================================

-- 1. Añadir columna share_code a la tabla mimes
-- Este codigo de 6 caracteres permite compartir un Mime con otro usuario
ALTER TABLE mimes ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- 2. Permitir que los perfiles se puedan ver entre usuarios conectados
-- (necesario para mostrar el nombre del dueño/cuidador)
CREATE POLICY "users_read_any_profile" ON profiles
    FOR SELECT USING (true);

-- Eliminar la politica anterior que solo permitia ver tu propio perfil
-- (comentar si da error porque ya se elimino)
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;

-- 3. Funcion RPC para reclamar un Mime con un codigo
-- Se ejecuta como SECURITY DEFINER para poder buscar en mimes sin RLS
CREATE OR REPLACE FUNCTION claim_mime(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_mime RECORD;
    v_already_caring BOOLEAN;
BEGIN
    -- Buscar el Mime por codigo
    SELECT id, dueno_id, cuidador_id, nombre
    INTO v_mime
    FROM public.mimes
    WHERE share_code = p_code;

    -- Codigo no encontrado
    IF v_mime.id IS NULL THEN
        RETURN json_build_object('error', 'Codigo no valido');
    END IF;

    -- No puedes cuidar tu propio Mime
    IF v_mime.dueno_id = auth.uid() THEN
        RETURN json_build_object('error', 'No puedes cuidar tu propio Mime');
    END IF;

    -- Ya tiene cuidador
    IF v_mime.cuidador_id IS NOT NULL THEN
        RETURN json_build_object('error', 'Este Mime ya tiene un cuidador');
    END IF;

    -- Restriccion: solo 1 Mime por dueno
    -- Comprobar si ya cuidas algun Mime de este mismo dueno
    SELECT EXISTS(
        SELECT 1 FROM public.mimes
        WHERE dueno_id = v_mime.dueno_id AND cuidador_id = auth.uid()
    ) INTO v_already_caring;

    IF v_already_caring THEN
        RETURN json_build_object('error', 'Ya cuidas un Mime de este usuario. Solo puedes cuidar 1 por persona.');
    END IF;

    -- Asignar cuidador y limpiar codigo
    UPDATE public.mimes
    SET cuidador_id = auth.uid(), share_code = NULL
    WHERE id = v_mime.id;

    RETURN json_build_object('success', true, 'mime_name', v_mime.nombre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Funcion RPC para generar un codigo de compartir
CREATE OR REPLACE FUNCTION generate_share_code(p_mime_id UUID)
RETURNS JSON AS $$
DECLARE
    v_mime RECORD;
    v_code TEXT;
BEGIN
    -- Verificar que el Mime pertenece al usuario
    SELECT id, cuidador_id
    INTO v_mime
    FROM public.mimes
    WHERE id = p_mime_id AND dueno_id = auth.uid();

    IF v_mime.id IS NULL THEN
        RETURN json_build_object('error', 'Mime no encontrado');
    END IF;

    -- Ya tiene cuidador
    IF v_mime.cuidador_id IS NOT NULL THEN
        RETURN json_build_object('error', 'Este Mime ya tiene un cuidador');
    END IF;

    -- Generar codigo aleatorio de 6 caracteres
    v_code := upper(substr(md5(random()::text), 1, 6));

    -- Guardar codigo
    UPDATE public.mimes
    SET share_code = v_code
    WHERE id = p_mime_id;

    RETURN json_build_object('success', true, 'code', v_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Funcion RPC para devolver un Mime (el cuidador lo suelta)
CREATE OR REPLACE FUNCTION release_mime(p_mime_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE public.mimes
    SET cuidador_id = NULL
    WHERE id = p_mime_id AND cuidador_id = auth.uid();

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Mime no encontrado o no eres su cuidador');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FIN - Despues de ejecutar esto tienes:
--   + share_code en mimes
--   + claim_mime(code) para adoptar
--   + generate_share_code(mime_id) para compartir
--   + release_mime(mime_id) para soltar un Mime
--   + Perfiles visibles para todos (necesario para ver nombres)
-- ============================================================
