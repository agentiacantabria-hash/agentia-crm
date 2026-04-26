create table if not exists comentarios (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  autor      text not null,
  texto      text not null,
  created_at timestamptz not null default now()
);

alter table comentarios enable row level security;

create policy "admin_comentarios" on comentarios
  for all
  using  (auth_is_admin())
  with check (auth_is_admin());

create policy "employee_comentarios_select" on comentarios
  for select
  using (
    exists (
      select 1 from leads
      where leads.id = comentarios.lead_id
        and leads.responsable = auth_iniciales()
    )
  );

create policy "employee_comentarios_insert" on comentarios
  for insert
  with check (autor = auth_iniciales());

alter publication supabase_realtime add table comentarios;
