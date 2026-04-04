# Mime Tranquilo

> Hereda de: [MIME_BASE.md](./MIME_BASE.md)

---

## Descripción

El Mime Tranquilo es sereno, calmado y cariñoso. Disfruta de la calma, los mimos y la rutina. No necesita grandes estímulos pero sí constancia y atención emocional. Es el más sensible a los cambios de humor de su cuidador.

---

## Rasgos de Personalidad

- Calmado y afectuoso.
- Le gusta la rutina y la estabilidad.
- Muy sensible al cariño: lo necesita y lo devuelve.
- Come poco pero le gusta estar limpio y cuidado.
- No busca aventuras, prefiere estar cómodo.

---

## Modificadores de Stats

| Stat | Necesidad | Decaimiento | Notas |
|------|-----------|-------------|-------|
| **hambre** | Baja | Lento | Come poco, no gasta mucha energía |
| **higiene** | Alta | Medio | Le gusta estar limpio, se incomoda si no lo está |
| **diversion** | Baja | Lento | Se entretiene solo, no necesita mucho estímulo |
| **carino** | Muy alta | Rápido | Necesita atención emocional constante |
| **energia** | Baja | Muy lento | Descansa bien, no se agota fácilmente |
| **apariencia** | Alta | Medio | Le gusta estar bien vestido y cuidado |

### Resumen

- **Pide mucho**: Cariño, Higiene, Apariencia
- **Pide poco**: Hambre, Diversión, Energía
- **Dificultad de cuidado**: Media-Baja (fácil de mantener si le das cariño)

---

## Comportamiento Visual

- Animaciones suaves: parpadea despacio, se acurruca, ronronea.
- Cuando está contento: cierra los ojos, sonríe, se frota contra la pantalla.
- Cuando está triste: se hace una bolita, tiembla ligeramente.
- Cuando está enfadado: te da la espalda, no te mira.

---

## Apariencia Visual

### Colores (tema Lila)
| Variable | Valor | Uso |
|----------|-------|-----|
| `--body-color` | `#6A1B9A` | Cuerpo, orejas, párpados |
| `--belly-color` | `#F3E5F5` | Barriga |
| `--collar-color` | `#E1BEE7` | Collar |
| `--feet-color` | `#FFB74D` | Patitas |
| `--ear-inner` | `#8E24AA` | Interior orejas |
| `--hair-color` | `#4A148C` | Pelo (más oscuro que el cuerpo) |
| `--hair-highlight` | `#BA68C8` | Brillos del pelo |

### Pelo: Curly / Rulos
- Estilo: **4 bolas redondeadas** que forman un pelo esponjoso y suave.
- Forma: `border-radius: 50%` (círculos perfectos).
- Bola central la más grande (~28px), las laterales un poco más pequeñas (~22-24px).
- Un strand oculto (`display: none`) para mantener la estructura de 5 divs.
- Transmite: calma, suavidad, dulzura.

### Manos
- Forma de corazón (`♥`), color del cuerpo (`--body-color`).
- Animación: saludan suavemente, al hover agitan rápido.

### Expresión por defecto
- Ojos grandes con pupilas que siguen el cursor.
- Boca `:3` de gato (nariz triangular rosa + curva "w").
- Mejillas rosadas sutiles.

---

## Estilo de Mensajería

El Tranquilo habla con dulzura, usa frases cortas y emotivas.

**Ejemplos de mensajes al dueño:**
- "Mi cuidador me ha dado muchos mimos hoy. Estoy calentito."
- "Te echo de menos... pero aquí me cuidan bien."
- "Hoy me han puesto un lacito. ¡Me veo guapísimo!"

**Cuando está triste:**
- "Nadie me hace caso..."
- "Me siento solo. Ojalá estuvieras aquí."

---

*Última actualización: 2026-04-03*
