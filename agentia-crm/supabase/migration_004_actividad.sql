-- Tabla de actividad (log de llamadas, emails, reuniones, notas por lead)
create table if not exists actividad (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  tipo       text not null default 'nota',
  texto      text not null,
  resp       text not null default '',
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table actividad enable row level security;

-- Admin: acceso total
create policy "admin_all_actividad" on actividad
  for all
  using  (auth_is_admin())
  with check (auth_is_admin());

-- Empleado: acceso a actividades de sus leads
create policy "employee_actividad" on actividad
  for all
  using (
    lead_id in (
      select id from leads where responsable = auth_iniciales()
    )
  )
  with check (
    lead_id in (
      select id from leads where responsable = auth_iniciales()
    )
  );

-- Habilitar realtime para sincronización en tiempo real
alter publication supabase_realtime add table actividad;
