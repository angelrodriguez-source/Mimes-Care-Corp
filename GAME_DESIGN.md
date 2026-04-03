# Mimes Care Corp: The Game

## Manifiesto de Diseño del Juego - v0.2

---

## 1. Concepto

**Mimes Care Corp: The Game** es un juego de mascotas virtuales con mecánica social.
Los Mimes son criaturas extraordinarias cuya misión es mantener la felicidad y el vínculo entre personas: parejas, amigos, conocidos, etc.

La diferencia fundamental con otros juegos de mascotas virtuales es que **no cuidas tus propios Mimes**, sino los de otras personas. Y otros cuidan los tuyos.

---

## 2. Los Mimes

### 2.1 Apariencia

- Todos los Mimes comparten una **forma base similar** (silueta reconocible de la marca).
- Se diferencian por:
  - **Color**: paleta de colores variada.
  - **Pelaje**: texturas o patrones ligeramente distintos.
- Los 3 Mimes de cada usuario son visualmente distintos entre sí.

### 2.2 Personalidad

Cada Mime tiene una **personalidad** que afecta tanto a lo visual como al gameplay:

- **Visual**: animaciones, expresiones y reacciones distintas según personalidad.
- **Gameplay**: cada personalidad modifica las necesidades de cuidado. Ejemplos:
  - Un Mime *juguetón* necesita más diversión pero menos descanso.
  - Un Mime *mimoso* necesita más cariño/atención.
  - Un Mime *glotón* necesita más alimentación.
  - Un Mime *presumido* necesita más cuidado de apariencia.

> *Tipos de personalidad exactos: por definir en detalle.*

---

## 3. Mecánica Principal

### 3.1 Registro e inicio

- Al registrarse, cada usuario recibe **3 Mimes** propios.
- Los Mimes se generan con color, pelaje y personalidad variados.
- Comienzan en estado inicial neutro (sin cuidador asignado).

### 3.2 Conexión entre usuarios

- Los usuarios se conectan **escaneando un código QR en persona**.
- Este requisito presencial refuerza el carácter social y personal del juego.
- Una vez conectados, se puede ceder un Mime.

### 3.3 Cesión de Mimes

- El usuario **cede** cada uno de sus Mimes a otro usuario para que lo cuide.
- Solo puede ceder **un Mime por usuario** destino.
- No puede ceder más de 3 (uno por Mime que posee).
- La cesión genera un **enlace/afinidad** entre ambos usuarios.

### 3.4 Cuidado de Mimes ajenos

- El usuario que **recibe** un Mime es responsable de cuidarlo.
- Cuanto mejor cuide el Mime, mayor será la **afinidad** entre ambos usuarios.

### 3.5 Vistas del usuario

Cada usuario tiene dos vistas principales:

| Vista | Descripción |
|-------|-------------|
| **Mis Mimes** | Ver el estado de sus 3 Mimes que están siendo cuidados por otros. Solo lectura. |
| **Mimes a mi cargo** | Cuidar activamente los Mimes que otros le han confiado. Interactiva. |

---

## 4. Acciones de Cuidado

El cuidador puede realizar **6 acciones** sobre los Mimes a su cargo:

| Acción | Descripción | Variable afectada |
|--------|-------------|-------------------|
| **Alimentar** | Darle de comer al Mime | Hambre |
| **Limpiar** | Bañarlo, asearlo | Higiene |
| **Jugar** | Entretenerlo, jugar con él | Diversión |
| **Dar cariño** | Acariciarlo, hablarle, dedicarle tiempo | Cariño |
| **Descansar** | Dejarlo dormir/recuperarse | Energía |
| **Vestir** | Cambiarle la ropa/accesorios | Apariencia |

Cada Mime tiene estas 6 variables como estadísticas. La personalidad del Mime modifica cuánto necesita de cada una y a qué ritmo decaen.

---

## 5. Afinidad

- La **afinidad** es el valor central del juego (0% - 100%).
- Mide la calidad de la relación entre dos usuarios, basada en cómo se cuida el Mime cedido.
- Se calcula a partir del promedio de las 6 variables de cuidado a lo largo del tiempo.

### 5.1 Consecuencias por descuido

| Rango de afinidad | Estado |
|--------------------|--------|
| 75% - 100% | El Mime está feliz, el vínculo es fuerte |
| 50% - 74% | El Mime está bien, pero podría estar mejor |
| 25% - 49% | El Mime está triste, el vínculo se debilita |
| 10% - 24% | El Mime está muy triste, riesgo de abandono |
| **< 10%** | **El Mime abandona al cuidador y vuelve a su dueño (sin cuidador asignado)** |

---

## 6. Capacidad de Recepción (Progresiva)

- Al inicio, un usuario puede recibir y cuidar un número limitado de Mimes ajenos.
- Conforme sube de nivel o logra hitos, se desbloquean más slots para recibir Mimes.

| Nivel / Hito | Mimes que puede recibir |
|---------------|------------------------|
| Inicio | Por definir (ej. 1-2) |
| Intermedio | Por definir (ej. 3-5) |
| Avanzado | Por definir (ej. 6+) |

> *Progresión exacta: por definir.*

---

## 7. Reglas Base

| Regla | Detalle |
|-------|---------|
| Mimes propios por usuario | 3 (fijos al registrarse) |
| Cesión máxima por usuario destino | 1 Mime |
| Mimes que puedes recibir | Progresivo (se desbloquean) |
| Conexión entre usuarios | QR presencial |
| Abandono por descuido | Si afinidad < 10%, el Mime vuelve a su dueño |
| ¿Se puede recuperar un Mime cedido? | Por definir |

---

## 8. Plataforma

- **Tecnología**: HTML5 + JavaScript (Phaser.js)
- **Build**: Vite
- **Multiplataforma**: Web + Móvil (Capacitor para iOS/Android)
- **Backend**: Por definir (necesario para la mecánica social/multijugador)

---

## 9. Preguntas Abiertas

- [ ] ¿Cuáles son los tipos de personalidad exactos?
- [ ] ¿Cómo se calcula exactamente la afinidad? (media ponderada, decaimiento temporal, etc.)
- [ ] ¿Cuántos Mimes puedes recibir en cada nivel?
- [ ] ¿Se puede recuperar/reasignar un Mime cedido voluntariamente?
- [ ] ¿Hay notificaciones push cuando un Mime necesita cuidado?
- [ ] ¿Qué items de ropa/accesorios existen para vestir?
- [ ] ¿Se desbloquean items con monedas, logros, o ambos?
- [ ] ¿Hay algún tipo de moneda o economía interna?
- [ ] ¿Backend: Firebase, Supabase, custom API?
- [ ] ¿Hay chat o mensajes entre usuarios conectados?

---

*Última actualización: 2026-04-03*
