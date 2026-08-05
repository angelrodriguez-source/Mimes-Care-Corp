# Plantilla: arrancar otra app con este mismo montaje

Guia para levantar un proyecto nuevo (otro repo, otro chat) reutilizando la
infraestructura ya probada aqui: **Vue 3 + TS + Supabase + GitHub Pages con
deploy y migraciones automaticas, todo gratis**.

Un chat nuevo NO recuerda las conversaciones anteriores, pero no hace falta:
todo el conocimiento util esta escrito en este repo (`project-context/`,
`CLAUDE.md`, los workflows). El chat nuevo solo tiene que leerlo.

---

## 1. Lo que creas tu (una vez, ~10 min)

| Que | Donde | Nota |
|-----|-------|------|
| Repo nuevo | github.com/new, tu misma cuenta | Publico (Actions gratis ilimitado). Se publicara en `angelrodriguez-source.github.io/<repo>/` |
| Proyecto Supabase | supabase.com/dashboard | El free tier permite **2 proyectos activos**; ya usas 1 con Mimes, te queda 1. Apunta URL + anon key |
| Secret `SUPABASE_DB_URL` | Repo nuevo > Settings > Secrets and variables > Actions | Connection string (URI, session pooler) del proyecto nuevo. **Contrasena sin caracteres especiales** (`@ # / : ?` rompen la URL) |

NO necesitas cuentas nuevas: mismo usuario de GitHub, de Supabase y de Google.

## 2. El prompt para el chat nuevo

Abre un chat nuevo **sobre el repo nuevo** y pega esto (ajustando lo de `<>`):

```
Quiero crear <DESCRIBE TU APP EN 2-3 FRASES: que hace, para quien, que
pantallas tiene>. Es para mi uso personal.

Quiero exactamente el mismo montaje que ya tengo en mi repo
angelrodriguez-source/Mimes-Care-Corp: Vue 3 + TypeScript + Vite + Pinia +
Supabase, publicado en GitHub Pages, con deploy automatico y migraciones de
base de datos automaticas al hacer push.

Adjunta ese repo (add_repo) y LEE antes de empezar:
- PLANTILLA-NUEVA-APP.md (la receta, con las convenciones)
- project-context/ (arquitectura, base de datos, deployment)
- .github/workflows/ y scripts/apply-migrations.sh (el pipeline a copiar)

Datos de mi proyecto Supabase nuevo:
- URL: <https://xxxx.supabase.co>
- anon key: <eyJ...>
El secret SUPABASE_DB_URL ya esta creado en este repo.

Monta el esqueleto, dejame el CLAUDE.md y project-context/ del proyecto
nuevo, y dime que tengo que ejecutar o configurar yo.
```

## 3. Que se copia tal cual (solo cambian nombres/URLs)

| Archivo | Que hace | Que cambiar |
|---------|----------|-------------|
| `.github/workflows/deploy.yml` | push → tests + type-check + build → publica en `gh-pages` | La ruta de la app si no se llama `mimes-app` |
| `.github/workflows/migrate.yml` | Aplica las migraciones nuevas de `supabase/migrations/` | Nada |
| `scripts/apply-migrations.sh` | Motor de migraciones (tabla `_migrations`, transaccion por archivo, validaciones) | Nada |
| `.github/workflows/keepalive.yml` | Ping cada 3 dias para que Supabase no pause el proyecto por inactividad + aviso por email si cae | La URL y la anon key del proyecto nuevo |
| `vite.config.ts` | `base: '/<nombre-del-repo>/'` — **imprescindible** en GitHub Pages | El nombre del repo (case-sensitive) |
| `public/sw.js`, `manifest.webmanifest` | PWA instalable | Nombre, colores, icono |

## 4. Convenciones que merece la pena mantener

Son las que han evitado la mayoria de los problemas en este proyecto:

- **Hash router** (`createWebHashHistory`) si sigues en GitHub Pages: no soporta
  history mode. (Con dominio propio + Cloudflare Pages podrias usar URLs limpias.)
- **Los componentes nunca llaman a Supabase**: todo pasa por un `services/xxxService.ts`.
- **Toda escritura sensible, en un RPC `SECURITY DEFINER`** con `FOR UPDATE`
  cuando haya riesgo de doble ejecucion (pagos, contadores, reclamos). El cliente
  no debe poder escribir columnas criticas.
- **RLS activado en TODAS las tablas**, incluidas las auxiliares (Supabase te
  manda un email de seguridad si te dejas una — nos paso con `_migrations`).
- **Migraciones**: un archivo por cambio en `supabase/migrations/` con nombre
  `YYYYMMDDHHMM_descripcion.sql`, idempotente (`IF NOT EXISTS`, `CREATE OR
  REPLACE`), y **nunca se edita una ya aplicada**: se crea otra encima.
- **Fechas del usuario**: Postgres esta en UTC. Si necesitas "hoy" en la zona del
  usuario, el cliente envia `new Date().toLocaleDateString('sv-SE')`.
- **Logica pura separada** (tipo `models/`) sin DOM ni red: es lo unico facil de
  testear y donde de verdad compensan los tests (Vitest).
- **`project-context/` actualizado al terminar cada sesion**: es lo que hace que
  el siguiente chat (o el siguiente tu, dentro de 3 meses) no empiece a ciegas.

## 5. Para una app personal, simplifica

Como es solo para ti, te puedes saltar bastante de lo que este juego necesita:

- **Sin registro publico**: login con Google (o magic link) y una policy RLS
  `user_id = auth.uid()` en cada tabla. Nadie mas puede entrar ni ver nada.
- **Sin onboarding ni tutorial**: no hay usuarios nuevos que guiar.
- **Sin economia, social ni realtime** salvo que tu caso los pida.

Lo que SI merece la pena desde el minuto uno: el deploy automatico, las
migraciones automaticas, el keepalive y RLS bien puesta.
