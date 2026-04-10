# 01 - Vision General del Proyecto

## Que es Mimes Care Corp

**Mimes Care Corp** es un juego de mascotas virtuales con mecanica social. Los Mimes son criaturas cuya mision es mantener el vinculo entre personas.

**La diferencia clave**: no cuidas tus propios Mimes, sino los de otras personas. Y otros cuidan los tuyos. El Mime representa a la persona que te lo dejo. No cuidas un pixel; cuidas algo de alguien que te importa.

## Stack Tecnologico

| Capa | Tecnologia | Archivo(s) clave |
|------|-----------|------------------|
| **Frontend** | Vue 3 + TypeScript + Vite | `mimes-app/src/` |
| **Estado** | Pinia | `src/stores/userStore.ts` |
| **Routing** | Vue Router (hash mode) | `src/router/index.ts` |
| **Backend** | Supabase (Auth + PostgreSQL + RLS + RPC) | `src/services/supabase.ts` |
| **Estilo** | CSS puro + CSS variables | `src/assets/base.css` |
| **Mobile (futuro)** | Capacitor | No configurado aun |

### Por que estas tecnologias

- **Vue 3 y no Phaser**: Mimes Care Corp es una app social con personajes animados, no un juego de accion. Las interacciones son UI estandar (tocar, ver stats, mensajes). `mime-preview.html` (CSS puro) ya era visualmente superior al renderer de Phaser.
- **Supabase y no Firebase**: Modelo relacional (users -> mimes -> care_actions), Firestore cobra por lectura (peligroso para real-time), PostgreSQL tiene foreign keys y constraints reales.
- **Hash router**: GitHub Pages no soporta SPA routing con history mode. El hash (`/#/dashboard`) evita 404s.

## URLs y Entornos

| Entorno | URL |
|---------|-----|
| **Produccion (GitHub Pages)** | `https://angelrodriguez-source.github.io/Mimes-Care-Corp/` |
| **Supabase Dashboard** | `https://supabase.com/dashboard` (proyecto: `igcvucyhcfyupmzstoqg`) |
| **Supabase API** | `https://igcvucyhcfyupmzstoqg.supabase.co` |
| **Repositorio** | `github.com/angelrodriguez-source/Mimes-Care-Corp` |

## Estructura de Carpetas

```
Mimes-Care-Corp/              # Raiz del repo
├── project-context/          # <-- Estos documentos
├── design/
│   └── mimes/                # Fichas de personalidad de cada Mime
│       ├── MIME_BASE.md
│       ├── MIME_AVENTURERO.md
│       ├── MIME_TRANQUILO.md
│       ├── MIME_PICARO.md
│       └── MIME_RENDER.md
├── supabase/
│   ├── schema.sql            # Schema inicial (tablas + RLS + trigger)
│   ├── migration_v2_share.sql # Sistema de compartir (share_code, RPCs)
│   └── migration_v3_one_per_owner.sql # Restriccion 1 mime por dueno
├── mimes-app/                # Proyecto Vue 3
│   ├── src/
│   │   ├── assets/           # CSS globales
│   │   ├── components/       # Componentes reutilizables
│   │   ├── composables/      # Logica reactiva extraida (hooks)
│   │   ├── constants/        # Constantes compartidas
│   │   ├── minigames/        # Sistema de mini-juegos
│   │   ├── models/           # Logica pura del juego
│   │   ├── router/           # Configuracion de rutas
│   │   ├── services/         # Supabase client + operaciones DB
│   │   ├── stores/           # Pinia (estado global)
│   │   ├── utils/            # Helpers genericos
│   │   ├── views/            # Pantallas principales
│   │   ├── App.vue           # Componente raiz (solo RouterView)
│   │   └── main.ts           # Entry point
│   ├── vite.config.ts        # Build config (base: /Mimes-Care-Corp/)
│   ├── package.json
│   └── tsconfig.json
├── mime-preview.html         # Prototipo original CSS del Mime
├── GAME_DESIGN.md            # Manifiesto de diseno v0.5
├── ARCHITECTURE.md           # Arquitectura y roadmap
└── IDEAS.md                  # Ideas futuras
```

## Ramas Git

| Rama | Proposito |
|------|-----------|
| `main` | **Rama principal de desarrollo** (todo el codigo actual) |
| `gh-pages` | Build compilado para GitHub Pages (contiene `.nojekyll`) |

## Configuracion Importante

### Vite (`vite.config.ts`)
- `base: '/Mimes-Care-Corp/'` — necesario porque GitHub Pages sirve bajo ese path (case-sensitive)
- `host: true` — permite acceso desde otros dispositivos en la misma red (para probar en movil)

### Supabase (`src/services/supabase.ts`)
- La anon key es publica y segura para frontend (solo permite lo que RLS autorice)
- URL: `https://igcvucyhcfyupmzstoqg.supabase.co`

### GitHub Pages
- Necesita un archivo `.nojekyll` en la raiz de `gh-pages` porque Jekyll ignora archivos que empiezan con `_` (como `_plugin-vue_export-helper-xxx.js` que genera Vite)
