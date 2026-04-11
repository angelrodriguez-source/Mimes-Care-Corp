-- =============================================
-- MIGRATION V6: Tutorial interactivo
-- =============================================
-- Añade una bandera en profiles para saber si el usuario ya completó el
-- tutorial interactivo. Se marca a true la primera vez que el usuario lo
-- termina; si no, el dashboard lo lanza automáticamente al entrar.
-- También se puede relanzar manualmente desde el botón "?" del header.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- RPC simple e idempotente para marcar el tutorial como completado.
-- Ejecuta bajo la identidad del usuario autenticado (no hace falta
-- SECURITY DEFINER porque RLS ya permite al dueño actualizar su propio
-- profile, pero lo mantenemos así para ser consistentes con el resto).
CREATE OR REPLACE FUNCTION public.mark_tutorial_completed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  UPDATE public.profiles
  SET tutorial_completed = TRUE
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_tutorial_completed() TO authenticated;
