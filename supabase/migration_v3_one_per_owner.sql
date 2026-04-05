-- ============================================================
-- Mimes Care Corp — Migracion v3: Solo 1 Mime por dueno
-- ============================================================
-- Ejecuta este SQL en el SQL Editor de Supabase
-- Actualiza claim_mime para que un cuidador solo pueda adoptar
-- 1 Mime de cada usuario. Esto fuerza una RED: necesitas conocer
-- a 3 personas distintas para que cuiden a tus 3 Mimes.
-- ============================================================

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
    -- Si ya cuidas un Mime de este dueno, no puedes adoptar otro
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

-- ============================================================
-- FIN - La restriccion queda asi:
--   Usuario A tiene 3 Mimes → necesita 3 cuidadores DISTINTOS
--   Usuario B solo puede cuidar 1 Mime de A
--   Esto genera una red social real: mas amigos = mas cuidados
-- ============================================================
