-- ============================================================
-- Agentia CRM — Supabase Schema (completo)
-- Ejecuta este script en SQL Editor de tu proyecto Supabase
-- Si ya tienes las tablas, usa migration_001_missing_columns.sql
-- ============================================================

-- LEADS
create table if not exists leads (
  id             uuid primary key default gen_random_uuid(),
  empresa        text not null,
  sector         text,
  ciudad         text,
  contacto       text,
  telefono       text,
  email          text,
  responsable    text,
  servicio       text,
  estado         text default 'Cliente Nuevo',
  next           text,
  monto          numeric default 0,
  origen         text,
  temp           text default 'cold' check (temp in ('hot','warm','cold')),
  notas          text,
  señal_cobrada  numeric default 0,
  vence_resto    text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- CLIENTES
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  contacto     text,
  telefono     text,
  email        text,
  servicio     text,
  importe      numeric default 0,
  estado       text default 'En curso',
  tipo         text default 'Proyecto',
  ajustes      integer default 0,
  responsable  text,
  since        text,
  created_at   timestamptz default now()
);

-- TAREAS
create table if not exists tareas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  cliente      text,
  when_group   text default 'semana',
  due_date     text,
  time         text,
  prio         text default 'media' check (prio in ('alta','media','baja')),
  resp         text,
  done         boolean default false,
  tag          text,
  created_at   timestamptz default now()
);

-- PROYECTOS
create table if not exists proyectos (
  id           uuid primary key default gen_random_uuid(),
  cliente      text not null,
  servicio     text,
  estado       text default 'En curso',
  progreso     integer default 0 check (progreso >= 0 and progreso <= 100),
  ajustes      integer default 0,
  pago         text default 'Pendiente',
  resp         text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- GASTOS
create table if not exists gastos (
  id           uuid primary key default gen_random_uuid(),
  concepto     text not null,
  tipo         text,
  monto        numeric not null,
  recurrente   boolean default false,
  fecha        text,
  created_at   timestamptz default now()
);

-- COBROS
create table if not exists cobros (
  id           uuid primary key default gen_random_uuid(),
  cliente      text not null,
  concepto     text,
  monto        numeric default 0,
  vence        text,
  pagado       boolean default false,
  vencida      boolean default false,
  recurrente   boolean default false,
  frecuencia   text default 'Mensual',
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (actívalo cuando añadas auth)
-- ============================================================
-- alter table leads     enable row level security;
-- alter table clientes  enable row level security;
-- alter table tareas    enable row level security;
-- alter table proyectos enable row level security;
-- alter table gastos    enable row level security;
-- alter table cobros    enable row level security;
