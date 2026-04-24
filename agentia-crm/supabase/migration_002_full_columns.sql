-- ============================================================
-- Migración 002 — Columnas faltantes completas
-- Ejecuta este script en SQL Editor de tu proyecto Supabase
-- Todas las sentencias usan IF NOT EXISTS — se puede ejecutar
-- varias veces sin riesgo.
-- ============================================================

-- TAREAS
alter table tareas add column if not exists prio      text default 'media';
alter table tareas add column if not exists time      text;
alter table tareas add column if not exists resp      text;
alter table tareas add column if not exists tag       text;
alter table tareas add column if not exists due_date  text;

-- LEADS
alter table leads add column if not exists contacto       text;
alter table leads add column if not exists telefono       text;
alter table leads add column if not exists email          text;
alter table leads add column if not exists notas          text;
alter table leads add column if not exists temp           text default 'cold';
alter table leads add column if not exists señal_cobrada  numeric default 0;
alter table leads add column if not exists vence_resto    text;

-- CLIENTES
alter table clientes add column if not exists contacto  text;
alter table clientes add column if not exists telefono  text;
alter table clientes add column if not exists email     text;
alter table clientes add column if not exists tipo      text default 'Proyecto';
alter table clientes add column if not exists since     text;
alter table clientes add column if not exists responsable text;
alter table clientes add column if not exists ajustes   integer default 0;

-- PROYECTOS
alter table proyectos add column if not exists resp      text;
alter table proyectos add column if not exists progreso  integer default 0;
alter table proyectos add column if not exists ajustes   integer default 0;
alter table proyectos add column if not exists pago      text default 'Pendiente';
alter table proyectos add column if not exists servicio  text;

-- COBROS (crear si no existe)
create table if not exists cobros (
  id          uuid primary key default gen_random_uuid(),
  cliente     text not null,
  concepto    text,
  monto       numeric default 0,
  vence       text,
  pagado      boolean default false,
  vencida     boolean default false,
  recurrente  boolean default false,
  frecuencia  text default 'Mensual',
  created_at  timestamptz default now()
);
