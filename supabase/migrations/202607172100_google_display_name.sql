-- ============================================================
-- v8 — Login con Google: tomar el nombre de la cuenta de Google
--
-- Los registros por email guardan display_name en el metadata, pero
-- Google envia full_name / name. Sin esto, los usuarios de Google
-- quedaban como 'Jugador'.
--
-- Primera migracion del pipeline automatico (supabase/migrations/).
-- Si el secret SUPABASE_DB_URL aun no esta configurado, tambien se
-- puede ejecutar a mano en el SQL Editor — es idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear perfil (nombre: registro email > Google full_name > Google name > fallback)
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Jugador'
    ));

    -- Crear 3 Mimes con personalidades y colores distintos
    INSERT INTO public.mimes (dueno_id, nombre, personalidad, color_theme) VALUES
        (NEW.id, 'Aventurero', 'aventurero', 'celeste'),
        (NEW.id, 'Tranquilo', 'tranquilo', 'lila'),
        (NEW.id, 'Pícaro', 'picaro', 'melocoton');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
