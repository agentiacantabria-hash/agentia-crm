# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Landing page informativa para **Geopadel**, club de pádel indoor en Granada (Ogíjares). Sin backend ni base de datos. El objetivo es convertir visitas en reservas por WhatsApp o teléfono.

## Datos del negocio

- **Nombre:** Geopadel
- **Dirección:** C/ Zamora 130, Ogíjares, Granada
- **Teléfono móvil:** 646 059 962
- **Teléfono fijo:** 958 597 814
- **Email:** geopadel@gmail.com
- **Instagram:** @geopadelgranada
- **WhatsApp:** https://wa.me/34646059962
- **Horario:** L–V 09:00–14:00 / 17:00–23:30 · S–D 09:00–14:00 / 17:00–22:00
- **Pistas:** 9 indoor

## Stack técnico

Sin build tool. React 18 + Babel standalone cargado directamente desde CDN en `index.html`. Los archivos JSX se cargan como `type="text/babel"` en este orden:

```
tweaks-panel.jsx → src/data.jsx → src/atoms.jsx → src/sections.jsx → src/app.jsx
```

Para desarrollar: abrir `index.html` directamente en el navegador (o con Live Server). No hay `npm install`, `bun dev` ni ningún comando de build.

## Estructura de archivos

- `index.html` — entry point con meta SEO, Open Graph, Schema.org LocalBusiness
- `styles.css` — todos los estilos (37KB), variables CSS en `:root`
- `tweaks-panel.jsx` — panel flotante de edición de tokens en tiempo real (persiste en localStorage)
- `src/data.jsx` — toda la información estática del negocio (precios, horarios, servicios, reseñas)
- `src/sections.jsx` — componentes de cada sección de la web
- `src/atoms.jsx` — componentes pequeños reutilizables (SVG glyphs: ArrowRight, Phone, WhatsApp, Instagram, Mark)
- `src/app.jsx` — composición y orden de secciones
- `assets/` — imágenes (court-01/02/03.png, shop-apparel-01.png)

**Regla:** Cualquier dato del negocio (precio, horario, teléfono, texto de sección) vive en `src/data.jsx`. No hardcodear en `src/sections.jsx`.

## Sistema de colores (OKLCH)

```css
--ink          oklch(0.16 0.012 250)   /* Azul oscuro — texto principal */
--paper        oklch(0.985 0.004 100)  /* Blanco crema — fondo */
--court        oklch(0.52 0.15 240)    /* Azul cancha — color principal */
--court-deep   oklch(0.40 0.13 250)    /* Azul cancha oscuro */
--lime         oklch(0.88 0.18 110)    /* Verde lima — acción/CTA */
```

El sistema usa OKLCH (no hex ni HSL) para consistencia perceptual. Añadir nuevos colores siguiendo este formato.

## Tipografías

| Familia | Uso | Pesos cargados |
|---|---|---|
| **Archivo** | Headlines y display | 500–900 |
| **Archivo Narrow** | Headings secundarios | 500–700 |
| **Inter** | Body text | 400–600 |
| **JetBrains Mono** | Eyebrows y meta | 400–500 |

Clases tipográficas clave: `.h-display` (Archivo 800), `.h-narrow` (Archivo Narrow 700), `.eyebrow` (JetBrains Mono 11px uppercase).

## Secciones de la web (en orden)

1. **Nav** — Logo + links + CTA (teléfono + WhatsApp)
2. **Hero** — Headline, stats (9 pistas, cubierto), horarios, foto cancha
3. **Marquee** — Scroll infinito con diferenciadores
4. **Ventajas** (01) — 4 tarjetas: clima, horarios, ambiente, servicio completo
5. **Instalaciones** (02) — Grid 4 fotos: pabellón, cristales, LED, tienda
6. **Clases** (03) — Adultos (12€/clase) y Niños (35€ o 64€/mes)
7. **Precios** (04) — Tabla alquiler de pistas (5–7€/h según franja)
8. **Tienda** (05) — Palas Drop Shot, zapatillas, ropa, accesorios. Sin venta online.
9. **Reviews** (06) — 3 testimonios 5★
10. **Contacto** (07) — Info + mapa Google Maps embed
11. **CTA Final** — "Coge la pala. Reserva tu pista."
12. **Footer** — Links + copyright
13. **Elementos flotantes** — FAB (WhatsApp + Phone) y barra inferior sticky

## Decisiones de diseño que no cambiar sin consultar

- **WhatsApp es el CTA principal** en toda la web (botón lime). El teléfono es secundario.
- **Sin reservas online.** Todo va a WhatsApp/teléfono. No añadir sistemas de booking.
- **Sin venta online en tienda.** El copy dice expresamente "No vendemos online: pásate y elígelas."
- **Colores OKLCH** — no mezclar con hex en variables CSS.
- Las animaciones de reveal usan IntersectionObserver con clase `.reveal` — no cambiar el sistema.

## Deploy

Vercel (configurado en `.vercel/`). Como es HTML estático, cualquier cambio guardado se puede desplegar con `vercel --prod` desde la carpeta del proyecto.
