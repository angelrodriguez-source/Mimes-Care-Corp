# Mimes Care Corp: The Game

## Manifiesto de Diseño del Juego - v0.1

---

## 1. Concepto

**Mimes Care Corp: The Game** es un juego de mascotas virtuales con mecánica social.
Los Mimes son criaturas extraordinarias cuya misión es mantener la felicidad y el vínculo entre personas: parejas, amigos, conocidos, etc.

La diferencia fundamental con otros juegos de mascotas virtuales es que **no cuidas tus propios Mimes**, sino los de otras personas. Y otros cuidan los tuyos.

---

## 2. Mecánica Principal

### 2.1 Registro e inicio

- Al registrarse, cada usuario recibe **3 Mimes** propios.
- Los Mimes comienzan en un estado inicial neutro (sin cuidador asignado).

### 2.2 Cesión de Mimes

- El usuario **cede** cada uno de sus Mimes a otro usuario para que lo cuide.
- Solo puede ceder **un Mime por usuario** destino.
- No puede ceder más de 3 (uno por Mime que posee).
- La cesión genera un **enlace/afinidad** entre ambos usuarios.

### 2.3 Cuidado de Mimes ajenos

- El usuario que **recibe** un Mime es responsable de cuidarlo.
- Cuanto mejor cuide el Mime, mayor será la **afinidad** entre ambos usuarios.
- Las acciones de cuidado aún están por definir (ver sección 3).

### 2.4 Vistas del usuario

Cada usuario tiene dos vistas principales:

| Vista | Descripción |
|-------|-------------|
| **Mis Mimes** | Ver el estado de sus 3 Mimes que están siendo cuidados por otros usuarios. Vista de solo lectura. |
| **Mimes a mi cargo** | Cuidar activamente los Mimes que otros usuarios le han confiado. Vista interactiva. |

---

## 3. Variables de Cuidado (por definir)

> *Pendiente de detalle. Posibles variables a considerar:*
>
> - Alimentación
> - Higiene
> - Entretenimiento / Diversión
> - Descanso
> - Cariño / Atención
>
> *Estas variables afectarán directamente al nivel de afinidad.*

---

## 4. Afinidad

- La **afinidad** es el valor que mide la calidad de la relación entre dos usuarios, basada en cómo se cuidan mutuamente los Mimes.
- Es el indicador central del juego.
- *Mecanismo exacto de cálculo: por definir.*

---

## 5. Reglas Base

| Regla | Detalle |
|-------|---------|
| Mimes por usuario | 3 (fijos al registrarse) |
| Cesión máxima por usuario destino | 1 Mime |
| Máximo de Mimes que puedes recibir | Por definir |
| ¿Se puede recuperar un Mime cedido? | Por definir |
| ¿Puede un Mime morir o perderse? | Por definir |

---

## 6. Plataforma

- **Tecnología**: HTML5 + JavaScript (Phaser.js)
- **Build**: Vite
- **Multiplataforma**: Web + Móvil (Capacitor para iOS/Android)
- **Backend**: Por definir (necesario para la mecánica social/multijugador)

---

## 7. Preguntas Abiertas

- [ ] ¿Cuáles son las variables exactas de cuidado?
- [ ] ¿Cómo se calcula la afinidad?
- [ ] ¿Hay límite de Mimes que puedes recibir de otros?
- [ ] ¿Se pueden recuperar/reasignar Mimes cedidos?
- [ ] ¿Qué pasa si un Mime no se cuida? ¿Consecuencias?
- [ ] ¿Los Mimes tienen tipos, apariencia, personalidad?
- [ ] ¿Hay notificaciones cuando tu Mime necesita cuidado?
- [ ] ¿Cómo se invita a otro usuario? (link, código, QR...)
- [ ] ¿Backend: Firebase, Supabase, custom API?

---

*Última actualización: 2026-04-03*
