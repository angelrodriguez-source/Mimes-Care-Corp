# 07 - Deployment y Build

## GitHub Pages

**URL produccion**: `https://angelrodriguez-source.github.io/Mimes-Care-Corp/`

### Como se publica

El build de Vite se copia a la rama `gh-pages` usando el paquete `gh-pages`
(instalado como devDependency desde 2026-04-11):

```bash
cd mimes-app
npm run build              # type-check + build (genera dist/)
npx gh-pages -d dist       # publica dist/ a la rama gh-pages del remoto
```

Alternativa si el type-check da problemas y necesitas un deploy rapido:

```bash
npx vite build             # solo build, sin type-check
npx gh-pages -d dist
```

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
npm run preview      # Preview del build local
```

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

3. **Auth > Settings**:
   - Email confirmations: activo
   - Password min length: 6

### Nota sobre handle_new_user()
La funcion trigger que crea perfil + 3 mimes al registrarse necesita:
```sql
SET search_path = public
```
Y usar `public.profiles` / `public.mimes` explicitamente. Sin esto da "Database Error saving user".
