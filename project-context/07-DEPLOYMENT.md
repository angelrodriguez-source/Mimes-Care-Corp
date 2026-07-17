# 07 - Deployment y Build

## GitHub Pages

**URL produccion**: `https://angelrodriguez-source.github.io/Mimes-Care-Corp/`

### Como se publica (automatico desde 2026-07-17)

**Push a `main` = deploy.** El workflow `.github/workflows/deploy.yml`:
1. `npm ci` + `npm run test` + `npm run build` (si algo falla, NO se publica)
2. Publica `mimes-app/dist/` en la rama `gh-pages` (peaceiris/actions-gh-pages)

GitHub Pages sigue sirviendo la rama `gh-pages` — no hubo que cambiar
configuracion. En PRs el workflow solo testea y buildea (sin publicar).

Deploy manual de emergencia (el metodo antiguo sigue funcionando):

```bash
cd mimes-app
npm run build              # type-check + build (genera dist/)
npx gh-pages -d dist       # publica dist/ a la rama gh-pages del remoto
```

### Migraciones de base de datos (automatico desde 2026-07-17)

Las migraciones NUEVAS van en `supabase/migrations/` con nombre
`YYYYMMDDHHMM_descripcion.sql`. Al hacer push, el workflow
`.github/workflows/migrate.yml` ejecuta `scripts/apply-migrations.sh`,
que aplica solo lo pendiente (registro en la tabla `public._migrations`,
cada archivo en su propia transaccion).

**Requiere** el secret `SUPABASE_DB_URL` en GitHub (Settings > Secrets and
variables > Actions) con la connection string de Supabase Dashboard >
Settings > Database. Tambien se puede lanzar a mano (pestana Actions) o en
local: `SUPABASE_DB_URL='...' bash scripts/apply-migrations.sh`.

Las migraciones historicas (schema + v2..v7) se ejecutaron a mano en el
SQL Editor y NO deben copiarse a `supabase/migrations/`.

### Requisitos criticos

1. **`base: '/Mimes-Care-Corp/'`** en `vite.config.ts` — porque GitHub Pages sirve bajo ese path (case-sensitive, coincide con el nombre exacto del repo)
2. **`.nojekyll`** en la raiz de `gh-pages` — Jekyll ignora archivos con `_` prefix que Vite genera (ej: `_plugin-vue_export-helper-xxx.js`)
3. **Hash router** (`createWebHashHistory`) — GitHub Pages no soporta SPA history mode. Las URLs usan `/#/` (ej: `/#/dashboard`)

### Problemas historicos resueltos
- **Blank page**: Jekyll filtraba archivos `_*`. Solucion: `.nojekyll`
- **404 en rutas directas**: History mode no funciona en GH Pages. Solucion: hash mode
- **Email confirmacion redirige a localhost**: Supabase tenia Site URL como localhost. Solucion: cambiar en Supabase Dashboard > Authentication > URL Configuration

## Build

```bash
npm run dev          # Dev server (hot reload) en http://localhost:5173
npm run build        # Type-check + build
npm run build-only   # Solo build (sin type-check)
npm run type-check   # Solo vue-tsc --build
npm run test         # Tests unitarios (Vitest) — MimeModel
npm run preview      # Preview del build local
```

### PWA

La app es instalable como PWA (2026-07-14):
- `public/manifest.webmanifest` — nombre, colores, `display: standalone`, icono SVG
- `public/icon.svg` — icono de la app (carita de Mime)
- `public/sw.js` — service worker: red-primero para HTML (no sirve versiones viejas), cache-primero para `/assets/` (inmutables por hash de Vite). No intercepta llamadas a Supabase
- El SW se registra en `main.ts` solo en produccion (`import.meta.env.PROD`)

### Dependencias principales

| Paquete | Version | Uso |
|---------|---------|-----|
| vue | ^3.5.31 | Framework |
| vue-router | ^5.0.4 | Routing |
| pinia | ^3.0.4 | Estado global |
| @supabase/supabase-js | ^2.101.1 | Backend |
| vite | ^8.0.3 | Build tool |
| typescript | ~6.0.0 | Type safety |
| vue-tsc | ^3.2.6 | Vue type-checking |
| gh-pages | ^6.3.0 | Deploy de dist/ a la rama gh-pages |

**Node requerido**: ^20.19.0 || >=22.12.0

## Ramas Git

| Rama | Contenido | Accion |
|------|-----------|--------|
| `main` | **Toda la app actual** | Rama de desarrollo activa |
| `gh-pages` | Build compilado + .nojekyll | Publicada automaticamente por GitHub Pages |

## Supabase

### Configuracion necesaria en el dashboard

1. **Authentication > URL Configuration**:
   - Site URL: `https://angelrodriguez-source.github.io/Mimes-Care-Corp/`

2. **SQL Editor**: Ejecutar las migraciones en orden:
   1. `supabase/schema.sql`
   2. `supabase/migration_v2_share.sql`
   3. `supabase/migration_v3_one_per_owner.sql`
   4. `supabase/migration_v4_cesion.sql` (anade `cesion_start` + actualiza `claim_mime`/`release_mime`)
   5. `supabase/migration_v5_daily_reward.sql` (anade `last_daily_claim_date`/`daily_streak` + RPC `claim_daily_reward`)
   6. `supabase/migration_v6_tutorial.sql` (anade `tutorial_completed` + RPC `mark_tutorial_completed`)
   7. `supabase/migration_v7_social.sql` (RPCs `add_points`/`expire_cesion`, accesorios, mensajeria, realtime)

3. **Auth > Settings**:
   - Email confirmations: activo
   - Password min length: 6

### Nota sobre handle_new_user()
La funcion trigger que crea perfil + 3 mimes al registrarse necesita:
```sql
SET search_path = public
```
Y usar `public.profiles` / `public.mimes` explicitamente. Sin esto da "Database Error saving user".
