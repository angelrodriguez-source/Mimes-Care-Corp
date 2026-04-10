# Mimes Care Corp — Ideas para más adelante

> Apuntar aquí ideas que surjan durante el desarrollo. No tienen prioridad ni compromiso — es un buzón de inspiración.

---

## Habitación / Escenario

- Objetos interactivos en la habitación (cama, plato de comida, juguete, espejo...)
- Que el Mime se mueva de lado a lado dentro de la habitación
- Diferentes habitaciones según nivel o personalidad
- Decoración personalizable (muebles, fondo, iluminación)
- Día/noche según hora real del usuario

## Mimes

- Animaciones idle distintas por personalidad (el Aventurero salta, el Tranquilo bosteza, el Pícaro guiña)
- Que el Mime reaccione visualmente a cada acción (ej. corazones al dar cariño, burbujas al limpiar)
- Cuando está dormido que salgan Zetas flotando (zzZ animadas subiendo)
- Al dar "Descansar" el Mime se duerme un rato (cierra ojos, se queda quieto, salen zetas)
- Que el Mime se mueva por la habitación (caminar de lado a lado, ir a los objetos)
- Que el Mime dé besos (animación de beso al interactuar o al dar cariño)
- Accesorios/ropa para vestir al Mime
- Nivel de experiencia visible en el Mime
- Sonidos/efectos al interactuar
- Poder dar nombre personalizado a los Mimes

## Personalización

- Permitir al dueño ponerle nombre personalizado a cada Mime (actualmente se asigna automáticamente)
- El nombre aparecería en el dashboard, en CareScreen y cuando el cuidador lo adopta

## Social

- Chat entre usuarios a través del Mime (el Mime como mensajero)
- Notificaciones push cuando el Mime necesita cuidado
- Vista de conexiones: ver con qué usuarios estás o has estado conectado (historial de cuidadores/dueños)
- Puntos de afinidad por usuario: la suma de afinidades de todos los Mimes tuyos que ese usuario ha cuidado (cesiones terminadas). Refleja la calidad del vínculo acumulado entre dos personas
- Rotación obligatoria: al terminar la semana de cesión, no puedes dar el mismo Mime a la misma persona dos veces seguidas. Para volver a ceder un Mime a un usuario, ese usuario tiene que haber cuidado tus 3 Mimes (fuerza variedad y compromiso)
- Ranking de mejores cuidadores
- Eventos especiales (Navidad, cumpleaños del Mime, etc.)
- Poder visitar la habitación del Mime que cuidas

## Economía

- Acciones especiales/premium que suben más la afinidad
- Tienda de accesorios con Puntos Mimes
- Recompensas diarias por login
- Minijuegos para ganar puntos extra

## Sistema de cesión y crecimiento

- Los Mimes se ceden por **7 días** (una semana)
- Al término de la cesión, el cuidador recibe **100 × afinidad conseguida** en Puntos Mimes
  - Esta es la forma principal de ganar PM para seguir cuidando Mimes
- Durante la semana el Mime **crece visualmente**:
  - Día 1: 40% de tamaño
  - Día 2: 50%
  - Día 3: 60%
  - Día 4: 70%
  - Día 5: 80%
  - Día 6–7: 100%
- **Decay por hora**: cada hora que pasa, los stats van bajando progresivamente

## Mini-juegos por personalidad

- Cada Mime tiene mini-juegos distintos según su personalidad
- El Aventurero podría tener juegos más dinámicos y de acción
- El Tranquilo podría tener juegos más pausados y de precisión
- El Pícaro podría tener juegos más tramposos o con mecánicas sorpresa
- Esto da variedad al gameplay y refuerza la identidad de cada personalidad

## Algoritmo de afinidad

- Crear un algoritmo más elaborado para calcular la afinidad del Mime cuidado
- Actualmente es una media ponderada simple (90% afinidad actual + 10% media stats)
- Podría tener en cuenta: frecuencia de cuidado, constancia (cuidar todos los días vs rachas), variedad de acciones (no solo alimentar), tiempo de respuesta cuando los stats bajan
- La afinidad debería reflejar la calidad real del cuidado, no solo la cantidad

## Técnico

- Modo offline con sincronización posterior
- Animaciones con Lottie o GSAP para transiciones más fluidas
- Vibración del móvil al interactuar (Haptic feedback via Capacitor)
- Tutorial interactivo para nuevos usuarios

## LLM local para personalidad de los Mimes

- Incluir un modelo de lenguaje pequeño (on-device) que se descarga con la app
- Cada Mime tendría conversaciones con personalidad propia según su tipo (Aventurero, Tranquilo, Pícaro)
- El contexto a mantener es muy acotado: **1 semana × 3 Mimes por usuario** = solo los cuidados activos
- Los datos de conversación/interacciones se guardan en la misma ventana de cesión (7 días)
- Al devolver el Mime, el contexto de esa semana se descarta o se resume en un "recuerdo"
- Ventaja: no depender de API externa, funciona offline, coste cero por inferencia
- Opciones: modelos ligeros tipo Gemma, Phi, o similar cuantizados para móvil

---

## Baja prioridad / Ideas muy a futuro

### Familia y relaciones entre Mimes
*Idea ambiciosa, requiere mucho diseño de balance y nuevas tablas. Aparcada.*

- Los Mimes pueden **encontrar pareja** con Mimes de otros usuarios
- Si dos Mimes con alta afinidad coinciden (ej. ambos cuidados por el mismo usuario, o cuidador cruzado), pueden emparejarse
- Las parejas pueden **tener hijos**: un nuevo Mime que hereda rasgos de ambos padres
  - Personalidad: puede heredar la de uno de los padres o una mezcla
  - Color theme: combinacion o aleatorio entre los dos
  - Stats iniciales: ligeramente influenciados por los padres
- **Lazos familiares** visibles: arbol genealogico simple en el perfil del Mime
  - Padres, hermanos, hijos
  - Bonus de afinidad si un cuidador cuida a Mimes de la misma familia
- Condiciones para reproduccion:
  - Ambos Mimes deben tener afinidad alta (ej. >80%)
  - Ambos deben estar en buen estado (stats promedio >60%)
  - Cooldown entre nacimientos (ej. 1 hijo por mes)
- Los hijos empiezan como bebes (escala 30%) y crecen mas lento que en cesion normal
- Posibilidad de que los hijos tengan personalidades nuevas o raras (mutaciones)

---

*Última actualización: 2026-04-10*

