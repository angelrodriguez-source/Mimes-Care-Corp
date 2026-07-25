-- ============================================================
-- v13 — Mime inicial (starter)
--
-- Problema: al registrarse, el jugador recibe 3 Mimes PROPIOS pero no
-- tiene ninguno que cuidar, asi que el loop principal (cuidar →
-- mini-juegos → PM) esta bloqueado hasta que un amigo le comparta uno.
--
-- Solucion: cada jugador nuevo recibe ademas un "Mime inicial" SIN
-- DUENO del que el es cuidador desde el primer segundo. Al terminar su
-- semana cobra los PM (como en cualquier cesion) y el Mime se GRADUA:
-- pasa a ser suyo, con lo que puede compartirlo y alimentar el loop
-- social.
--
-- Implica que `dueno_id` pasa a ser nullable (un Mime inicial no tiene
-- dueno). Revisado su efecto en las policies: `mime_visible_to_participants`
-- y `dueno_manages_mime` comparan con `auth.uid()`, y NULL nunca iguala,
-- asi que un Mime sin dueno solo lo ve/gestiona su cuidador. El trigger
-- protect_mime_identity (v9) sigue impidiendo que el cliente toque las
-- columnas de cesion: solo los RPCs pueden.
-- ============================================================

ALTER TABLE public.mimes ALTER COLUMN dueno_id DROP NOT NULL;

ALTER TABLE public.mimes
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 1) Helper: crea el Mime inicial de un jugador.
--    La cesion arranca en el momento de crearlo.
--    Sin EXECUTE para PUBLIC: nadie puede regalarse Mimes iniciales.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_starter_mime(p_uid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Personalidad y color emparejados como los 3 Mimes clasicos
  v_personalidades TEXT[] := ARRAY['aventurero', 'tranquilo', 'picaro'];
  v_colores        TEXT[] := ARRAY['celeste', 'lila', 'melocoton'];
  v_i INTEGER := 1 + floor(random() * 3)::int;
  v_id UUID;
BEGIN
  INSERT INTO public.mimes (
    dueno_id, cuidador_id, nombre, personalidad, color_theme, cesion_start, is_starter
  )
  VALUES (
    NULL, p_uid, 'Pipo', v_personalidades[v_i], v_colores[v_i], NOW(), TRUE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_starter_mime(UUID) FROM PUBLIC;

-- ------------------------------------------------------------
-- 2) handle_new_user: perfil + 3 Mimes propios + Mime inicial
--    (mantiene el nombre de Google de la v8)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Jugador'
    ));

    INSERT INTO public.mimes (dueno_id, nombre, personalidad, color_theme) VALUES
        (NEW.id, 'Aventurero', 'aventurero', 'celeste'),
        (NEW.id, 'Tranquilo', 'tranquilo', 'lila'),
        (NEW.id, 'Pícaro', 'picaro', 'melocoton');

    -- Mime inicial: sin dueno, a cargo del propio jugador
    PERFORM public.create_starter_mime(NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 3) expire_cesion: al vencer un Mime inicial, en vez de devolverlo a
--    un dueno (no tiene), se GRADUA y pasa a ser del cuidador.
--    El pago de PM es identico al de cualquier cesion.
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
  v_balance INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT * INTO v_mime FROM public.mimes WHERE id = p_mime_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Mime no encontrado');
  END IF;

  -- Participantes: dueno o cuidador (en un Mime inicial dueno_id es NULL,
  -- asi que la comprobacion recae en el cuidador)
  IF v_mime.dueno_id IS DISTINCT FROM v_uid
     AND v_mime.cuidador_id IS DISTINCT FROM v_uid THEN
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
  WHERE id = v_mime.cuidador_id
  RETURNING puntos_mimes INTO v_balance;

  PERFORM public.log_pm(
    v_mime.cuidador_id, v_reward, 'cesion',
    CASE WHEN v_mime.is_starter
      THEN v_mime.nombre || ' se ha graduado'
      ELSE 'Cesion de ' || v_mime.nombre || ' completada'
    END,
    v_balance
  );

  IF v_mime.is_starter THEN
    -- Se gradua: el cuidador pasa a ser su dueno y deja de estar cedido
    UPDATE public.mimes
    SET dueno_id = v_mime.cuidador_id,
        cuidador_id = NULL,
        is_starter = FALSE,
        share_code = NULL,
        afinidad = 0,
        cesion_start = NULL
    WHERE id = p_mime_id;
  ELSE
    -- Cesion normal: vuelve a su dueno
    UPDATE public.mimes
    SET cuidador_id = NULL, share_code = NULL, afinidad = 0, cesion_start = NULL
    WHERE id = p_mime_id;
  END IF;

  RETURN json_build_object(
    'expired', true,
    'reward', v_reward,
    'cuidador_id', v_mime.cuidador_id,
    'graduated', COALESCE(v_mime.is_starter, false),
    'mime_name', v_mime.nombre
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_cesion(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3b) release_mime rechaza soltar el Mime inicial: sin dueno al que
--     volver, se quedaria huerfano (invisible para todos). La UI ya
--     oculta el boton; esto lo blinda tambien en el servidor.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_mime(p_mime_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_starter BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT is_starter INTO v_is_starter
  FROM public.mimes
  WHERE id = p_mime_id AND cuidador_id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'No cuidas este Mime');
  END IF;

  IF v_is_starter THEN
    RETURN json_build_object('error', 'No puedes soltar tu Mime inicial');
  END IF;

  UPDATE public.mimes
  SET cuidador_id = NULL, cesion_start = NULL, share_code = NULL
  WHERE id = p_mime_id AND cuidador_id = v_uid;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_mime(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 4) Backfill: dar su Mime inicial a los jugadores ya registrados
--    (si no tienen uno en curso). Se ejecuta una sola vez.
-- ------------------------------------------------------------
INSERT INTO public.mimes (
  dueno_id, cuidador_id, nombre, personalidad, color_theme, cesion_start, is_starter
)
SELECT
  NULL, p.id, 'Pipo',
  (ARRAY['aventurero', 'tranquilo', 'picaro'])[r.i],
  (ARRAY['celeste', 'lila', 'melocoton'])[r.i],
  NOW(), TRUE
FROM public.profiles p
CROSS JOIN LATERAL (SELECT 1 + floor(random() * 3)::int AS i) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.mimes m
  WHERE m.cuidador_id = p.id AND m.is_starter
);
