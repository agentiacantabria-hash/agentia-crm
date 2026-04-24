-- ============================================================
-- Migración 001 — Columnas faltantes
-- Ejecuta este script en SQL Editor de tu proyecto Supabase
-- ============================================================

-- LEADS: añadir contacto, telefono, email, señal_cobrada, vence_resto
alter table leads add column if not exists contacto     text;
alter table leads add column if not exists telefono     text;
alter table leads add column if not exists email        text;
alter table leads add column if not exists señal_cobrada numeric default 0;
alter table leads add column if not exists vence_resto  text;

-- CLIENTES: añadir contacto, telefono, email, tipo
alter table clientes add column if not exists contacto  text;
alter table clientes add column if not exists telefono  text;
alter table clientes add column if not exists email     text;
alter table clientes add column if not exists tipo      text default 'Proyecto';

-- TAREAS: añadir due_date
alter table tareas add column if not exists due_date    text;

-- COBROS: tabla completamente nueva
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
