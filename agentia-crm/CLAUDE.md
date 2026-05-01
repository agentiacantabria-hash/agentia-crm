# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

CRM interno de **Agentia** (agencia de automatizaciones). Gestiona el pipeline de ventas, clientes activos, tareas, proyectos, finanzas y equipo. Solo acceden los propios empleados de Agentia.

## Stack técnico

```bash
cd agentia-crm
bun dev       # Vite dev server en localhost:5173
bun run build # Build de producción
```

- **Vite 6 + React 18 + JavaScript (JSX)** — sin TypeScript
- **Supabase** — base de datos + auth + real-time
- **CSS vanilla** — `src/styles.css`
- **Deploy:** Netlify (`netlify.toml` con redirect SPA)

## Arquitectura

SPA de una sola página. Sin router externo. La navegación funciona por estado interno `currentPage` en `App.jsx`, persistido en `localStorage` con clave `agentia_page`.

**Toda la lógica de negocio vive en `src/App.jsx`** (~890 líneas): auth, CRUD de todas las tablas, real-time, cascadas, RBAC. Los componentes en `src/components/` son principalmente UI.

## Tablas Supabase

| Tabla | Para qué |
|---|---|
| `leads` | Pipeline de ventas con stages |
| `clientes` | Clientes activos (vienen de leads ganados) |
| `tareas` | Task management asignado a usuarios |
| `proyectos` | Proyectos vinculados a clientes |
| `gastos` | Gastos del negocio (solo admin) |
| `cobros` | Cobros recurrentes y puntuales |
| `usuarios` | Equipo (roles: admin, manager, empleado) |
| `actividad` | Log de acciones |
| `notificaciones` | Notificaciones internas |
| `plantillas_tareas` | Templates de tareas reutilizables |
| `comentarios` | Comentarios en leads/proyectos |

Migraciones en `supabase/migration_00X_*.sql`. El esquema actual completo está en `supabase/schema.sql`.

## Patrones clave en App.jsx

**Real-time:** Cada tabla tiene su propio canal Supabase Realtime:
```js
supabase.channel('leads-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, handler)
```

**Cascada lead → cliente:** Al marcar un lead como Ganado, App.jsx migra manualmente tareas, proyectos y crea cobros asociados. Esta lógica es crítica — leerla completa antes de tocarla.

**Stages de lead:** Definidos en `src/components/data.js` (`STAGE`, `STAGES_CLOSED`). Los stages cerrados (Ganado, Perdido, Descartado) tienen comportamiento especial.

**RBAC:** El rol del usuario (`admin`, `manager`, `empleado`) controla qué secciones son visibles y qué acciones están permitidas. Comprobado en múltiples puntos de `App.jsx`.

## Componentes en src/components/

| Archivo | Qué hace |
|---|---|
| `Shell.jsx` | Layout: Sidebar (desktop) + Topbar + BottomNav (mobile) |
| `Dashboard.jsx` | Página de KPIs y métricas |
| `LeadsClientesPipeline.jsx` | Kanban de leads + tabla de clientes |
| `TareasProyectos.jsx` | Task management y proyectos |
| `FinanzasAjustes.jsx` | Ingresos/gastos (solo admin) |
| `Equipo.jsx` | Gestión del equipo |
| `Drawer.jsx` | Panel lateral rápido para crear leads |
| `Modal.jsx` | Modal genérico reutilizable |
| `WowEffect.jsx` | Animación de celebración al ganar un lead |
| `Icons.jsx` | SVG icons |
| `data.js` | Constantes: STAGE, STAGES_CLOSED |
| `Login.jsx` | Pantalla de login |

## Variables de entorno

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Ver `.env.example`. Las credenciales reales están en `.env` (no commitear).

## Supabase client

```js
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
```

## Regla importante

Antes de modificar cualquier lógica en `App.jsx` relacionada con stages, cascadas o cobros, leer el flujo completo. Son interdependencias no obvias que pueden romper el pipeline de ventas silenciosamente.
