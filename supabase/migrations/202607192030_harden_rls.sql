-- ============================================================
-- v9 — Endurecimiento de seguridad (hallazgos de la auditoria)
--
-- 1) ALTA: un cuidador podia robar un Mime (update de dueno_id) o
--    manipular la cesion, porque las policies de UPDATE de mimes no
--    restringen columnas. Trigger que protege las columnas de
--    identidad: dueno_id es inmutable, y cuidador_id/share_code/
--    cesion_start solo los toca el dueno o los RPCs SECURITY DEFINER
--    (que corren como postgres, no como 'authenticated').
--
-- 2) MEDIA: profiles era legible por el rol anon (volcado global de
--    nombres y puntos sin login). Ahora solo authenticated.
--
-- 3) BAJA: un participante podia editar el TEXTO de los mensajes via
--    la policy de UPDATE (pensada solo para marcar leido). Trigger
--    que solo permite cambiar la columna read.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Proteger columnas de identidad de mimes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_mime_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Los RPCs SECURITY DEFINER (claim_mime, release_mime, expire_cesion)
  -- y el admin corren con current_user distinto de 'authenticated':
  -- pasan libremente. Solo se restringe el acceso directo del cliente.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.dueno_id IS DISTINCT FROM OLD.dueno_id THEN
    RAISE EXCEPTION 'dueno_id es inmutable';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.dueno_id AND (
       NEW.cuidador_id  IS DISTINCT FROM OLD.cuidador_id
    OR NEW.share_code   IS DISTINCT FROM OLD.share_code
    OR NEW.cesion_start IS DISTINCT FROM OLD.cesion_start
  ) THEN
    RAISE EXCEPTION 'solo el dueno o los RPCs pueden modificar la cesion';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_mime_identity ON public.mimes;
CREATE TRIGGER protect_mime_identity
  BEFORE UPDATE ON public.mimes
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_mime_identity();

-- ------------------------------------------------------------
-- 2) profiles: solo visibles para usuarios autenticados
-- ------------------------------------------------------------
DROP POLICY IF EXISTS users_read_any_profile ON public.profiles;
CREATE POLICY users_read_any_profile ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Nota: el keepalive (anon) seguira recibiendo HTTP 200 — PostgREST
-- devuelve lista vacia cuando RLS filtra todo, no un error.

-- ------------------------------------------------------------
-- 3) messages: el UPDATE de participantes solo puede tocar `read`
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_message_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.content     IS DISTINCT FROM OLD.content
  OR NEW.mime_id     IS DISTINCT FROM OLD.mime_id
  OR NEW.sender_type IS DISTINCT FROM OLD.sender_type THEN
    RAISE EXCEPTION 'solo se puede marcar el mensaje como leido';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_message_update ON public.messages;
CREATE TRIGGER protect_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_message_update();
