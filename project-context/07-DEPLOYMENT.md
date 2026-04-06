# 07 - Deployment y Build

## GitHub Pages

**URL produccion**: `https://angelrodriguez-source.github.io/Proyectos_1/`

### Como se publica

El build de Vite se copia a la rama `gh-pages`. Pasos manuales:

```bash
cd virtual-pet-game/mimes-app
npm run build-only          # genera dist/
# copiar dist/ a gh-pages branch con .nojekyll
```

### Requisitos criticos

1. **`base: '/Proyectos_1/'`** en `vite.config.ts` — porque GitHub Pages sirve bajo ese path
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

**Node requerido**: ^20.19.0 || >=22.12.0

## Ramas Git

| Rama | Contenido | Accion |
|------|-----------|--------|
| `main` | Codigo base original | No se desarrolla aqui |
| `claude/setup-branch-or-project-fIwgB` | **Toda la app actual** | Rama de desarrollo activa |
| `gh-pages` | Build compilado + .nojekyll | Publicada automaticamente por GitHub Pages |
| `claude/refactor-code-modularity-Id0rq` | Ya mergeada | **Puede eliminarse** |

## Supabase

### Configuracion necesaria en el dashboard

1. **Authentication > URL Configuration**:
   - Site URL: `https://angelrodriguez-source.github.io/Proyectos_1/`

2. **SQL Editor**: Ejecutar las migraciones en orden:
   1. `supabase/schema.sql`
   2. `supabase/migration_v2_share.sql`
   3. `supabase/migration_v3_one_per_owner.sql`

3. **Auth > Settings**:
   - Email confirmations: activo
   - Password min length: 6

### Nota sobre handle_new_user()
La funcion trigger que crea perfil + 3 mimes al registrarse necesita:
```sql
SET search_path = public
```
Y usar `public.profiles` / `public.mimes` explicitamente. Sin esto da "Database Error saving user".
