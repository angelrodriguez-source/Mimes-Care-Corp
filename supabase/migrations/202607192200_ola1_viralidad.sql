-- ============================================================
-- v10 — Ola 1 de viralidad
--
-- 1) Color 'dorado' para el Mime legendario
-- 2) profiles.cesiones_completadas (las incrementa expire_cesion)
-- 3) RPC unlock_legendary: crea el 4º Mime al llegar a 3 cesiones
-- 4) Bonus de video: 3 visionados/dia x 5 PM (RPC atomico)
-- ============================================================

-- ------------------------------------------------------------
-- 1) Permitir el color dorado (tema del legendario)
-- ------------------------------------------------------------
ALTER TABLE public.mimes DROP CONSTRAINT IF EXISTS mimes_color_theme_check;
ALTER TABLE public.mimes ADD CONSTRAINT mimes_color_theme_check
  CHECK (color_theme IN ('celeste', 'lila', 'melocoton', 'dorado'));

-- ------------------------------------------------------------
-- 2) Contador de cesiones completadas + estado del bonus de video
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cesiones_completadas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_bonus_date DATE,
  ADD COLUMN IF NOT EXISTS video_bonus_count INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 3) expire_cesion ahora tambien incrementa cesiones_completadas
--    del cuidador (mismo cuerpo que v7 + una linea)
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

  IF v_mime.dueno_id <> v_uid AND v_mime.cuidador_id IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('error', 'No autorizado');
  END IF;

  IF v_mime.cuidador_id IS NULL OR v_mime.cesion_start IS NULL THEN
    RETURN json_build_object('expired', false);
  END IF;

  IF NOW() < v_mime.cesion_start + INTERVAL '7 days' THEN
    RETURN json_build_object('expired', false);
  END IF;

  v_reward := ROUND(v_mime.afinidad)::INTEGER;

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + v_reward,
      cesiones_completadas = cesiones_completadas + 1
  WHERE id = v_mime.cuidador_id;

  UPDATE public.mimes
  SET cuidador_id = NULL, share_code = NULL, afinidad = 0, cesion_start = NULL
  WHERE id = p_mime_id;

  RETURN json_build_object('expired', true, 'reward', v_reward, 'cuidador_id', v_mime.cuidador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_cesion(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 4) RPC unlock_legendary: crea el Mime legendario (dorado) si el
--    usuario completo >= 3 cesiones y aun no lo tiene. Idempotente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_legendary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_completadas INTEGER;
  v_personalidad TEXT;
  v_mime_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT cesiones_completadas INTO v_completadas
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF COALESCE(v_completadas, 0) < 3 THEN
    RETURN json_build_object('error', 'Aun no has completado 3 cesiones');
  END IF;

  IF EXISTS (SELECT 1 FROM public.mimes WHERE dueno_id = v_uid AND color_theme = 'dorado') THEN
    RETURN json_build_object('error', 'Ya tienes tu Mime legendario');
  END IF;

  -- Personalidad aleatoria de las tres clasicas
  v_personalidad := (ARRAY['aventurero', 'tranquilo', 'picaro'])[1 + floor(random() * 3)::int];

  INSERT INTO public.mimes (dueno_id, nombre, personalidad, color_theme)
  VALUES (v_uid, 'Legendario', v_personalidad, 'dorado')
  RETURNING id INTO v_mime_id;

  RETURN json_build_object('success', true, 'mime_id', v_mime_id, 'personalidad', v_personalidad);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_legendary() TO authenticated;

-- ------------------------------------------------------------
-- 5) RPC claim_video_bonus: +5 PM por video, maximo 3 al dia.
--    Mismo patron atomico/idempotente que claim_daily_reward
--    (la fecha la envia el cliente en su zona horaria).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_video_bonus(p_client_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_date DATE;
  v_count INTEGER;
  v_puntos INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT video_bonus_date, video_bonus_count, puntos_mimes
  INTO v_date, v_count, v_puntos
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  -- Dia nuevo: resetear el contador
  IF v_date IS DISTINCT FROM p_client_date THEN
    v_count := 0;
  END IF;

  IF v_count >= 3 THEN
    RETURN json_build_object('error', 'Sin bonus restantes hoy', 'count', v_count, 'puntos_mimes', v_puntos);
  END IF;

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + 5,
      video_bonus_date = p_client_date,
      video_bonus_count = v_count + 1
  WHERE id = v_uid
  RETURNING puntos_mimes INTO v_puntos;

  RETURN json_build_object('success', true, 'count', v_count + 1, 'puntos_mimes', v_puntos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_video_bonus(DATE) TO authenticated;
