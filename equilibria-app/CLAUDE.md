# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

App web para **Equilibria**, estudio de pilates. Gestiona reservas de clases recurrentes, ausencias, recuperaciones y lista de espera. Hay dos tipos de usuarios: alumnas (con plan) y admin/instructora.

## Comandos

```bash
bun dev          # Dev server (package manager: Bun)
npx tsc --noEmit # Verificar tipos sin build
```

**No hay build local funcional.** `next build` falla en local. Para verificar tipos usar `tsc --noEmit`; para probar el resultado real, hacer deploy a Vercel.

## Stack

- **Next.js 16 + React 19 + TypeScript** (strict mode)
- **Supabase** — auth + base de datos (no real-time)
- **Tailwind CSS 3** con componentes CSS propios en `globals.css`
- **date-fns 4** para manipulación de fechas
- **Deploy:** Vercel (integración git NO auto-despliega — deploy manual)

## Arquitectura de autenticación

`proxy.ts` en la raíz actúa como middleware de Next.js (fue renombrado desde `middleware.ts`). Gestiona cookies de Supabase en cada request con `createServerClient`.

Dos clientes Supabase:
- `lib/supabase/client.ts` — browser (componentes client-side)
- `lib/supabase/server.ts` — server components y API routes
- El cliente admin (con `SUPABASE_SERVICE_ROLE_KEY`) se crea inline en cada API route que lo necesite.

## Modelo de datos (`lib/types.ts`)

**Tipos principales:**
- `Profile` — alumna con `plan_id` ('1x'|'2x'|'3x'), `is_admin`, `payment_status`, `last_payment_date`
- `ScheduleSlot` — clase recurrente con `day_of_week` (1=Lunes…5=Viernes), `start_time`, `min_regulars`, `max_capacity`
- `RegularSlot` — vincula alumna a slot fijo con `week_parity` ('all'|'even'|'odd')
- `Absence` — alumna que avisa que falta a su clase fija
- `RecoveryBooking` — reserva de recuperación (status: 'confirmed'|'cancelled')
- `WaitlistEntry` — lista de espera para una clase concreta

**Constantes globales:**
- `MAX_CAPACITY = 7` — aforo máximo por clase
- `CANCEL_DEADLINE_HOURS = 2` — horas antes de clase para poder cancelar
- `DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']`

**Tipos de clase** (con color Tailwind asociado):
`pilates` · `bodypower` · `gap` · `espalda` · `trx` · `hiit` · `funcional`
Colores definidos en `tailwind.config.ts` como `bg-pilates`, `bg-bodypower`, etc.

## Rutas API (`app/api/`)

**Auth:**
- `POST /api/auth/register` — registro con código de invitación, delega a Edge Function de Supabase

**Admin** (requieren `is_admin === true` en el perfil):
- `POST /api/admin/create-user` — crear usuario admin/instructor
- `POST /api/admin/create-client` — crear cliente con código de invitación
- `POST /api/admin/update-client` — actualizar datos de cliente
- `POST /api/admin/schedule-slot` — crear slot de horario
- `POST /api/admin/cancel-class` — cancelar una clase
- `POST /api/admin/announcement` — crear anuncio
- `POST/DELETE /api/admin/manage-attendance` — gestionar asistencia/recuperaciones
- `POST /api/admin/mark-absence` — marcar ausencia desde admin
- `GET /api/admin/attendees` — listar asistentes de un slot

**Alumna autenticada:**
- `POST /api/regular-slot` — apuntarse a clase fija
- `POST /api/absence` — avisar de ausencia
- `POST /api/recovery` — reservar recuperación
- `POST /api/waitlist` — entrar en lista de espera
- `POST /api/book` — reserva puntual

## Componentes

- `components/NavBar.tsx` — barra fija en `bottom-0` con 4 tabs (Horario, Mis clases, Perfil, Admin). Carga `is_admin` dinámicamente desde Supabase.
- `components/SlotModal.tsx` — modal para reservar/gestionar un slot concreto.

## Rutas de UI

| Ruta | Para quién |
|---|---|
| `/horario` | Todas — horario de clases (página de inicio) |
| `/mis-clases` | Alumna — sus clases fijas y recuperaciones |
| `/perfil` | Alumna — ver y editar perfil |
| `/login` | Pública |
| `/registro` | Pública — con código de invitación |
| `/recuperar` | Pública — recuperación de contraseña |
| `/admin` | Admin — panel de gestión |
| `/admin/clientes` | Admin — listado de clientes |

## Estilos

`globals.css` define componentes CSS reutilizables via Tailwind `@layer components`:
- `.card`, `.card-lg` — tarjetas con sombra
- `.input-field` — inputs con estilo consistente
- `.btn-primary`, `.btn-secondary`, `.btn-danger` — botones
- `.pb-nav`, `.safe-bottom` — padding para compensar la navbar inferior en móvil

Colores base: `navy`, `blue`, `paper`, `bone`, `ink` — definidos en `tailwind.config.ts`.

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # Server-side únicamente; sanitizar al leer (BOM iOS)
ADMIN_EMAIL
RESEND_API_KEY
```

## PWA

`public/manifest.json` + `public/icons/icon-192.png`. El `next.config.ts` añade cabecera `no-cache` para `sw.js`.

## Sanitización de inputs

iOS inyecta caracteres invisibles (BOM U+FEFF). Siempre sanitizar passwords y textos de usuario con `codePointAt()`. Ver función exacta en `~/.claude/CLAUDE.md` (regla global).
