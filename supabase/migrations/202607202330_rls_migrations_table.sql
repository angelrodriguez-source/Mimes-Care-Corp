-- ============================================================
-- v11 — RLS en la tabla de control de migraciones
--
-- El Security Advisor de Supabase detecto (con razon) que
-- public._migrations no tenia RLS: cualquiera con la anon key podia
-- leer/escribir su contenido via REST y sabotear el registro de
-- migraciones aplicadas.
--
-- Con RLS activado y SIN policies, PostgREST (anon/authenticated) no
-- puede tocarla. El runner de migraciones no se ve afectado: conecta
-- como rol postgres (BYPASSRLS) por la connection string directa.
-- ============================================================

ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
