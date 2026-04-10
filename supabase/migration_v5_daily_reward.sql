-- Migration v5: Recompensa diaria por login
--
-- Añade a `profiles`:
--   - last_daily_claim_date: fecha local (DATE) del último reclamo, NULL si nunca
--   - daily_streak: contador de dias consecutivos reclamando (0 inicialmente)
--
-- Añade el RPC `claim_daily_reward(p_client_date DATE)` que es atomico
-- e idempotente: si el usuario ya reclamó hoy devuelve already_claimed=true
-- sin sumar puntos. Usa FOR UPDATE para evitar races.
--
-- Tabla de recompensas por racha:
--   Dia 1: 10 PM
--   Dia 2: 15 PM
--   Dia 3: 20 PM
--   Dia 4: 25 PM
--   Dia 5: 35 PM
--   Dia 6: 50 PM
--   Dia 7+: 75 PM (cap)
--
-- La racha se mantiene si el ultimo reclamo fue ayer; si hubo un hueco,
-- se reinicia a 1. La fecha "hoy" la calcula el cliente en su TZ local y
-- se pasa como parametro (Postgres en Supabase esta en UTC).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_daily_claim_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0;

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

  -- Lock de la fila para evitar doble reclamación concurrente
  SELECT last_daily_claim_date, daily_streak, puntos_mimes
  INTO v_last, v_streak, v_current_points
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  -- Ya reclamado hoy -> idempotente
  IF v_last IS NOT NULL AND v_last = p_client_date THEN
    RETURN json_build_object(
      'already_claimed', true,
      'streak', v_streak,
      'reward', 0,
      'puntos_mimes', v_current_points
    );
  END IF;

  -- Calcular nueva racha
  IF v_last IS NULL OR v_last < p_client_date - INTERVAL '1 day' THEN
    v_new_streak := 1;                 -- primer dia o se salto >= 1 dia
  ELSIF v_last = p_client_date - INTERVAL '1 day' THEN
    v_new_streak := v_streak + 1;      -- dia consecutivo
  ELSE
    -- p_client_date < v_last (reloj del cliente hacia atras). No reclamable.
    RETURN json_build_object('error', 'Fecha invalida');
  END IF;

  -- Recompensa segun racha (cap a 75 desde dia 7)
  v_reward := v_rewards[LEAST(v_new_streak, 7)];

  UPDATE public.profiles
  SET puntos_mimes = puntos_mimes + v_reward,
      daily_streak = v_new_streak,
      last_daily_claim_date = p_client_date
  WHERE id = v_uid
  RETURNING puntos_mimes INTO v_current_points;

  RETURN json_build_object(
    'already_claimed', false,
    'streak', v_new_streak,
    'reward', v_reward,
    'puntos_mimes', v_current_points
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward(DATE) TO authenticated;
