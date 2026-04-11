# 06 - Mecanicas del Juego

## Concepto Core

**No cuidas tus propios Mimes.** Cuidas los de otros, y otros cuidan los tuyos. Esto crea interdependencia social real.

Cada usuario tiene 3 Mimes. Necesita encontrar 3 cuidadores (1 por Mime). Un cuidador solo puede cuidar 1 Mime de cada dueno, forzando una red amplia.

## Los 6 Stats

Cada Mime tiene 6 estadisticas de 0 a 100. Empiezan en 70.

| Stat | Accion que lo sube | Efecto principal | Efecto secundario |
|------|-------------------|-----------------|-------------------|
| Hambre | Alimentar | +25 | energia +3, carino +3 |
| Higiene | Limpiar | +20 | apariencia +2, carino +2 |
| Diversion | Jugar | +22 | energia +4, carino +4 |
| Carino | Carino | +20 | diversion +5, energia +5 |
| Energia | Descansar | +30 | higiene +2, carino +2 |
| Apariencia | Vestir | +18 | apariencia +1, carino +1 |

**Archivo**: `src/models/MimeModel.ts` — constantes `ACTION_EFFECTS`, `ACTION_PRIMARY_STAT`, `ACTION_SECONDARY_STATS`

## Personalidades y Decay

Los stats decaen con el tiempo. Ritmo base: **2 puntos por hora** por stat. La personalidad modifica este ritmo con multiplicadores:

### Aventurero
"Necesita mucha accion. Se aburre rapido."
| Stat | Multiplicador | Significado |
|------|--------------|-------------|
| Hambre | 1.3 | Decae rapido (come mucho) |
| Higiene | 0.7 | Decae lento (no le importa) |
| Diversion | **1.4** | Decae MUY rapido (el mas alto) |
| Carino | 1.0 | Normal |
| Energia | 1.3 | Decae rapido (hiperactive) |
| Apariencia | 0.6 | Decae muy lento |

### Tranquilo
"Necesita afecto y rutina. Facil de mantener."
| Stat | Multiplicador | Significado |
|------|--------------|-------------|
| Hambre | 0.7 | Decae lento |
| Higiene | 1.3 | Decae rapido (limpio) |
| Diversion | 0.7 | Decae lento |
| Carino | **1.4** | Decae MUY rapido (necesita mucho amor) |
| Energia | 0.7 | Decae lento |
| Apariencia | 1.3 | Decae rapido (presumido) |

### Picaro
"Vanidoso y jugueton. El mas dificil de cuidar."
| Stat | Multiplicador | Significado |
|------|--------------|-------------|
| Hambre | 0.8 | Decae lento |
| Higiene | 1.0 | Normal |
| Diversion | 1.3 | Decae rapido |
| Carino | 1.2 | Decae rapido |
| Energia | 0.8 | Decae lento |
| Apariencia | **1.5** | Decae MUY rapido (el mas presumido) |

**Implementacion**: El decay se aplica de forma **lazy** — al cargar un Mime (Dashboard o CareScreen), se calcula cuantas horas han pasado desde `last_decay_at`, se aplica `applyDecay()` y se persiste el resultado en Supabase. No hay cron job; el calculo ocurre on-demand.

## Mood (Estado de Animo)

Se calcula automaticamente a partir de los stats. Funcion: `deriveMood(stats)`.

**Reglas especiales** (prioridad):
- Energia < 20 -> `dormido` (esta agotado)
- Hambre < 20 -> `hambriento` (no piensa en otra cosa)

**Si no aplica ninguna especial**, se usa la media de los 6 stats:

| Media >= | Mood | Visual |
|----------|------|--------|
| 80 | euforico | Boca super abierta, animacion rapida, blush maximo |
| 55 | feliz | Boca ancha, lengua, animacion suave |
| 30 | '' (normal) | Boca :3 estandar |
| 0 | triste | Boca invertida (frown), blush minimo |

## Economia: Puntos Mimes (PM)

### Coste por accion
| Accion | Coste PM |
|--------|----------|
| Carino | 3 |
| Descansar | 3 |
| Limpiar | 4 |
| Alimentar | 5 |
| Jugar | 6 |
| Vestir | 8 |

**Archivo**: `src/models/MimeModel.ts` — `ACTION_COSTS`

### Como se gastan
- Cada accion de cuidado cuesta PM
- **Los PM se cobran al iniciar el mini-juego**, ganes o pierdas
- Si ganas: los stats mejoran + los PM ya se gastaron
- Si pierdes: solo pierdes los PM (sin mejora de stats)

### Como se ganan
- Valor inicial al registrarse: **100 PM**
- **Recompensa por cesion**: Al terminar una cesion de 7 dias, el cuidador recibe **afinidad × 100 PM** (ej: afinidad 75% = 75 PM)
- **Recompensa diaria por login** (v5): Al abrir el dashboard por primera vez cada dia, modal con PM segun racha consecutiva (ver seccion abajo)
- **Fuente secundaria** (pendiente): Tareas minimas (anuncios, etc.) — pocos PM
- **El ciclo virtuoso**: Cuidas bien los de otros -> ganas PM al terminar cesion -> tienes PM para cuidar otros

### Recompensa diaria por login

Loop de retencion corto que complementa al loop semanal de cesiones.

**Tabla de recompensas** (dia N consecutivo -> PM):

| Dia | 1 | 2 | 3 | 4 | 5 | 6 | 7+ |
|-----|---|---|---|---|---|---|----|
| PM  | 10 | 15 | 20 | 25 | 35 | 50 | 75 |

**Mecanica**:
- Al abrir el dashboard, `computeNextDailyReward()` compara `profile.last_daily_claim_date` con la fecha local (TZ del navegador, via `toLocaleDateString('sv-SE')`)
- Si no ha reclamado hoy, se abre el modal `DailyRewardModal` en fase `offer` mostrando la racha que se obtendria
- Si el ultimo reclamo fue ayer, la racha suma 1 (cap a 7). Si hubo un hueco, se reinicia a 1
- Al reclamar, el RPC `claim_daily_reward(p_client_date)` es atomico e idempotente (`FOR UPDATE` + comparacion de fecha) — doble click no paga dos veces
- Tras el reclamo, `userStore.fetchProfile()` refresca el badge de PM del header automaticamente
- Dia 7+ tiene cap: la racha sigue subiendo en DB pero la recompensa se queda en 75 PM

**Archivos clave**:
- Backend: `supabase/migration_v5_daily_reward.sql`
- Servicio: `claimDailyReward()` en `mimeService.ts`
- Constante: `DAILY_REWARDS` en `gameConstants.ts`
- Componente: `DailyRewardModal.vue`
- Integracion: `DashboardView.vue` (`onMounted` + `handleClaimDaily`)

## Afinidad

La afinidad (0-100%) mide la calidad del vinculo entre dueno y cuidador.

### Calculo
```
nueva_afinidad = afinidad_actual * 0.9 + promedio_stats * 0.1
```
Sube lentamente. Si stats = 80 y afinidad = 50: nueva = 50*0.9 + 80*0.1 = 53. Cambia poco a poco, no de golpe.

**Archivo**: `src/models/MimeModel.ts` — `updateAffinity(current, stats, weight=0.1)`

### Consecuencias
| Rango | Estado |
|-------|--------|
| 75-100% | Mime feliz, vinculo fuerte |
| 50-74% | Bien pero podria mejorar |
| 25-49% | Triste, vinculo debilitandose |
| 10-24% | Muy triste, riesgo de abandono |
| **< 10%** | **Mime abandona al cuidador y vuelve a su dueno** |

**Implementacion**: `checkAbandon()` en mimeService se ejecuta al cargar el Dashboard. Si afinidad < 10% y hay cuidador, limpia `cuidador_id`, `share_code` y resetea afinidad a 0.

## Flujo Social Completo

```
1. Angel se registra -> recibe 3 Mimes (aventurero, tranquilo, picaro) + 100 PM
2. Laura se registra -> recibe 3 Mimes + 100 PM
3. Angel comparte su Mime "Aventurero":
   a. Dashboard -> Compartir -> genera codigo "A3F2B1"
   b. Angel le dice el codigo a Laura
4. Laura adopta:
   a. Dashboard -> Adoptar -> introduce "A3F2B1"
   b. claim_mime() valida: no es suyo, no tiene cuidador, no cuida ya otro de Angel
   c. Laura ahora es cuidadora del Aventurero de Angel
5. Laura cuida el Mime:
   a. Dashboard -> "Mimes a mi cargo" -> "Cuidar"
   b. CareScreen -> acciones (alimentar, jugar, etc.)
   c. Cada accion: gasta PM, juega mini-juego, si gana mejora stats
6. Angel ve su Mime cuidado:
   a. Dashboard -> "Mis Mimes" -> ve stats actualizados, nombre del cuidador
```

## Sistema de Cesion (7 dias)

Mecanica central: los Mimes se ceden por **7 dias**. Al terminar, el cuidador recibe PM proporcionales a la afinidad conseguida.

### Flujo
1. Dueno comparte Mime con codigo -> cuidador lo adopta con `claim_mime`
2. `cesion_start = NOW()` se guarda en la DB
3. Durante 7 dias el cuidador cuida el Mime
4. Al cargar el Dashboard, `checkCesionExpiry()` comprueba si pasaron 7 dias
5. Si expirado: Mime vuelve al dueno + cuidador recibe `afinidad/100 * PM_PER_AFFINITY` PM

### Recompensa
- Formula: `Math.round((afinidad / 100) * 100)` PM
- Ejemplo: afinidad 75% = 75 PM, afinidad 30% = 30 PM
- Constantes: `CESION_DURATION_DAYS = 7`, `PM_PER_AFFINITY = 100`

### Crecimiento visual
El Mime crece durante la cesion:
- Dia 1: 40% de tamano
- Dia 2: 50%
- Dia 3: 60%
- Dia 4: 70%
- Dia 5: 80%
- Dia 6-7: 100%
- Formula: `scale = min(1.0, 0.3 + dia * 0.1)`

**Implementacion**: `getCesionDay()` en mimeService calcula el dia, CareScreen usa el resultado para `mimeScale`. Botones debug +/- en cabecera para preview.

### UI
- MimeCard muestra dias restantes con icono de reloj
- Dashboard notifica al cuidador cuando su cesion termina y cuantos PM gano

## Habitaciones Tematicas

Cada personalidad tiene su propia habitacion con colores y objetos distintos.

### Configuracion
Definida en `ROOM_THEMES` en `gameConstants.ts`. Cada tema incluye:
- Gradiente de pared (3 colores)
- Gradiente de suelo (3 colores) + borde
- Array de objetos con posicion (x%, y%), tamano, emoji y accion opcional

### Temas
| Personalidad | Pared | Objetos suelo | Objetos pared |
|-------------|-------|---------------|---------------|
| Aventurero | Verde | Comida, Pelota, Mochila, Cama (grande) | Mapa |
| Tranquilo | Lila | Te, Libros, Planta, Sofa (grande) | Cuadro |
| Picaro | Naranja | Pizza, Dados, Cofre, Cama (grande) | Espejo (con accion vestir) |

### Ciclo dia/noche
Composable `useDayNight` detecta la hora real del usuario:
- Amanecer (6-10h): tinte naranja suave
- Dia (10-18h): sin overlay
- Atardecer (18-21h): tinte rojizo
- Noche (21-6h): overlay azul oscuro + estrellas

### Objetos interactivos
Los objetos con `action` disparan la accion de cuidado al tocarlos (plato -> alimentar, pelota -> jugar, cama -> descansar, espejo -> vestir).

## Renombrar Mimes

El dueno puede renombrar sus Mimes desde el dashboard.

- Boton de lapiz junto al nombre en MimeCard (solo mode=own)
- Modal con input (max 20 chars) + Guardar/Cancelar
- `renameMime()` en mimeService actualiza el campo `nombre` en Supabase

## Reset de Pruebas

Hay dos botones de reset (TEMPORALES, borrar antes de produccion):

1. **DashboardView**: "Reset (pruebas)" -> resetea TODOS tus mimes (stats a 70, afinidad a 0, quita cuidadores) + PM a 100
2. **CareScreen**: "Reset" en cabecera -> resetea ESE mime (stats a 70, afinidad a 0) + PM a 100
