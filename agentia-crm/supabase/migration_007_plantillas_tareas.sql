create table if not exists plantillas_tareas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  titulo     text not null,
  tag        text,
  prio       text not null default 'media',
  created_at timestamptz not null default now()
);

alter table plantillas_tareas enable row level security;

create policy "admin_plantillas_all" on plantillas_tareas
  for all
  using  (auth_is_admin())
  with check (auth_is_admin());

create policy "all_plantillas_select" on plantillas_tareas
  for select
  using (true);

insert into plantillas_tareas (nombre, titulo, tag, prio) values
  ('Primer contacto',     'Llamada de primer contacto con {cliente}',   'Comercial', 'alta'),
  ('Enviar propuesta',    'Preparar y enviar propuesta a {cliente}',     'Comercial', 'alta'),
  ('Seguimiento',         'Seguimiento propuesta — {cliente}',           'Comercial', 'media'),
  ('Onboarding cliente',  'Onboarding inicial con {cliente}',            'Entrega',   'alta'),
  ('Revisión entrega',    'Revisión y ajustes finales — {cliente}',      'Entrega',   'media'),
  ('Cobrar resto',        'Cobrar resto del proyecto — {cliente}',       'Finanzas',  'alta'),
  ('Reunión de equipo',   'Reunión semanal de equipo',                   'Interno',   'media');
