# Migraciones automaticas

**Las migraciones NUEVAS van aqui** y se aplican solas al hacer push
(workflow `migrate.yml` + `scripts/apply-migrations.sh`).

Las historicas (`schema.sql` y `migration_v2` a `v7`, en `supabase/`)
ya se ejecutaron a mano en el SQL Editor y NO deben copiarse aqui —
volverian a ejecutarse y fallarian.

## Convencion de nombres

`YYYYMMDDHHMM_descripcion.sql` — el orden alfabetico es el orden de
aplicacion. Ejemplo: `202607171200_tienda_sombreros.sql`

## Reglas

1. Una migracion nunca se edita despues de mergeada a main — si hay que
   corregir algo, se crea otra migracion nueva
2. Cada archivo se aplica dentro de una transaccion: o entra entero o no entra
3. El registro de lo aplicado vive en la tabla `public._migrations` de la DB

## Requisito para que funcione en CI (una sola vez)

Crear el secret `SUPABASE_DB_URL` en GitHub:
Settings > Secrets and variables > Actions > New repository secret,
con la connection string de
Supabase Dashboard > Settings > Database > Connection string (URI).
