# Mime: Guía de Renderizado

> Cómo se construye y anima visualmente un Mime en el juego.

---

## 1. Concepto Visual

**Forma base**: Mezcla de pingüino bebé con gato bebé.
- Cuerpo rechoncho y redondeado (silueta tipo gota/pera).
- Patitas cortas (2 patas inferiores, 2 bracitos).
- Orejitas pequeñas y redondeadas (de gato).
- Ojos grandes y expresivos.
- Boquita pequeña.
- Cola corta y esponjosa.

**Estilo**: 2D ilustrado, cartoon suave, líneas limpias.

---

## 2. Sistema de Piezas (Body Parts)

El Mime se construye por **capas/piezas** montadas por código. Esto permite variar color, pelaje y accesorios dinámicamente.

### 2.1 Piezas del cuerpo

```
         ┌──────────┐
         │  orejas  │  ← capa 5
         └────┬─────┘
         ┌────┴─────┐
         │  cabeza  │  ← capa 4
         │ ojos     │
         │ boca     │
         └────┬─────┘
         ┌────┴─────┐
         │  cuerpo  │  ← capa 3
         │ (torso)  │
         ├──┬───┬───┤
         │  │   │   │
    brazo_L  │   │  brazo_R  ← capa 2
             │   │
        pata_L   pata_R      ← capa 1
              │
            cola             ← capa 0 (detrás)
```

### 2.2 Lista de piezas

| Pieza | Tipo | Animable | Notas |
|-------|------|----------|-------|
| **cuerpo** | sprite base | Sí (respiración) | Forma principal, se tinta con el color del Mime |
| **cabeza** | sprite | Sí (giro, inclinación) | Unida al cuerpo, proporcional grande |
| **ojo_L / ojo_R** | sprite | Sí (parpadeo, dirección mirada) | Grandes, expresivos. Cambian según humor |
| **pupila_L / pupila_R** | sprite | Sí (seguimiento, emoción) | Dentro de los ojos |
| **boca** | sprite | Sí (expresión) | Intercambiable por estado de ánimo |
| **oreja_L / oreja_R** | sprite | Sí (movimiento sutil) | Forma gato, encima de la cabeza |
| **brazo_L / brazo_R** | sprite | Sí (gestos, agarre) | Cortos, redondeados |
| **pata_L / pata_R** | sprite | Sí (caminar, balanceo) | Cortas, base ancha |
| **cola** | sprite | Sí (movimiento constante) | Esponjosa, detrás del cuerpo |
| **pelaje_overlay** | sprite/shader | No | Capa de textura sobre el cuerpo (liso, rizado, manchas, rayas) |

---

## 3. Sistema de Variación

### 3.1 Color

- Cada Mime tiene un **color base** que se aplica como tinte sobre las piezas del cuerpo.
- Se usa `sprite.setTint(color)` de Phaser para aplicar el color.
- Paleta de colores por definir (suaves, pastel, amigables).

### 3.2 Pelaje

- Una capa de **overlay/textura** encima del cuerpo base.
- Tipos: liso (sin overlay), rizado, manchas, rayas, esponjoso.
- Se renderiza como sprite semitransparente sobre el cuerpo.

### 3.3 Accesorios (Ropa)

- Los accesorios son **sprites adicionales** que se montan encima de las piezas del cuerpo.
- Categorías posibles: gorros, bufandas, gafas, lazos, camisetas, etc.
- Cada accesorio define un punto de anclaje (sobre qué pieza se monta).

---

## 4. Sistema de Animación (Skeletal / Tween)

No se usa frame-a-frame. Las animaciones se logran moviendo, rotando y escalando las piezas individuales con **tweens de Phaser**.

### 4.1 Animaciones base (todos los Mimes)

| Animación | Piezas implicadas | Descripción |
|-----------|-------------------|-------------|
| **idle** | cuerpo, cola | Respiración suave (escala Y sutil), cola balanceándose |
| **parpadeo** | ojos | Los ojos se cierran y abren periódicamente |
| **mirada** | pupilas | Las pupilas siguen un punto o se mueven aleatoriamente |

### 4.2 Animaciones de emoción

| Animación | Trigger | Descripción |
|-----------|---------|-------------|
| **contento** | humor > 60 | Ojos entrecerrados felices, cola rápida, boca sonriente |
| **triste** | humor < 40 | Ojos caídos, orejas agachadas, cola quieta |
| **enfadado** | stat crítica | Ceño fruncido, cuerpo tenso, cola erizada |
| **eufórico** | humor > 80 | Salta, da vueltas, ojos brillantes |
| **dormido** | acción descansar | Ojos cerrados, respiración lenta, zzz |

### 4.3 Animaciones de acción (al cuidar)

| Animación | Acción | Descripción |
|-----------|--------|-------------|
| **comer** | Alimentar | Abre boca, mastica, ojos felices |
| **baño** | Limpiar | Sacude cuerpo, burbujas, agita orejas |
| **jugar** | Jugar | Salta, corre, persigue algo |
| **abrazo** | Cariño | Se acurruca, cierra ojos, ronronea |
| **dormir** | Descansar | Se tumba, cierra ojos, respiración lenta |
| **vestir** | Vestir | Gira para mostrar accesorio, pose |

### 4.4 Modificadores por personalidad

Cada tipo de personalidad modifica la **velocidad, amplitud e intensidad** de las animaciones:

| Personalidad | Velocidad | Amplitud | Estilo |
|-------------|-----------|----------|--------|
| **Aventurero** | Rápida | Grande | Movimientos amplios, saltarín, enérgico |
| **Tranquilo** | Lenta | Suave | Movimientos mínimos, suaves, calmados |
| **Pícaro** | Media-Rápida | Media | Movimientos expresivos, poses, guiños |

---

## 5. Implementación técnica (Phaser.js)

### 5.1 Estructura de clase propuesta

```
MimeRenderer
├── MimeBody          → Contenedor principal (Phaser.GameObjects.Container)
│   ├── cola          → Sprite
│   ├── pata_L/R      → Sprites
│   ├── cuerpo        → Sprite (tintado)
│   ├── pelaje_overlay → Sprite (transparencia)
│   ├── brazo_L/R     → Sprites
│   ├── cabeza        → Container
│   │   ├── oreja_L/R → Sprites
│   │   ├── ojo_L/R   → Containers
│   │   │   ├── blanco → Sprite
│   │   │   └── pupila → Sprite
│   │   └── boca      → Sprite
│   └── accesorios[]  → Sprites dinámicos
├── MimeAnimator      → Gestiona tweens y transiciones
└── MimeExpression    → Gestiona cambios de expresión según humor
```

### 5.2 Ejemplo de tween (respiración idle)

```javascript
// Respiración: escala sutil del cuerpo
this.scene.tweens.add({
  targets: this.cuerpo,
  scaleY: { from: 1.0, to: 1.03 },
  duration: 1200,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut'
});
```

---

## 6. Assets necesarios

Para empezar, se necesitan estos sprites (PNG con transparencia):

| Asset | Descripción | Variantes |
|-------|-------------|-----------|
| `body.png` | Cuerpo base (sin color) en gris/blanco | 1 |
| `head.png` | Cabeza base | 1 |
| `eye.png` | Ojo (blanco del ojo) | 1 |
| `pupil.png` | Pupila | 1 |
| `mouth_happy.png` | Boca feliz | 1 |
| `mouth_sad.png` | Boca triste | 1 |
| `mouth_angry.png` | Boca enfadada | 1 |
| `mouth_neutral.png` | Boca neutra | 1 |
| `ear.png` | Oreja | 1 |
| `arm.png` | Brazo | 1 |
| `leg.png` | Pata | 1 |
| `tail.png` | Cola | 1 |
| `fur_curly.png` | Overlay pelaje rizado | 1 |
| `fur_spots.png` | Overlay pelaje manchas | 1 |
| `fur_stripes.png` | Overlay pelaje rayas | 1 |
| `fur_fluffy.png` | Overlay pelaje esponjoso | 1 |

> Total mínimo: ~16 sprites base. El color se aplica por código. Los accesorios se añaden progresivamente.

---

*Última actualización: 2026-04-03*
