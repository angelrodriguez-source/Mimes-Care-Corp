# 02 - Base de Datos (Supabase / PostgreSQL)

## Conexion

- **Proyecto Supabase**: `igcvucyhcfyupmzstoqg`
- **URL**: `https://igcvucyhcfyupmzstoqg.supabase.co`
- **Auth**: Email + password (Supabase Auth)
- **Confirmacion email**: Activa. Site URL configurado como `https://angelrodriguez-source.github.io/Mimes-Care-Corp/` (actualizar en Supabase Dashboard > Authentication > URL Configuration).

## Tablas

### `profiles`
Extiende `auth.users` con datos del juego. Se crea automaticamente via trigger al registrarse.

| Columna | Tipo | Default | Descripcion |
|---------|------|---------|-------------|
| `id` | UUID PK | (de auth.users) | FK a auth.users, ON DELETE CASCADE |
| `display_name` | TEXT | 'Jugador' | Nombre visible en el juego |
| `avatar_url` | TEXT | null | No usado aun |
| `puntos_mimes` | INTEGER | 100 | Moneda del juego |
| `last_daily_claim_date` | DATE | null | Fecha local del ultimo reclamo de recompensa diaria (v5) |
| `daily_streak` | INTEGER | 0 | Dias consecutivos de reclamo de recompensa diaria (v5) |
| `tutorial_completed` | BOOLEAN | false | Si el usuario ya completo el tutorial interactivo (v6) |
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
| `cesion_start` | TIMESTAMPTZ | null | Inicio de la cesion (cuando un cuidador adopta). null = sin cesion activa |
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

**Archivo**: `supabase/migration_v2_share.sql` (actualizado en v3 y v4)

**Logica**:
1. Busca mime por `share_code = p_code`
2. Valida: no es tuyo, no tiene cuidador, no cuidas ya otro mime del mismo dueno
3. Asigna `cuidador_id = auth.uid()`, `cesion_start = NOW()`, limpia `share_code`
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
1. Actualiza `cuidador_id = NULL`, `cesion_start = NULL` donde `id = p_mime_id AND cuidador_id = auth.uid()`
2. Retorna `{ success: true }` o `{ error }`

### `claim_daily_reward(p_client_date DATE) -> JSON`
Reclama la recompensa diaria por login. Atomico e idempotente (doble click no paga dos veces).

**Archivo**: `supabase/migration_v5_daily_reward.sql`

**Logica**:
1. `FOR UPDATE` lockea la fila del profile para evitar races
2. Si `last_daily_claim_date = p_client_date` -> devuelve `{ already_claimed: true, reward: 0 }` sin modificar puntos
3. Si el ultimo reclamo fue ayer (`p_client_date - INTERVAL '1 day'`) -> `daily_streak += 1` (cap a 7)
4. Si hubo un hueco (> 1 dia) o nunca reclamo -> `daily_streak = 1`
5. Si la fecha del cliente es anterior al ultimo reclamo -> devuelve `{ error: 'Fecha invalida' }` (reloj del cliente hacia atras)
6. Calcula `reward` segun racha (array `[10, 15, 20, 25, 35, 50, 75]`, dia 7+ = 75 PM cap)
7. Suma `puntos_mimes += reward` en SQL (no reutiliza `updateUserPoints` porque ese escribe valor absoluto y tendria race con otras operaciones)
8. Retorna `{ already_claimed: false, streak, reward, puntos_mimes }`

**Por que el cliente envia la fecha**: Postgres en Supabase esta en UTC. Para que "hoy" se calcule en la zona horaria del usuario, el frontend envia `new Date().toLocaleDateString('sv-SE')` (YYYY-MM-DD en TZ local).

### `mark_tutorial_completed() -> VOID`
Marca el tutorial interactivo como completado para el usuario autenticado.

**Archivo**: `supabase/migration_v6_tutorial.sql`

**Logica**:
1. Lee `auth.uid()` (error si no hay sesion)
2. `UPDATE profiles SET tutorial_completed = TRUE WHERE id = auth.uid()`

Es idempotente (llamarlo N veces deja el campo en `true`) y se ejecuta con `SECURITY DEFINER` por consistencia con el resto de RPCs.

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
4. `supabase/migration_v4_cesion.sql` — Anade cesion_start + actualiza claim_mime (pone cesion_start) y release_mime (limpia cesion_start)
5. `supabase/migration_v5_daily_reward.sql` — Anade `last_daily_claim_date` + `daily_streak` a profiles y el RPC `claim_daily_reward`
6. `supabase/migration_v6_tutorial.sql` — Anade `tutorial_completed` a profiles y el RPC `mark_tutorial_completed`
