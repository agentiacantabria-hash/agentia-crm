-- Tabla de notificaciones in-app
create table if not exists notificaciones (
  id         uuid primary key default gen_random_uuid(),
  para       text not null,        -- iniciales del destinatario
  tipo       text not null,        -- lead_asignado | lead_reasignado | lead_estado | tarea_asignada | tarea_reasignada
  titulo     text not null,
  subtitulo  text,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notificaciones enable row level security;

-- Admin: acceso total
create policy "admin_notif" on notificaciones
  for all
  using  (auth_is_admin())
  with check (auth_is_admin());

-- Empleado: solo sus propias notificaciones
create policy "employee_notif" on notificaciones
  for all
  using  (para = auth_iniciales())
  with check (para = auth_iniciales());

-- Habilitar realtime
alter publication supabase_realtime add table notificaciones;
