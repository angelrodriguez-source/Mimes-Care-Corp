-- ============================================================
-- v12 — Historial de Puntos Mimes (libro mayor)
--
-- Registra CADA movimiento de PM para que el jugador pueda ver de
-- donde vienen (y a donde van) sus puntos.
--
-- Principio de diseno: la tabla solo la escriben los RPCs
-- SECURITY DEFINER (que ya son la unica via legitima de mover PM).
-- El cliente solo puede LEER sus propias filas — ni forjar entradas
-- ni ver las de otros.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla del libro mayor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Positivo = ingreso, negativo = gasto
  delta INTEGER NOT NULL,
  -- Categoria: 'diaria' | 'cesion' | 'video' | 'accion' | 'tienda' | 'truco' | 'ajuste'
  reason TEXT NOT NULL,
  -- Texto libre opcional (nombre de la accion, del accesorio, del Mime...)
  detail TEXT,
  -- Saldo resultante tras el movimiento (para mostrar la evolucion)
  balance_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice para la consulta del historial (ultimos movimientos del usuario)
CREATE INDEX IF NOT EXISTS pm_ledger_user_fecha_idx
  ON public.pm_ledger (user_id, created_at DESC);

ALTER TABLE public.pm_ledger ENABLE ROW LEVEL SECURITY;

-- Solo lectura, y solo de lo propio. Sin policy de INSERT/UPDATE/DELETE:
-- el historial es inmutable desde el cliente.
DROP POLICY IF EXISTS users_read_own_ledger ON public.pm_ledger;
CREATE POLICY users_read_own_ledger ON public.pm_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2) Helper interno de registro.
--    NO se concede a authenticated/anon (Postgres da EXECUTE a PUBLIC
--    por defecto, asi que hay que revocarlo explicitamente) para que
--    nadie pueda inventarse movimientos desde la API.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_pm(
  p_uid UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_detail TEXT,
  p_balance INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Los movimientos de 0 PM no aportan nada al historial
  IF p_delta = 0 THEN RETURN; END IF;

  INSERT INTO public.pm_ledger (user_id, delta, reason, detail, balance_after)
  VALUES (p_uid, p_delta, p_reason, p_detail, p_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.log_pm(UUID, INTEGER, TEXT, TEXT, INTEGER) FROM PUBLIC;

-- ------------------------------------------------------------
-- 3) add_points ahora acepta motivo y detalle, y registra.
--    Se elimina la version de 1 argumento para evitar ambiguedad de
--    sobrecarga; el DEFAULT mantiene compatibles las llamadas viejas.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_points(INTEGER);

CREATE OR REPLACE FUNCTION public.add_points(
  p_delta INTEGER,
  p_reason TEXT DEFAULT 'ajuste',
  p_detail TEXT DEFAULT NULL
)
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

  PERFORM public.log_pm(v_uid, p_delta, p_reason, p_detail, v_new);

  RETURN json_build_object('puntos_mimes', v_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_points(INTEGER, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 4) claim_daily_reward: igual que v5 + registro en el libro mayor
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_client_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_last DATE;
  v_streak INTEGER;
  v_current_points INTEGER;
  v_new_streak INTEGER;
  v_reward INTEGER;
  v_rewards INTEGER[] := ARRAY[10, 15, 20, 25, 35, 50, 75];
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT last_daily_claim_date, daily_streak, puntos_mimes
  INTO v_last, v_streak, v_current_points
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  -- Ya reclamado hoy → idempotente
  IF v_last IS NOT NULL AND v_last = p_client_date THEN
    RETURN json_build_object(
      'already_claimed', true,
      'streak', v_streak,
      'reward', 0,
      'puntos_mimes', v_current_points
    );
  END IF;

  IF v_last IS NULL OR v_last < p_client_date - INTERVAL '1 day' THEN
    v_new_streak := 1;
  ELSIF v_last = p_client_date - INTERVAL '1 day' THEN
    v_new_streak := v_streak + 1;
  ELSE
    RETURN json_build_object('error', 'Fecha invalida');
  END IF;

  v_reward := v_rewards[LEAST(v_new_streak, 7)];

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + v_reward,
      daily_streak = v_new_streak,
      last_daily_claim_date = p_client_date
  WHERE id = v_uid
  RETURNING puntos_mimes INTO v_current_points;

  PERFORM public.log_pm(
    v_uid, v_reward, 'diaria',
    'Dia ' || LEAST(v_new_streak, 7) || ' de racha',
    v_current_points
  );

  RETURN json_build_object(
    'already_claimed', false,
    'streak', v_new_streak,
    'reward', v_reward,
    'puntos_mimes', v_current_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward(DATE) TO authenticated;

-- ------------------------------------------------------------
-- 5) claim_video_bonus: igual que v10 + registro
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

  PERFORM public.log_pm(
    v_uid, 5, 'video',
    'Bonus ' || (v_count + 1) || ' de 3',
    v_puntos
  );

  RETURN json_build_object('success', true, 'count', v_count + 1, 'puntos_mimes', v_puntos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_video_bonus(DATE) TO authenticated;

-- ------------------------------------------------------------
-- 6) expire_cesion: igual que v10 + registro para el cuidador
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
  WHERE id = v_mime.cuidador_id
  RETURNING puntos_mimes INTO v_balance;

  -- El registro es del CUIDADOR (quien cobra), no de quien dispara el RPC
  PERFORM public.log_pm(
    v_mime.cuidador_id, v_reward, 'cesion',
    'Cesion de ' || v_mime.nombre || ' completada',
    v_balance
  );

  UPDATE public.mimes
  SET cuidador_id = NULL, share_code = NULL, afinidad = 0, cesion_start = NULL
  WHERE id = p_mime_id;

  RETURN json_build_object('expired', true, 'reward', v_reward, 'cuidador_id', v_mime.cuidador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_cesion(UUID) TO authenticated;
