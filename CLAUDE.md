# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace overview

This repo contains four separate web projects under `WEBS/`:

| Carpeta | Tipo | Stack | Deploy |
|---|---|---|---|
| `equilibria-app/` | SaaS de reservas de pilates | Next.js 16 + React 19 + TypeScript + Supabase | Vercel |
| `agentia-crm/` | CRM interno de Agentia | Vite + React 18 + Supabase | Netlify |
| `cielo-animal/` | Landing page guardería mascotas | HTML/CSS/JS vanilla | Vercel |
| `geopadel/` | Landing page club de pádel | HTML/CSS + React (sin build tool) | Vercel |

---

## equilibria-app

### Comandos

```bash
cd equilibria-app
bun dev          # Dev server (usa Bun como package manager)
bun run build    # Produce errores de tipos — NO usarlo localmente
npx tsc --noEmit # Verificación de tipos sin build
```

> **No hay build local funcional.** El build real ocurre en Vercel. Para verificar tipos usar `tsc --noEmit`; para probar el resultado, hacer deploy directo.

### Arquitectura

App Router de Next.js con SSR y autenticación Supabase via cookies.

**Flujo de autenticación:**
- `proxy.ts` es el middleware (archivo raíz, no `middleware.ts` que fue eliminado). Gestiona cookies de Supabase en cada request via `createServerClient`.
- Dos clientes Supabase: `lib/supabase/client.ts` (browser) y `lib/supabase/server.ts` (server components/API routes).
- El cliente de admin usa `SUPABASE_SERVICE_ROLE_KEY` y solo se crea en rutas API de servidor.

**Modelo de datos clave (`lib/types.ts`):**
- `Profile` — usuario con `plan_id` ('1x'|'2x'|'3x'), `is_admin`, `payment_status`.
- `ScheduleSlot` — clase recurrente con `day_of_week`, `start_time`, `min_regulars`, `max_capacity`.
- `RegularSlot` — vincula usuario a slot fijo con paridad de semana (`all`|`even`|`odd`).
- `Absence` / `RecoveryBooking` / `WaitlistEntry` — gestión de ausencias, recuperaciones y lista de espera.
- Constantes globales: `MAX_CAPACITY = 7`, `CANCEL_DEADLINE_HOURS = 2`.

**Tipos de clase y sus colores Tailwind** (definidos en `tailwind.config.ts`):
`pilates` `bodypower` `gap` `espalda` `trx` `hiit` `funcional` — cada uno tiene clase CSS `bg-<tipo>`.

**Rutas API (`app/api/`):**
- `/api/auth/register` — registro con código de invitación, delega a Edge Function de Supabase.
- `/api/admin/*` — todas requieren `is_admin === true` en el perfil. Crean usuarios, gestionan horarios, cancelan clases, marcan asistencia.
- `/api/regular-slot`, `/api/absence`, `/api/recovery`, `/api/waitlist`, `/api/book` — acciones de usuario autenticado.

**Componentes:**
- `NavBar.tsx` — barra fija en `bottom-0` con 4 tabs (Horario, Mis clases, Perfil, Admin). Carga `is_admin` dinámicamente.
- `SlotModal.tsx` — modal para reservar/gestionar un slot concreto.

**Estilos:**
- Tailwind con `globals.css` que define componentes CSS reutilizables: `.card`, `.card-lg`, `.input-field`, `.btn-primary`, `.btn-secondary`, `.btn-danger`.
- `.pb-nav` y `.safe-bottom` compensan la navbar inferior en móvil.
- Fuentes y colores base: `navy`, `blue`, `paper`, `bone`, `ink` en `tailwind.config.ts`.

**PWA:** `public/manifest.json` + `public/icons/icon-192.png`. Cabecera `no-cache` para `sw.js` en `next.config.ts`.

### Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Solo server-side; sanitizar al leer (ver nota BOM)
ADMIN_EMAIL
RESEND_API_KEY
```

---

## agentia-crm

### Comandos

```bash
cd agentia-crm
bun dev      # Vite dev server
bun run build
```

### Arquitectura

SPA React con toda la lógica en `src/App.jsx` (~890 líneas). Sin routing externo — navegación por estado interno (`currentPage`), persistido en `localStorage` con clave `agentia_page`.

**Tablas Supabase gestionadas:** `leads`, `clientes`, `tareas`, `proyectos`, `gastos`, `cobros`, `usuarios`, `actividad`, `notificaciones`, `plantillas_tareas`, `comentarios`.

**Patrones importantes:**
- Real-time bidireccional via `supabase.channel('...').on('postgres_changes', ...)` — cada tabla tiene su canal.
- Cascada manual al mover lead → cliente: se migran tareas, proyectos y se crean cobros.
- RBAC: roles `admin`, `manager`, `empleado` controlan qué secciones y acciones son visibles.
- `WowEffect` en `src/components/WowEffect.jsx` — animación de celebración al cerrar un lead como Ganado.
- Stages de lead definidos en `src/components/data.js` (`STAGE`, `STAGES_CLOSED`).

**Deploy:** Netlify (configurado en `netlify.toml` con redirect `/*` → `/index.html`).

---

## cielo-animal / geopadel

Landings estáticas sin BD ni build pipeline. Editar `index.html`, `styles.css` y `app.js` directamente. Deploy arrastrando a Vercel o via CLI.

`geopadel/tweaks-panel.jsx` es un panel de edición de design tokens en tiempo real (no se compila — se usa directamente en el navegador via script tag).

---

## Notas transversales

- **Sanitización BOM/iOS** — Todos los proyectos con Supabase Auth deben sanitizar passwords con `codePointAt()`. Ver regla global en `~/.claude/CLAUDE.md`.
- **Deploy Vercel** — La integración git no auto-despliega. Usar el comando PowerShell con Node en PATH (ver memoria `feedback_deployment.md`).
- **Supabase IDs** — Ver `memory/reference_equilibria_infra.md` para IDs de proyecto y organización sin hacer lookups.
