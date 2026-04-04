# Mime: Ficha Base

> Plantilla que define la estructura de cualquier Mime en el juego.
> Cada tipo de personalidad hereda esta base y la modifica.

---

## Esencia

**Todos los Mimes, sin importar su personalidad, comparten una esencia común:**

- Son **mimosos por naturaleza**. El afecto es su lenguaje universal.
- Su razón de existir es **representar la cohesión entre dos personas**. Un Mime no es una mascota para uno; es el puente emocional entre dueño y cuidador.
- Aunque un Aventurero sea inquieto o un Pícaro sea travieso, ambos buscan y dan cariño. La personalidad matiza cómo lo expresan, no si lo sienten.

> Este principio es inalterable y debe reflejarse en todas las animaciones, mensajes y mecánicas: el Mime siempre transmite conexión humana.

---

## Identidad

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **id** | string | Identificador único del Mime |
| **nombre** | string | Nombre que le pone el dueño al crearse |
| **fecha_nacimiento** | date | Fecha en que fue creado (al registrarse el usuario) |
| **edad** | derivado | Se calcula a partir de fecha_nacimiento |

---

## Apariencia

| Campo | Tipo | Valores posibles |
|-------|------|-----------------|
| **color** | string | Tema de color (celeste, lila, melocotón...) |
| **pelo** | string | Estilo de pelo según personalidad (punk, curly, pompadour) |
| **accesorios** | lista | Items de ropa/accesorios equipados (empieza vacía) |

> Todos los Mimes comparten la misma silueta/forma base (mezcla gato bebé + pingüino bebé). Se distinguen por color, pelo y accesorios.

### Forma base compartida
- **Cuerpo**: óvalo vertical redondeado con barriga clara.
- **Cabeza**: integrada en el cuerpo (no separada), parte superior.
- **Orejas**: dos orejas de gato triangulares redondeadas con interior de color.
- **Ojos**: grandes, blancos, con pupilas negras que siguen al cursor/dedo. Parpadean.
- **Boca**: estilo `:3` de gato — nariz triangular rosa + curva "w" debajo. Se abre en ciertos humores mostrando interior oscuro + lengua rosa.
- **Manos**: forma de corazón (`♥`), color del cuerpo. Animación de saludo.
- **Pies**: patitas redondeadas color naranja cálido.
- **Collar**: franja redondeada en la zona del cuello.
- **Pelo**: varía según personalidad (ver fichas individuales). Color propio más oscuro que el cuerpo, con highlights.
- **Mejillas**: rubor rosa sutil, se intensifica al interactuar o en humor eufórico.

### Variables CSS de color
Cada tema de color define estas variables:
- `--body-color` — cuerpo, orejas, párpados, corazones
- `--belly-color` — barriga
- `--collar-color` — collar
- `--feet-color` — patitas
- `--ear-inner` — interior orejas
- `--hair-color` — pelo (tono más oscuro que body)
- `--hair-highlight` — brillos del pelo

---

## Personalidad

| Campo | Tipo | Valores posibles |
|-------|------|-----------------|
| **tipo** | enum | `aventurero`, `tranquilo`, `picaro` |

La personalidad define:
- Animaciones y expresiones visuales únicas.
- Modificadores sobre las stats de cuidado (necesita más o menos de cada una).
- Ritmo de decaimiento de cada stat.
- Tipo de mensajes y forma de "hablar" del Mime.

> Ver fichas individuales por tipo: `MIME_AVENTURERO.md`, `MIME_TRANQUILO.md`, `MIME_PICARO.md`.

---

## Stats de Cuidado

Las 6 variables que el cuidador gestiona. Todas van de **0 a 100** y decaen con el tiempo.

| Stat | Descripción | Decaimiento base |
|------|-------------|-----------------|
| **hambre** | Nivel de alimentación | Medio |
| **higiene** | Nivel de limpieza | Lento |
| **diversion** | Nivel de entretenimiento | Rápido |
| **carino** | Nivel de afecto recibido | Medio |
| **energia** | Nivel de descanso | Lento |
| **apariencia** | Nivel de cuidado estético (ropa, accesorios) | Muy lento |

> El decaimiento base se modifica según la personalidad del Mime.

---

## Nivel de Experiencia

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **nivel** | int | Nivel actual del Mime (empieza en 1) |
| **experiencia** | int | XP acumulada dentro del nivel actual |

> Por definir: qué acciones dan XP, cuánta XP por nivel, qué desbloquea subir de nivel.

---

## Estado Emocional (Humor)

El humor se **deriva automáticamente** del estado de las 6 stats de cuidado. No se modifica directamente.

| Estado | Condición aproximada |
|--------|---------------------|
| **Eufórico** | Todas las stats > 80 |
| **Contento** | Media de stats > 60 |
| **Normal** | Media de stats 40-60 |
| **Triste** | Media de stats 20-40 |
| **Enfadado** | Alguna stat crítica < 15 |
| **Deprimido** | Media de stats < 20 |

> El humor afecta a las animaciones, expresiones y los mensajes que el Mime transmite.

---

## Relaciones

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **dueno_id** | string | El usuario que creó/posee este Mime |
| **cuidador_id** | string / null | El usuario que lo cuida actualmente (null si no está cedido) |
| **afinidad** | float (0-100) | Nivel de afinidad entre dueño y cuidador a través de este Mime |

---

## Mensajería

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **mensajes_dueno** | lista | Mensajes que el dueño ha dejado para que el Mime transmita al cuidador |
| **mensajes_mime** | lista | Mensajes generados por el Mime sobre cómo le va con el cuidador (hacia el dueño) |

---

## Resumen visual de la ficha

```
┌─────────────────────────────────────┐
│  MIME                               │
│  ─────                              │
│  Nombre: ________                   │
│  Edad: __ días                      │
│  Nivel: ___ (XP: ___/___)           │
│  Humor: 😊 Contento                 │
│                                     │
│  Personalidad: [aventurero]         │
│  Color: ______  Pelaje: ______      │
│  Accesorios: [___] [___]            │
│                                     │
│  ┌─── Stats ──────────────────┐     │
│  │ Hambre:    ████████░░  80  │     │
│  │ Higiene:   ██████░░░░  60  │     │
│  │ Diversión: █████░░░░░  50  │     │
│  │ Cariño:    ███████░░░  70  │     │
│  │ Energía:   █████████░  90  │     │
│  │ Apariencia:████░░░░░░  40  │     │
│  └────────────────────────────┘     │
│                                     │
│  Dueño: @usuario_a                  │
│  Cuidador: @usuario_b              │
│  Afinidad: 72%                      │
└─────────────────────────────────────┘
```

---

*Última actualización: 2026-04-03*
