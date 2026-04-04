# Mime Aventurero

> Hereda de: [MIME_BASE.md](./MIME_BASE.md)

---

## Descripción

El Mime Aventurero es inquieto, curioso y siempre quiere explorar. No para quieto, se mete en líos y necesita mucha actividad. Es el más expresivo y el que más reacciona a estímulos nuevos.

---

## Rasgos de Personalidad

- Inquieto y curioso por naturaleza.
- Se aburre rápido si no tiene estímulos.
- Le encanta jugar y descubrir cosas nuevas.
- Come rápido y con ganas (gasta mucha energía).
- No le importa mucho estar limpio o bien vestido.

---

## Modificadores de Stats

| Stat | Necesidad | Decaimiento | Notas |
|------|-----------|-------------|-------|
| **hambre** | Alta | Rápido | Gasta mucha energía, come más |
| **higiene** | Baja | Medio | Se ensucia pero no le importa |
| **diversion** | Muy alta | Muy rápido | Se aburre enseguida, necesita actividad constante |
| **carino** | Media | Medio | Le gusta el afecto pero no lo busca activamente |
| **energia** | Alta | Rápido | Se cansa de tanto moverse |
| **apariencia** | Baja | Lento | Le da igual la ropa, la pierde o la rompe |

### Resumen

- **Pide mucho**: Diversión, Hambre, Energía
- **Pide poco**: Higiene, Apariencia
- **Dificultad de cuidado**: Media-Alta (hay que estar pendiente, decae rápido)

---

## Comportamiento Visual

- Animaciones activas: salta, corre, mira a todos lados.
- Cuando está contento: da volteretas, explora el escenario.
- Cuando está triste: se sienta cabizbajo, mira hacia la puerta.
- Cuando está enfadado: patalea, da golpes al suelo.

---

## Apariencia Visual

### Colores (tema Celeste)
| Variable | Valor | Uso |
|----------|-------|-----|
| `--body-color` | `#1565C0` | Cuerpo, orejas, párpados |
| `--belly-color` | `#E3F2FD` | Barriga |
| `--collar-color` | `#BBDEFB` | Collar |
| `--feet-color` | `#FFB74D` | Patitas |
| `--ear-inner` | `#1E88E5` | Interior orejas |
| `--hair-color` | `#0D47A1` | Pelo (más oscuro que el cuerpo) |
| `--hair-highlight` | `#42A5F5` | Brillos del pelo |

### Pelo: Punk / Mohawk
- Estilo: **5 mechones puntiagudos** hacia arriba, desordenados.
- Forma: `border-radius: 40% 40% 10% 10%` (puntas redondeadas arriba, rectas abajo).
- El mechón central es el más alto (~42px), los laterales más cortos y rotados hacia fuera.
- Base ovalada (~38px) que une los mechones entre las orejas.
- Transmite: rebeldía, energía, desorden.

### Manos
- Forma de corazón (`♥`), color del cuerpo (`--body-color`).
- Animación: saludan suavemente, al hover agitan rápido.

### Expresión por defecto
- Ojos grandes con pupilas que siguen el cursor.
- Boca `:3` de gato (nariz triangular rosa + curva "w").
- Mejillas rosadas sutiles.

---

## Estilo de Mensajería

El Aventurero habla con entusiasmo, usa exclamaciones, cuenta "aventuras" exageradas.

**Ejemplos de mensajes al dueño:**
- "¡Hoy mi cuidador me ha llevado de aventura! Bueno, me ha dado de jugar, ¡pero yo me lo imagino como una aventura!"
- "Echo de menos explorar contigo..."
- "¡Mi cuidador es genial! Me deja hacer de todo."

**Cuando está triste:**
- "Aquí no pasa nada... me aburro mucho."
- "Nadie juega conmigo..."

---

*Última actualización: 2026-04-03*
