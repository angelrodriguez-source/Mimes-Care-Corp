# Inicio de sesión — Mimes Care Corp

Guía rápida para arrancar una nueva sesión de Claude Code en este proyecto. Si es tu primera vez, lee esto antes de tocar nada.

---

## 1. Contexto del proyecto

**Qué es**: Mimes Care Corp, un juego social de mascotas virtuales donde **no cuidas tus propios Mimes**, cuidas los de otros. Cada usuario tiene 3 Mimes y los cede a otros cuidadores durante 7 días.

**Stack**:
- Frontend: Vue 3 + TypeScript + Vite
- Backend: Supabase (Auth + PostgreSQL + RLS + RPC)
- Deploy: GitHub Pages (rama `gh-pages`)
- Mobile (futuro): Capacitor

**Dónde está el código**: `virtual-pet-game/mimes-app/src/`

---

## 2. Documentación — leer antes de tocar código

Toda la documentación viva está en `virtual-pet-game/project-context/`. **Empieza siempre por ahí**:

| Archivo | Para qué |
|---------|----------|
| `01-OVERVIEW.md` | Visión, stack, URLs, estructura de carpetas |
| `02-DATABASE.md` | Tablas, RLS, RPCs, migraciones SQL |
| `03-FRONTEND-ARCHITECTURE.md` | Routing, store, servicios, composables |
| `04-COMPONENTS.md` | Vistas y componentes Vue |
| `05-MINIGAMES.md` | Sistema de mini-juegos (shell + slot) |
| `06-GAME-MECHANICS.md` | Stats, personalidades, afinidad, cesión, economía |
| `07-DEPLOYMENT.md` | Build, GitHub Pages, Supabase |
| `08-PENDING-WORK.md` | Bugs, deuda técnica, roadmap actual |

**Orden recomendado para entender el proyecto**: `01-OVERVIEW` → `06-GAME-MECHANICS` → `08-PENDING-WORK`.

**Otros documentos útiles**:
- `IDEAS.md` — buzón de ideas futuras, sin prioridad
- `GAME_DESIGN.md`, `ARCHITECTURE.md` — documentos originales de diseño (pueden estar desactualizados)
- `design/mimes/` — fichas de personalidad

---

## 3. Git — flujo de trabajo

**Rama activa**: `claude/setup-branch-or-project-fIwgB`

- **Nunca** desarrollar directamente sobre `main`
- **Nunca** desarrollar directamente sobre `gh-pages` (es solo para el build publicado)
- Al terminar: commit + push a la rama activa
- Solo crear PR si el usuario lo pide explícitamente

**Comandos habituales**:
```bash
git status
git checkout claude/setup-branch-or-project-fIwgB
git pull origin claude/setup-branch-or-project-fIwgB
# ...cambios...
git add <archivos específicos>
git commit -m "tipo: descripción corta"
git push -u origin claude/setup-branch-or-project-fIwgB
```

**Convención de commits**: `tipo(scope): descripción` en español.
Ejemplos: `feat(dashboard):`, `fix(minigames):`, `docs(ideas):`, `refactor(store):`.

---

## 4. Deploy a GitHub Pages

El deploy es **manual**. Se hace así:

```bash
cd virtual-pet-game/mimes-app
npm install          # si no has instalado aún
npx vite build       # genera dist/

cd /home/user/Proyectos_1
git checkout gh-pages
# borrar archivos viejos del root (cuidado de no borrar .git)
# copiar contenido de virtual-pet-game/mimes-app/dist/ al root
git add -A
git commit -m "deploy: <descripción>"
git push origin gh-pages
git checkout -f claude/setup-branch-or-project-fIwgB   # volver a la rama activa
```

Ver `07-DEPLOYMENT.md` para el detalle completo.

---

## 5. Convenciones del proyecto

- **Idioma**: código en español (stats, acciones, personalidades, variables). Comentarios y docs también en español
- **Router**: hash mode (necesario para GitHub Pages)
- **Componentes NO llaman a Supabase directamente** — usan `mimeService.ts`
- **Lógica pura del juego en `MimeModel.ts`** (sin side-effects, sin llamadas a red)
- **Estilos**: CSS puro con variables, sin framework CSS
- **Sin emojis en archivos** salvo que el usuario los pida
- **Sin crear archivos nuevos** si puedes editar uno existente
- **Sin documentación nueva** salvo que el usuario la pida

---

## 6. Cosas importantes a recordar

- El proyecto tiene **botones de debug** (reset, crecimiento +/-) que hay que **borrar antes de producción**. Están marcados en `08-PENDING-WORK.md`
- La **migración v4 (`cesion_start`)** puede no estar ejecutada en Supabase. Si hay errores de columna, hay que correr `supabase/migration_v4_cesion.sql` manualmente en el SQL Editor
- El **decay de stats es lazy**: se calcula al cargar el Dashboard o CareScreen, no hay cron job
- La **cesión de 7 días** también se chequea de forma lazy al cargar el Dashboard
- Hay dos bloques `<style>` en `MimeCharacter.vue` (scoped + no-scoped). El no-scoped es para elementos creados con `document.createElement` (heart-burst, zzz)

---

## 7. Al terminar una sesión

1. Commitear y pushear los cambios a la rama activa
2. Actualizar `project-context/08-PENDING-WORK.md` si se resolvieron bugs o se añadieron features
3. Actualizar otros docs de `project-context/` si hubo cambios arquitecturales
4. Si hay ideas nuevas que surgieron durante la sesión, añadirlas a `IDEAS.md`

---

*Última actualización: 2026-04-10*
