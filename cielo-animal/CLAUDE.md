# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Landing page informativa para **Cielo Animal**, guardería y hotel para mascotas en Palencia. Sin backend ni base de datos. El formulario de contacto envía por WhatsApp. El objetivo es transmitir confianza emocional y convertir visitas en reservas de visita.

## Datos del negocio

- **Nombre:** Cielo Animal
- **Dirección:** Polígono Industrial, Palencia, 34004
- **Teléfono:** 655 93 32 33
- **Email:** hola@cieloanimal.es
- **Instagram:** @cieloanimal
- **Horario:** Lunes a Sábado · 08:00 — 20:00
- **Stats:** +500 familias, 4.9★ (127 reseñas verificadas), 6 servicios

## Stack técnico

HTML5 + CSS3 + JavaScript vanilla. Sin frameworks, sin build tool, sin npm. Para desarrollar: abrir `index.html` directamente en el navegador o con Live Server.

- `index.html` — toda la estructura HTML de la web
- `styles.css` — todos los estilos con variables CSS en `:root`
- `app.js` — interactividad (nav scroll, burger menu, modales, lightbox, FAQ toggle, scroll reveal, marquee)
- `assets/` — imágenes del negocio

## Sistema de colores

```css
/* Paleta sky (azul cielo) */
--sky-700:   #1e3a5f   /* Principal oscuro */
--sky-500:   #5788b2   /* Principal medio */
--sky-300:   #a8c5e0   /* Principal claro */
--sky-100:   #e6eff7   /* Fondos ligeros */

/* Neutros */
--ink:       #1a2436   /* Texto principal */
--ink-soft:  #4a5670   /* Texto secundario */
--ink-muted: #7a8499   /* Texto terciario */
--cream:     #faf8f4   /* Fondo principal */
--cream-2:   #f3efe7   /* Fondo alternativo */
--paper:     #ffffff
--line:      #e6e0d4   /* Bordes */
```

## Tipografías

| Familia | Uso |
|---|---|
| **Fraunces** (serif) | Títulos, headings, números decorativos |
| **Inter** (sans-serif) | Body text, párrafos, UI |

```css
--serif: 'Fraunces', 'Times New Roman', serif
--sans:  'Inter', system-ui, sans-serif
```

## Secciones de la web (en orden)

1. **Nav** — Logo + links + CTA (teléfono + "Reservar visita")
2. **Hero** — Headline emocional, métricas de confianza, fotos de animales, badge de horario
3. **Marquee** — Scroll infinito con los 6 servicios
4. **Servicios** — 6 cards: Guardería, Hotel, Peluquería, Ozonoterapia, Fisioterapia, Último adiós
5. **Instalaciones** — Grid 5 tiles: zona juego, piscina, agility, patio exterior, zona felina
6. **Sobre nosotros** — Historia + valores + equipo
7. **Último adiós** — Sección dedicada al servicio de cremación (tono delicado, no modificar sin consenso)
8. **Cómo trabajamos** — 4 pasos del proceso
9. **Reseñas** — 6 testimonios 5★ con nombre y contexto
10. **FAQ** — 6 preguntas frecuentes con toggle
11. **Contacto** — Info + formulario que envía por WhatsApp
12. **Footer** — Links legales + redes sociales

## Interactividad en app.js

- **Nav:** cambia fondo al hacer scroll (clase `.scrolled`)
- **Burger menu:** toggle del menú mobile en <960px
- **Modales:** cada card de servicio abre un modal con detalle
- **Lightbox:** galería de instalaciones con navegación
- **FAQ toggle:** acordeón de preguntas
- **Scroll reveal:** IntersectionObserver con clase `.reveal`
- **Formulario:** construye mensaje WhatsApp con los datos del formulario y abre wa.me

## Decisiones de diseño que no cambiar sin consultar

- **Tono emocional** — el copy usa palabras como "familia", "cariño", "sin prisas". Mantener ese tono en cualquier texto nuevo.
- **Sección "Último adiós"** — servicio de cremación. Tratar con delicadeza. No usar lenguaje clínico ni frío.
- **Formulario → WhatsApp** — no tiene backend. No añadir envío por email sin consultar.
- **Tipografía Fraunces** en headlines da el carácter único a la web. No sustituir por sans-serif.
- Breakpoints: 960px (desktop/tablet), 720px (tablet/mobile), 600px (mobile).

## Deploy

Vercel (configurado en `.vercel/`). HTML estático — desplegar con `vercel --prod` desde la carpeta del proyecto.
