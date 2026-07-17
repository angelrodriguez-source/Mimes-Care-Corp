# Guia de puesta en marcha — Mimes Care Corp

Checklist paso a paso para dejar el juego 100% operativo con todo lo nuevo
(mini-juegos avanzados, mensajeria, realtime, tienda, PWA y CI/CD).
Tiempo total: **~10 minutos**. Los pasos 1-4 se hacen UNA sola vez.

---

## Paso 1 — Reactivar Supabase (solo si esta pausado)

El plan gratuito de Supabase pausa el proyecto tras ~7 dias sin uso.

1. Entra en https://supabase.com/dashboard
2. Abre el proyecto `igcvucyhcfyupmzstoqg`
3. Si ves un boton **"Restore project"** o **"Resume"**, pulsalo y espera
   1-2 minutos a que la base de datos arranque
4. Si el proyecto aparece normal (verde), no hay nada que hacer

> A partir de hoy esto no deberia volver a pasar: el workflow
> **Keepalive Supabase** hace una consulta cada 3 dias para mantenerlo
> despierto. Si aun asi se pausara, GitHub te avisa por email (el
> workflow falla) y basta con repetir este paso.

## Paso 2 — Ejecutar la migracion v7 (base de datos)

Necesaria para: mensajeria, realtime, tienda de accesorios y PM atomicos.

1. En el dashboard de Supabase: menu lateral → **SQL Editor**
2. **New query**
3. Abre el archivo [`supabase/migration_v7_social.sql`](supabase/migration_v7_social.sql)
   del repo, copia TODO su contenido y pegalo en el editor
4. Pulsa **Run** (Ctrl+Enter)
5. Debe terminar con "Success. No rows returned"

Si da error "already exists" en algo, no pasa nada: significa que esa parte
ya estaba aplicada. Puedes ignorarlo.

## Paso 3 — Crear el secret para migraciones automaticas

Con esto, las futuras migraciones (archivos en `supabase/migrations/`)
se aplican solas al hacer push — no volveras a copiar SQL a mano.

1. **Consigue la connection string**: Supabase Dashboard → ⚙️ **Project
   Settings** → **Database** → seccion **Connection string** → pestana
   **URI** → copia la cadena (empieza por `postgresql://postgres...`)
   - Si tiene `[YOUR-PASSWORD]`, sustituyelo por la contrasena de la base
     de datos (la elegiste al crear el proyecto; se puede resetear ahi mismo)
2. **Crea el secret en GitHub**: repo → **Settings** → **Secrets and
   variables** → **Actions** → **New repository secret**
   - Name: `SUPABASE_DB_URL`
   - Secret: pega la connection string completa
3. **Comprueba que funciona**: pestana **Actions** → workflow
   **"Migraciones Supabase"** → boton **Run workflow** → debe terminar
   en verde con "0 aplicadas" (aun no hay migraciones nuevas — correcto)

## Paso 4 — Probar el keepalive

1. Pestana **Actions** → workflow **"Keepalive Supabase"** → **Run workflow**
2. Verde = Supabase responde. Rojo = esta pausado (vuelve al Paso 1)

A partir de ahora corre solo cada 3 dias.

## Paso 5 — Refrescar la app en tus dispositivos

Por el service worker de la PWA, la primera vez tras estos cambios:

- **Movil**: cierra la pestana/app del todo y vuelve a abrirla. Si la
  tenias instalada como PWA de antes, desinstala y reinstala
  ("Anadir a pantalla de inicio") para coger el manifest nuevo
- **Desktop**: Ctrl+Shift+R (refresh forzado)

En adelante no haras esto nunca mas: cuando despliegues, los jugadores
veran el toast "✨ Hay una version nueva — toca para actualizar".

## Paso 6 — Prueba rapida de que todo vive (5 min)

Con tu cuenta:
- [ ] Accion **limpiar** → Avanzado → sale el campo minado 💣
- [ ] Dashboard → 🛍️ → compra el lazo (30 PM) → en la pantalla de cuidado,
      boton 🎀 → equipalo → aparece sobre el pelo del Mime
- [ ] Suena el arpegio al ganar un mini-juego (toggle 🔊 en el header)

Con dos cuentas (normal + incognito):
- [ ] A comparte un Mime → B lo adopta → en la tarjeta de A aparece
      **💬 Mensaje** → A escribe algo → B entra a cuidar y ve la burbuja
- [ ] Con A mirando el dashboard, B hace una accion de cuidado → la
      tarjeta de A se actualiza sola (realtime)

---

## Tu flujo de trabajo a partir de ahora

| Quiero... | Hago... |
|-----------|---------|
| Cambiar codigo del juego | Editar → commit → `git push` → **listo** (CI testea, buildea y despliega solo) |
| Cambiar la base de datos | Crear `supabase/migrations/YYYYMMDDHHMM_descripcion.sql` → commit → `git push` → se aplica sola |
| Ver si un deploy fue bien | Pestana **Actions** del repo (o el badge del README) |
| Deploy manual de emergencia | `cd mimes-app && npm run build && npx gh-pages -d dist` |

## Si algo falla

| Sintoma | Causa probable | Solucion |
|---------|---------------|----------|
| La web da errores raros de datos | Supabase pausado | Paso 1 |
| "No se pudo guardar. Revisa tu conexion" en el juego | Supabase caido o sin internet | Reintentar; si persiste, Paso 1 |
| No veo los cambios tras un deploy | Cache del service worker | Espera al toast de actualizar, o cierra y abre la app |
| Workflow "CI y Deploy" en rojo | Un test o el type-check fallo | Abre el run en Actions y mira el log — el deploy NO se hizo (produccion sigue sana) |
| Los crons dejan de ejecutarse | Repo sin commits 60 dias | Actions → workflow → boton "Enable workflow" |
| La tienda/mensajes fallan | Falta la migracion v7 | Paso 2 |
