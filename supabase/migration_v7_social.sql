-- ============================================================
-- MIGRACION v7 — Social: PM atomicos, accesorios, mensajeria y realtime
-- Ejecutar en Supabase SQL Editor despues de migration_v6_tutorial.sql
-- ============================================================

-- ------------------------------------------------------------
-- 1) RPC add_points: suma/resta atomica de PM del usuario actual.
--    Evita la race condition de escribir puntos_mimes como valor
--    absoluto leido antes (dos operaciones simultaneas se pisaban).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_points(p_delta INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_new INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  UPDATE public.profiles
  SET puntos_mimes = GREATEST(0, puntos_mimes + p_delta)
  WHERE id = v_uid
  RETURNING puntos_mimes INTO v_new;

  RETURN json_build_object('puntos_mimes', v_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_points(INTEGER) TO authenticated;

-- ------------------------------------------------------------
-- 2) RPC expire_cesion: cierre atomico de una cesion caducada.
--    Antes el frontend hacia 2 escrituras separadas (reset del mime +
--    PM al cuidador) que podian duplicarse si dueno y cuidador cargaban
--    el dashboard a la vez. El FOR UPDATE + la comprobacion de
--    cesion_start garantizan que solo se paga una vez.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_cesion(p_mime_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_mime RECORD;
  v_reward INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT * INTO v_mime FROM public.mimes WHERE id = p_mime_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Mime no encontrado');
  END IF;

  -- Solo participantes de la cesion
  IF v_mime.dueno_id <> v_uid AND v_mime.cuidador_id IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('error', 'No autorizado');
  END IF;

  -- Sin cesion activa o aun no caducada → no hacer nada
  IF v_mime.cuidador_id IS NULL OR v_mime.cesion_start IS NULL THEN
    RETURN json_build_object('expired', false);
  END IF;

  IF NOW() < v_mime.cesion_start + INTERVAL '7 days' THEN
    RETURN json_build_object('expired', false);
  END IF;

  -- Recompensa: afinidad (0-100) * PM_PER_AFFINITY (100) / 100 = afinidad
  v_reward := ROUND(v_mime.afinidad)::INTEGER;

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + v_reward
  WHERE id = v_mime.cuidador_id;

  UPDATE public.mimes
  SET cuidador_id = NULL, share_code = NULL, afinidad = 0, cesion_start = NULL
  WHERE id = p_mime_id;

  RETURN json_build_object('expired', true, 'reward', v_reward, 'cuidador_id', v_mime.cuidador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_cesion(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3) Accesorios: catalogo comprado por usuario + equipado por Mime
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS owned_accessories TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.mimes
  ADD COLUMN IF NOT EXISTS accessory TEXT DEFAULT NULL;

-- ------------------------------------------------------------
-- 4) Mensajeria: los participantes pueden marcar mensajes como leidos
--    (la tabla messages ya existia; faltaba la policy de UPDATE)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS participants_update_messages ON public.messages;
CREATE POLICY participants_update_messages ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.mimes m
      WHERE m.id = messages.mime_id
        AND (m.dueno_id = auth.uid() OR m.cuidador_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 5) Realtime: publicar cambios de mimes y messages para que la app
--    pueda suscribirse en vivo (Supabase Realtime / postgres_changes)
-- ------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mimes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
