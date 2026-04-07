-- ============================================================
-- Mimes Care Corp — Migracion v4: Cesion temporal (7 dias)
-- ============================================================
-- Ejecuta este SQL en el SQL Editor de Supabase
--
-- Cambios:
--   1. Nueva columna cesion_start en mimes
--   2. Actualiza claim_mime para registrar cesion_start al adoptar
--   3. Actualiza release_mime para limpiar cesion_start al soltar
-- ============================================================

-- 1. Anadir columna cesion_start
ALTER TABLE public.mimes
ADD COLUMN IF NOT EXISTS cesion_start TIMESTAMPTZ DEFAULT NULL;

-- 2. Actualizar claim_mime: ahora registra cesion_start
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
    SELECT EXISTS(
        SELECT 1 FROM public.mimes
        WHERE dueno_id = v_mime.dueno_id AND cuidador_id = auth.uid()
    ) INTO v_already_caring;

    IF v_already_caring THEN
        RETURN json_build_object('error', 'Ya cuidas un Mime de este usuario. Solo puedes cuidar 1 por persona.');
    END IF;

    -- Asignar cuidador, registrar inicio de cesion, limpiar codigo
    UPDATE public.mimes
    SET cuidador_id = auth.uid(),
        share_code = NULL,
        cesion_start = NOW()
    WHERE id = v_mime.id;

    RETURN json_build_object('success', true, 'mime_name', v_mime.nombre);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Actualizar release_mime: limpia cesion_start al soltar
CREATE OR REPLACE FUNCTION release_mime(p_mime_id UUID)
RETURNS JSON AS $$
BEGIN
    UPDATE public.mimes
    SET cuidador_id = NULL,
        cesion_start = NULL
    WHERE id = p_mime_id AND cuidador_id = auth.uid();

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'No se pudo soltar este Mime');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FIN - Sistema de cesion:
--   - Al adoptar: cesion_start = NOW()
--   - Al soltar/expirar: cesion_start = NULL
--   - El frontend checkea si han pasado 7 dias (lazy check)
--   - Si expira: cuidador recibe afinidad * 100 PM
-- ============================================================
