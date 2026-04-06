# 02 - Base de Datos (Supabase / PostgreSQL)

## Conexion

- **Proyecto Supabase**: `igcvucyhcfyupmzstoqg`
- **URL**: `https://igcvucyhcfyupmzstoqg.supabase.co`
- **Auth**: Email + password (Supabase Auth)
- **Confirmacion email**: Activa. Site URL configurado como `https://angelrodriguez-source.github.io/Proyectos_1/`

## Tablas

### `profiles`
Extiende `auth.users` con datos del juego. Se crea automaticamente via trigger al registrarse.

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | UUID PK | (de auth.users) | FK a auth.users, ON DELETE CASCADE |
| `display_name` | TEXT | 'Jugador' | Nombre visible en el juego |
| `avatar_url` | TEXT | null | No usado aun |
| `puntos_mimes` | INTEGER | 100 | Moneda del juego |
| `created_at` | TIMESTAMPTZ | now() | |

### `mimes`
Cada Mime con su dueno, cuidador, personalidad, color y 6 stats.

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | UUID PK | gen_random_uuid() | |
| `dueno_id` | UUID FK | (obligatorio) | Quien lo creo (profiles.id), CASCADE |
| `cuidador_id` | UUID FK | null | Quien lo cuida ahora (profiles.id), SET NULL |
| `nombre` | TEXT | (obligatorio) | Nombre del Mime |
| `personalidad` | TEXT | (obligatorio) | CHECK: 'aventurero', 'tranquilo', 'picaro' |
| `color_theme` | TEXT | (obligatorio) | CHECK: 'celeste', 'lila', 'melocoton' |
| `hambre` | INTEGER | 70 | 0-100 |
| `higiene` | INTEGER | 70 | 0-100 |
| `diversion` | INTEGER | 70 | 0-100 |
| `carino` | INTEGER | 70 | 0-100 |
| `energia` | INTEGER | 70 | 0-100 |
| `apariencia` | INTEGER | 70 | 0-100 |
| `afinidad` | REAL | 0 | 0-100, vinculo dueno-cuidador |
| `share_code` | TEXT UNIQUE | null | Codigo de 6 chars para compartir (temporal) |
| `last_decay_at` | TIMESTAMPTZ | now() | Ultima vez que se aplico decay |
| `created_at` | TIMESTAMPTZ | now() | |

### `connections`
Conexiones entre usuarios (via QR presencial). No se usa actualmente en la app — el sistema de share_code lo reemplazo.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | UUID PK | |
| `user_a_id` | UUID FK | profiles.id |
| `user_b_id` | UUID FK | profiles.id |
| `connected_at` | TIMESTAMPTZ | |
| UNIQUE | | (user_a_id, user_b_id) |

### `care_actions`
Log de cada accion de cuidado. Historial y auditoria.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | UUID PK | |
| `mime_id` | UUID FK | mimes.id |
| `cuidador_id` | UUID FK | profiles.id |
| `action_type` | TEXT | CHECK: alimentar, limpiar, jugar, carino, descansar, vestir |
| `puntos_cost` | INTEGER | PM gastados |
| `created_at` | TIMESTAMPTZ | |

### `messages`
Mensajes dueno <-> cuidador via Mime. No implementado en la app aun.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | UUID PK | |
| `mime_id` | UUID FK | mimes.id |
| `sender_type` | TEXT | CHECK: 'dueno', 'mime' |
| `content` | TEXT | |
| `read` | BOOLEAN | default false |
| `created_at` | TIMESTAMPTZ | |

## Row Level Security (RLS)

Todas las tablas tienen RLS activado. Sin politicas, nadie puede leer ni escribir.

### profiles
| Politica | Operacion | Condicion |
|----------|-----------|-----------|
| `users_read_any_profile` | SELECT | `true` (todos pueden ver nombres) |
| `users_update_own_profile` | UPDATE | `id = auth.uid()` |
| `users_insert_own_profile` | INSERT | `id = auth.uid()` |

> Nota: `users_read_own_profile` (SELECT solo propio) fue reemplazada por `users_read_any_profile` en migration_v2 para poder mostrar nombres de cuidadores/duenos.

### mimes
| Politica | Operacion | Condicion |
|----------|-----------|-----------|
| `mime_visible_to_participants` | SELECT | `dueno_id = auth.uid() OR cuidador_id = auth.uid()` |
| `cuidador_updates_stats` | UPDATE | `cuidador_id = auth.uid()` |
| `dueno_manages_mime` | UPDATE | `dueno_id = auth.uid()` |
| `dueno_inserts_mime` | INSERT | `dueno_id = auth.uid()` |

### care_actions
| Politica | Operacion | Condicion |
|----------|-----------|-----------|
| `cuidador_logs_actions` | INSERT | `cuidador_id = auth.uid()` |
| `participants_view_actions` | SELECT | cuidador o dueno del mime |

### messages
| Politica | Operacion | Condicion |
|----------|-----------|-----------|
| `participants_view_messages` | SELECT | participante del mime |
| `dueno_sends_messages` | INSERT | `sender_type = 'dueno'` + dueno del mime |

## Funciones RPC (SECURITY DEFINER)

Estas funciones se ejecutan con permisos elevados para operaciones cross-user que RLS no permite directamente.

### `claim_mime(p_code TEXT) -> JSON`
Adoptar un Mime usando un codigo de compartir.

**Archivo**: `supabase/migration_v2_share.sql` (actualizado en v3)

**Logica**:
1. Busca mime por `share_code = p_code`
2. Valida: no es tuyo, no tiene cuidador, no cuidas ya otro mime del mismo dueno
3. Asigna `cuidador_id = auth.uid()`, limpia `share_code`
4. Retorna `{ success: true, mime_name }` o `{ error: "mensaje" }`

**Restriccion clave**: Solo puedes cuidar 1 Mime de cada dueno. Esto fuerza una red social: necesitas 3 personas distintas para que cuiden tus 3 Mimes.

### `generate_share_code(p_mime_id UUID) -> JSON`
Genera un codigo aleatorio de 6 caracteres para compartir un Mime.

**Logica**:
1. Verifica que el mime es tuyo (`dueno_id = auth.uid()`)
2. Verifica que no tiene cuidador
3. Genera codigo: `upper(substr(md5(random()::text), 1, 6))`
4. Guarda en `mimes.share_code`
5. Retorna `{ success: true, code }` o `{ error }`

### `release_mime(p_mime_id UUID) -> JSON`
El cuidador suelta un Mime (deja de cuidarlo).

**Logica**:
1. Actualiza `cuidador_id = NULL` donde `id = p_mime_id AND cuidador_id = auth.uid()`
2. Retorna `{ success: true }` o `{ error }`

## Trigger: Registro automatico

Al registrarse un usuario, el trigger `on_auth_user_created` ejecuta `handle_new_user()`:

1. Crea un registro en `profiles` con el `display_name` del metadata
2. Crea 3 Mimes: Aventurero (celeste), Tranquilo (lila), Picaro (melocoton)

**Archivo**: `supabase/schema.sql` lineas 173-194

**Nota importante**: La funcion usa `SECURITY DEFINER` y necesita `SET search_path = public` para encontrar las tablas. Sin esto, da error "Database Error saving user".

## Orden de Ejecucion de Migraciones

1. `supabase/schema.sql` — Schema base completo
2. `supabase/migration_v2_share.sql` — Anade share_code + RPCs
3. `supabase/migration_v3_one_per_owner.sql` — Actualiza claim_mime con restriccion 1-por-dueno
