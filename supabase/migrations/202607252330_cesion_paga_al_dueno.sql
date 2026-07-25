-- ============================================================
-- v14 — Los PM de la cesion pasan a ser del DUENO
--
-- Cambio de economia social: hasta ahora, al cerrar una cesion de 7
-- dias los PM (ROUND(afinidad)) los cobraba el CUIDADOR. El dueno no
-- ganaba nada por compartir, asi que no tenia ningun incentivo material
-- para buscar cuidadores.
--
-- Ahora los PM son del DUENO: que alguien cuide bien tu Mime te hace
-- ganar, lo que convierte "¿me cuidas el Mime?" en una peticion con
-- valor para quien la hace, y empuja la reciprocidad (yo cuido el tuyo,
-- tu cuidas el mio → los dos cobramos como duenos).
--
-- Excepcion: el Mime inicial (v13) no tiene dueno, asi que sus PM son
-- para el jugador que lo ha criado — es su premio por aprender.
--
-- `cesiones_completadas` sigue siendo del CUIDADOR: mide el trabajo
-- hecho y es lo que desbloquea el Mime Legendario.
-- ============================================================

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
  v_beneficiario UUID;
  v_cuidador_name TEXT;
  v_detalle TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT * INTO v_mime FROM public.mimes WHERE id = p_mime_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Mime no encontrado');
  END IF;

  -- Participantes: dueno o cuidador (en un Mime inicial dueno_id es NULL)
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

  -- Cobra el dueno; si no hay dueno (Mime inicial), cobra el cuidador
  v_beneficiario := COALESCE(v_mime.dueno_id, v_mime.cuidador_id);

  SELECT display_name INTO v_cuidador_name
  FROM public.profiles WHERE id = v_mime.cuidador_id;

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + v_reward
  WHERE id = v_beneficiario
  RETURNING puntos_mimes INTO v_balance;

  -- El merito de haber cuidado sigue siendo del cuidador
  UPDATE public.profiles
  SET cesiones_completadas = cesiones_completadas + 1
  WHERE id = v_mime.cuidador_id;

  v_detalle := CASE
    WHEN v_mime.is_starter THEN v_mime.nombre || ' se ha graduado'
    ELSE v_mime.nombre || ' cuidado por ' || COALESCE(v_cuidador_name, 'alguien')
  END;

  PERFORM public.log_pm(v_beneficiario, v_reward, 'cesion', v_detalle, v_balance);

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
    'cuidador_name', v_cuidador_name,
    'graduated', COALESCE(v_mime.is_starter, false),
    -- true = los PM han ido al dueno (cesion normal)
    'paid_owner', v_mime.dueno_id IS NOT NULL,
    'mime_name', v_mime.nombre
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_cesion(UUID) TO authenticated;
