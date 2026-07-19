# Propuestas para hacer viral Mimes Care Corp

Investigacion y propuestas (2026-07-19). Referencia principal: Finch, una app
de mascota virtual + autocuidado que factura $30M/año SIN inversores, gracias
a mecanicas de retencion muy concretas que podemos adaptar. Tambien: requisitos
reales de Google AdSense H5 Games Ads para el video con recompensa, y opciones
tecnicas de voz y LLM viables en nuestro stack (GitHub Pages + Supabase gratis).

Leyenda de esfuerzo: 🟢 bajo (una sesion) · 🟡 medio (1-2 sesiones) · 🔴 alto (varias)

---

## Las 5 ideas propuestas por Angel, evaluadas

### 1. 🔊 Voz/sonido de los Mimes — 🟢🟡 · 0€ · MUY recomendada
**Como**: no usar texto-a-voz robotico, sino **balbuceo tipo Animal Crossing
("Animalese")**: sonidos silabicos agudos sintetizados con Web Audio (ya tenemos
useSfx como base; existe la referencia open source animalese.js). Cada
personalidad con su tono: aventurero agudo y rapido, tranquilo grave y lento,
picaro juguetón. El Mime "habla" cuando: le tocas, dice un mensaje del dueno
(la burbuja se lee con balbuceo), gana un mini-juego.
**Por que funciona**: le da vida inmediata sin coste de servidor, es adorable
y es EL sonido que la gente graba en videos para TikTok/WhatsApp.

### 2. 🧠 Un LLM por Mime ("esta vivo") — 🔴 · ~2-5$/mes · el killer feature
**Como**: boton "Hablar con tu Mime" → chat corto. Tecnica:
- **Supabase Edge Function** (free tier: 500K invocaciones/mes) que llama a
  **Claude Haiku** con la API key guardada como secret del servidor (NUNCA en
  el frontend).
- System prompt por personalidad + contexto real: sus stats, mood, afinidad,
  quien lo cuida, mensajes recientes → el Mime "sabe" que tiene hambre o que
  ayer jugaste con el.
- **Limite duro por usuario** (ej. 10 mensajes/dia, contador en profiles via
  RPC) para que el coste sea ridiculo: un chat de 10 turnos ≈ $0,01-0,02.
  Con 100 jugadores activos: ~2-5$/mes.
**Por que funciona**: nadie espera que una mascota web te conteste con su
personalidad Y sabiendo su estado real. Es EL diferenciador contra todos los
tamagotchis. La gente compartira capturas de lo que le dice su Mime.

### 3. 🌟 Mime especial desbloqueable — 🟡 · 0€ · retencion pura
**Como**: columna `cesiones_completadas` en profiles (la incrementa
`expire_cesion`). Al llegar a 3 cesiones completadas → se desbloquea el 4º
Mime: personalidad nueva **"legendario"** (tema dorado, habitacion especial,
decae mas rapido = mas dificil). Pantalla de desbloqueo espectacular +
tarjeta compartible.
**Por que funciona**: da un objetivo a medio plazo al loop de cesiones (hoy,
tras tu primera cesion, no hay "siguiente meta"). Coleccionismo = Pokemon.

### 4. 📜 Historico de mensajes — 🟢 · 0€ · hazlo ya
**Como**: la tabla `messages` ya guarda todo; solo falta UI. Drawer
"Conversacion" en CareScreen y en la tarjeta del dueno: lista cronologica de
mensajes con fecha y leido/no leido. (Y prepara el terreno para responder:
cuidador → dueno "como cuidador", una policy nueva.)

### 5. 📺 Video con recompensa (+5 PM, max 3/dia) — mecanica 🟢 ya, ads reales 🔴 despues
**Realidad investigada**: Google **AdSense H5 Games Ads** (el formato rewarded
para juegos web via Ad Placement API) exige: cuenta AdSense aprobada, proceso
de **allowlisting** con revision de cuenta Y de dominio que aloje juegos
reales. En `github.io` (dominio de GitHub, no tuyo) es practicamente seguro
que no lo aprueben → **prerequisito: dominio propio** (~12€/año).
**Plan en 2 fases**:
- **Fase A (ya, 0€)**: implementar la mecanica completa — boton "🎬 Bonus del
  dia (0/3)", cooldown, RPC atomico `claim_video_bonus` (+5 PM, max 3/dia,
  como claim_daily_reward), y en lugar del anuncio un video/animacion propia
  de 15s (el Mime haciendo el tonto). La economia y el habito quedan
  montados y medibles.
- **Fase B (cuando haya trafico)**: dominio propio + Cloudflare Pages,
  solicitar AdSense H5, sustituir el placeholder por `adBreak({type:
  'reward'})`. Alternativas si AdSense rechaza: Applixir o AdInPlay
  (redes de ads especificas para juegos web, menos exigentes).

---

## Lo que la investigacion dice que mas mueve (lecciones de Finch)

### 6. 📤 Compartir logros como imagen — 🟡 · 0€ · LA palanca viral nº1
Tarjeta generada con canvas ("He criado a Trufa 🐾 afinidad 92% — ¿me cuidas
el siguiente?") + **Web Share API** → sale la hoja de compartir del movil con
WhatsApp. Momentos compartibles: fin de cesion, desbloqueo del legendario,
racha de 7 dias, record en un mini-juego. El codigo de invitacion va incrustado
en la imagen y el texto. *Ya tenemos Web Share funcionando en las invitaciones.*

### 7. 🎁 Referidos — 🟡 · 0€ · loop de crecimiento clasico
Codigo de referido en el perfil. El nuevo jugador lo mete al registrarse (o
viene en el enlace) → **ambos** ganan 50 PM + un accesorio exclusivo de
referido. RPC atomico + columna `referred_by`. Combinado con el punto 6, cada
jugador contento se convierte en canal de adquisicion.

### 8. ⏰ Aventuras con timer — 🔴 · 0€ · la mecanica estrella de Finch
Mandas a tu Mime "de aventura" (4-8h reales). Al volver trae un
**descubrimiento aleatorio**: PM, un accesorio raro, una frase (o con el
punto 2, una mini-historia generada). Es el "appointment mechanic": te da una
razon concreta para VOLVER a abrir la app, y la recompensa variable engancha
(es literalmente la mecanica psicologica mas fuerte que existe en juegos).

### 9. 💌 "Buenas vibras" entre jugadores — 🟢🟡 · 0€
Boton rapido para mandar una animacion/emoji al dueno o cuidador (sin
escribir). Micro-social de Finch: baja friccion, alta calidez. Reutiliza la
tabla messages con un `sender_type` nuevo o un campo `kind='vibes'`.

### 10. 🔔 Notificaciones push reales — 🔴 · 0€ · el retorno nº1 en pet games
Web Push (VAPID) + tabla de suscripciones + Edge Function disparada por cron
(GitHub Actions schedule, ya dominamos eso): "🍖 Trufa tiene hambre", "💌
Tienes un mensaje", "⏰ Tu aventura ha terminado". Sin esto, el juego depende
de que el jugador se acuerde; con esto, el juego le llama.

### 11. ✨ Evolucion visual por afinidad — 🟢 · 0€
Ya hay crecimiento por dia de cesion; anadir hitos visuales por afinidad
(50%: brillo · 75%: aura · 100%: forma "radiante"). Refuerzo variable visible
que ademas hace mejores las capturas compartidas.

### 12. 🎪 Eventos temporales — 🟢 · 0€
Flag simple en DB + banner: "Fin de semana x2 afinidad", "Lunes de PM dobles".
Da razones de calendario para volver y contenido para anunciar en el grupo de
WhatsApp de turno.

### 13. 🌐 Dominio propio + Cloudflare Pages — 🟢 · ~12€/año · prerequisito
`mimescare.com` o similar. Necesario para AdSense (punto 5B), da URLs limpias
(adios `/#/`), mejor imagen al compartir, y previews por PR. El backend
Supabase no se toca.

---

## Roadmap propuesto

| Ola | Que | Por que primero |
|-----|-----|-----------------|
| **1 — Rapidas (0€)** | Historico de mensajes (4) · Voz Animalese (1) · Compartir logros (6) · Mime legendario (3) · Bonus de video fase A (5A) · Eventos (12) · Evolucion visual (11) | Todo frontend+SQL, sin dependencias externas; convierten el juego en algo que apetece enseñar |
| **2 — Crecimiento** | Referidos (7) · Aventuras con timer (8) · Vibras (9) | El loop viral completo: compartir → invitar → retener |
| **3 — Infra** | LLM por Mime (2) · Push notifications (10) · Dominio + AdSense real (13+5B) | Requieren decisiones tuyas: API key de Anthropic, dominio, cuenta AdSense |

**Decisiones que solo puedes tomar tu** (cuando toque la ola 3):
1. Crear una API key de Anthropic y ponerla como secret en Supabase (~2-5$/mes)
2. Comprar el dominio (~12€/año)
3. Abrir cuenta AdSense y pasar el allowlisting de H5 Games Ads

## Fuentes
- Finch/retencion: deconstructoroffun.com (widgets y loop), blog.sparrowapps.io ($30M ARR sin VC)
- AdSense H5 Games Ads: support.google.com/adsense/answer/9959170, developers.google.com/ad-placement
- Animalese: github.com/Acedio/animalese.js (+ demo y ports)
