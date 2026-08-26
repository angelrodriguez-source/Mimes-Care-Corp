-- ============================================================
-- v15 — Latido real para el keepalive
--
-- El 2026-08-26 Supabase aviso de pausa inminente por "actividad
-- insuficiente" A PESAR de que el keepalive corria en verde cada 3
-- dias. Causa: desde la v9 el SELECT anonimo a profiles devuelve 0
-- filas (RLS solo authenticated) — HTTP 200, pero una lectura vacia
-- que el detector de actividad de Supabase no considera suficiente.
--
-- Solucion: un RPC que hace una ESCRITURA minima (updatea la unica
-- fila de _heartbeat). Una escritura es actividad inequivoca. El
-- workflow pasa ademas de cada 3 dias a diario.
-- ============================================================

CREATE TABLE IF NOT EXISTS public._heartbeat (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public._heartbeat (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS sin policies: nadie lee ni escribe la tabla via API...
ALTER TABLE public._heartbeat ENABLE ROW LEVEL SECURITY;

-- ...salvo a traves de este RPC (SECURITY DEFINER), que solo toca la
-- fila 1. Se concede a anon a proposito: el keepalive no usa secrets.
-- Abusarlo solo actualiza un timestamp — inocuo.
CREATE OR REPLACE FUNCTION public.keepalive_ping()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public._heartbeat SET last_ping = NOW() WHERE id = 1
  RETURNING last_ping;
$$;

GRANT EXECUTE ON FUNCTION public.keepalive_ping() TO anon, authenticated;
