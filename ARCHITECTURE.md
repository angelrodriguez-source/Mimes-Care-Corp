# Mimes Care Corp — Arquitectura y Roadmap

> Documento vivo. Última actualización: 2026-04-05

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Vue 3 + TypeScript + Vite | Reactivo (stats/mood), SFC co-localiza CSS+lógica, ligero |
| **Backend** | Supabase | Auth, Realtime (WebSocket), PostgreSQL relacional, Edge Functions, free tier generoso |
| **Mobile** | Capacitor | Plugins nativos (QR scanner, push notifications), una codebase para web+iOS+Android |
| **Estilo** | CSS puro + variables | Ya probado en mime-preview.html, sin framework CSS |

### Por qué NO Phaser

- Mimes Care Corp no es un juego de acción, es una app social con personajes animados
- Las interacciones son UI estándar (tocar, ver stats, mensajes, QR), no patrones de game engine
- `mime-preview.html` (CSS/HTML puro) ya es visualmente superior al MimeRenderer.js de Phaser
- Phaser añade ~1MB de bundle para resolver un problema que no tenemos
- El minijuego se puede reimplementar como Canvas suelto dentro de Vue

### Por qué Supabase y no Firebase

- Modelo de datos relacional (users → mimes → care_actions, users ↔ users)
- Firestore cobra por lectura — peligroso para real-time de stats
- Supabase Realtime es por conexión WebSocket, no por mensaje
- PostgreSQL: foreign keys, constraints, views para queries complejas
- Edge Functions (Deno) para lógica server-side con cron

---

## Modelo de Datos

```sql
-- Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    puntos_mimes INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mimes
CREATE TABLE mimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dueno_id UUID REFERENCES users(id) NOT NULL,
    cuidador_id UUID REFERENCES users(id),
    nombre TEXT NOT NULL,
    personalidad TEXT CHECK (personalidad IN ('aventurero', 'tranquilo', 'picaro')) NOT NULL,
    color_theme TEXT CHECK (color_theme IN ('celeste', 'lila', 'melocoton')) NOT NULL,
    nivel INTEGER DEFAULT 1,
    experiencia INTEGER DEFAULT 0,
    -- 6 stats (0-100)
    hambre INTEGER DEFAULT 70,
    higiene INTEGER DEFAULT 70,
    diversion INTEGER DEFAULT 70,
    carino INTEGER DEFAULT 70,
    energia INTEGER DEFAULT 70,
    apariencia INTEGER DEFAULT 70,
    -- Relación
    afinidad REAL DEFAULT 0,
    last_decay_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Conexiones entre usuarios (via QR)
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID REFERENCES users(id) NOT NULL,
    user_b_id UUID REFERENCES users(id) NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_a_id, user_b_id)
);

-- Mensajes (dueño→cuidador via Mime, o Mime→dueño)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mime_id UUID REFERENCES mimes(id) NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('dueno', 'mime')) NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de acciones de cuidado
CREATE TABLE care_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mime_id UUID REFERENCES mimes(id) NOT NULL,
    cuidador_id UUID REFERENCES users(id) NOT NULL,
    action_type TEXT CHECK (action_type IN ('alimentar', 'limpiar', 'jugar', 'carino', 'descansar', 'vestir')) NOT NULL,
    puntos_cost INTEGER NOT NULL,
    stat_changes JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies (Row Level Security)

- **Mimes lectura**: `dueno_id = auth.uid() OR cuidador_id = auth.uid()`
- **Mimes update stats**: solo `cuidador_id = auth.uid()`
- **Mimes ceder** (set cuidador_id): solo `dueno_id = auth.uid()`
- **Connections**: ambos usuarios involucrados
- **Messages**: participantes del Mime (dueño o cuidador)

---

## Fases de Implementación

### Fase 0: Scaffolding (1 semana)
- [ ] Crear proyecto Vue 3 + Vite + TypeScript
- [ ] Configurar Capacitor (iOS + Android)
- [ ] Portar CSS Mime → componente `<MimeCharacter>` (props: personality, colorTheme, mood, scale)
- [ ] Verificar render en WebView de Capacitor
- [ ] Crear proyecto Supabase

### Fase 1: Loop de juego local (2-3 semanas)
- [ ] `MimeModel.ts` — 6 stats, modificadores por personalidad, derivación de humor
- [ ] `CareScreen.vue` — Mime + 6 botones de acción + barras de stats
- [ ] `StatBar.vue`, `ActionButton.vue`
- [ ] Navegación: "Mis Mimes" / "Mimes a mi cargo"
- [ ] Decay de stats por tiempo
- [ ] Persistencia temporal en LocalStorage

### Fase 2: Backend + Auth (2 semanas)
- [ ] Schema Supabase + RLS policies
- [ ] Auth: registro/login (email+password)
- [ ] Edge Function: crear 3 Mimes al registrarse
- [ ] Edge Function: decay de stats (cron)
- [ ] Migrar de LocalStorage a Supabase
- [ ] Puntos Mimes: generación server-side

### Fase 3: Core Social (3-4 semanas)
- [ ] QR Connection (generar + escanear + validar)
- [ ] Ceder Mimes (1 por persona, max 3)
- [ ] Vista "Mimes a mi cargo" (lista + cuidar)
- [ ] Vista "Mis Mimes" (lectura + realtime)
- [ ] Supabase Realtime en tabla mimes
- [ ] Afinidad server-side + abandono < 10%

### Fase 4: Mensajería + Polish (2 semanas)
- [ ] Mensajes dueño → cuidador (speech bubble)
- [ ] Mensajes automáticos del Mime → dueño
- [ ] Push notifications
- [ ] Animaciones idle por personalidad

### Fase 5: Lanzamiento (1-2 semanas)
- [ ] Iconos, splash screens
- [ ] Build Capacitor iOS/Android
- [ ] Error handling, modo offline
- [ ] TestFlight / testing interno

**Total: 11-14 semanas** (3-4 meses, equipo 1-2 personas)

---

## Qué NO hacer en el MVP

- Accesorios/ropa (por definir)
- Progresión de capacidad (empezar con 3 slots fijos)
- Puntos por anuncios (allowance diaria gratis)
- Chat directo entre usuarios (el Mime ES el mensajero)
- Minijuego (no es core social)
- Recompensas por nivel

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| QR-only limita crecimiento | Añadir códigos de invitación como fallback |
| Balance de decay | Tunear en Fase 1 antes de multijugador |
| Coste realtime | RT solo en "Mis Mimes", no en vista de cuidador |

---

## Estructura de Proyecto (objetivo)

```
mimes-care-corp/
├── src/
│   ├── components/
│   │   ├── MimeCharacter.vue     ← portado de mime-preview.html
│   │   ├── StatBar.vue
│   │   ├── ActionButton.vue
│   │   └── MoodSelector.vue
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── MyMimesView.vue       ← "Mis Mimes" (solo lectura)
│   │   ├── CareMimesView.vue     ← "Mimes a mi cargo"
│   │   ├── CareScreen.vue        ← cuidar un Mime específico
│   │   ├── LoginView.vue
│   │   └── QRScanView.vue
│   ├── models/
│   │   └── MimeModel.ts          ← 6 stats, personalidad, humor
│   ├── services/
│   │   ├── supabase.ts           ← cliente Supabase
│   │   └── mimeService.ts        ← CRUD, decay, acciones
│   ├── stores/
│   │   ├── userStore.ts          ← auth + puntos
│   │   └── mimeStore.ts          ← estado reactivo de mimes
│   ├── router/
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── design/                        ← documentos existentes
├── public/
├── capacitor.config.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```
