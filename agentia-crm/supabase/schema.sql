-- ============================================================
-- Agentia CRM — Supabase Schema
-- Ejecuta este script en SQL Editor de tu proyecto Supabase
-- ============================================================

-- LEADS
create table if not exists leads (
  id           uuid primary key default gen_random_uuid(),
  empresa      text not null,
  sector       text,
  ciudad       text,
  responsable  text,
  servicio     text,
  estado       text default 'Nuevo',
  next         text,
  monto        numeric default 0,
  origen       text,
  temp         text default 'cold' check (temp in ('hot','warm','cold','won','lost')),
  notas        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- CLIENTES
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  servicio     text,
  importe      numeric default 0,
  estado       text default 'En curso',
  pagado       boolean default false,
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
  when_group   text default 'semana' check (when_group in ('vencida','hoy','mañana','semana')),
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

-- ============================================================
-- SEED DATA (datos de ejemplo para empezar)
-- ============================================================

insert into leads (empresa, sector, ciudad, responsable, servicio, estado, next, monto, origen, temp) values
  ('Clínica Marbella',  'Salud',         'Málaga',    'LP', 'Web + Chatbot',          'Propuesta enviada', 'Llamar el 26 abr',       3800, 'Instagram', 'hot'),
  ('Aceite del Sur',    'Alimentación',  'Sevilla',   'AR', 'Automatización ventas',  'Interesado',        'Enviar caso de éxito',   2400, 'Referido',  'warm'),
  ('Estudio Nácar',     'Arquitectura',  'Valencia',  'LP', 'Web premium',            'Contactado',        'Reunión miércoles',      5200, 'LinkedIn',  'warm'),
  ('Kumō Sushi Bar',    'Restauración',  'Madrid',    'AR', 'Chatbot reservas',       'Nuevo',             'Primer contacto',        1600, 'Formulario','cold'),
  ('Gym Pulse',         'Fitness',       'Barcelona', 'LP', 'Mantenimiento web',      'En seguimiento',    'Recordatorio 30 abr',    900,  'Instagram', 'warm'),
  ('Notaría Vega',      'Legal',         'Madrid',    'LP', 'Web corporativa',        'Propuesta enviada', 'Seguimiento viernes',    4100, 'Referido',  'hot'),
  ('Bodegas Altura',    'Vinos',         'La Rioja',  'AR', 'E-commerce',             'Ganado',            '—',                      7200, 'Evento',    'won'),
  ('Dental Luna',       'Salud',         'Granada',   'AR', 'Chatbot citas',          'Perdido',           '—',                      0,    'Formulario','lost');

insert into clientes (nombre, servicio, importe, estado, pagado, ajustes, responsable, since) values
  ('Bodegas Altura',         'E-commerce + SEO',        7200, 'En curso',        true,  2, 'AR', 'Feb 2026'),
  ('Óptica Horizonte',       'Web + Chatbot',            3400, 'Pagado · ajustes',true,  3, 'LP', 'Ene 2026'),
  ('Taller Mecánico Ronda',  'Automatización WhatsApp',  1800, 'En revisión',     false, 0, 'LP', 'Mar 2026'),
  ('Inmobiliaria Litoral',   'Web premium',              5400, 'Cerrado',         true,  0, 'AR', 'Dic 2025'),
  ('Clínica Dental Nova',    'Mantenimiento mensual',     240, 'Recurrente',      true,  0, 'LP', 'Oct 2025'),
  ('Restaurante Marinero',   'Chatbot reservas',         1600, 'Pagado · ajustes',true,  1, 'AR', 'Feb 2026'),
  ('Academia Logos',         'Web + Captación',          2900, 'En curso',        false, 0, 'LP', 'Abr 2026');

insert into tareas (title, cliente, when_group, time, prio, resp, done, tag) values
  ('Llamar a Clínica Marbella para cerrar propuesta', 'Clínica Marbella',     'hoy',     '11:30', 'alta',  'LP', false, 'Comercial'),
  ('Revisar ajustes pendientes de Óptica Horizonte',  'Óptica Horizonte',     'hoy',     '14:00', 'alta',  'LP', false, 'Entrega'),
  ('Enviar caso de éxito a Aceite del Sur',            'Aceite del Sur',       'hoy',     '16:00', 'media', 'AR', false, 'Comercial'),
  ('Publicar post para Gym Pulse',                     'Gym Pulse',            'hoy',     '—',     'baja',  'LP', true,  'Operativo'),
  ('Reunión con Estudio Nácar',                        'Estudio Nácar',        'mañana',  '10:00', 'alta',  'LP', false, 'Comercial'),
  ('Cobrar segundo pago — Inmobiliaria Litoral',       'Inmobiliaria Litoral', 'mañana',  '12:00', 'media', 'AR', false, 'Finanzas'),
  ('Enviar ajuste de colores — Restaurante Marinero',  'Restaurante Marinero', 'vencida', 'Ayer',  'alta',  'AR', false, 'Entrega'),
  ('Configurar dominio Academia Logos',                'Academia Logos',       'semana',  'Vie',   'media', 'LP', false, 'Operativo');

insert into proyectos (cliente, servicio, estado, progreso, ajustes, pago, resp) values
  ('Bodegas Altura',       'E-commerce + SEO',  'En curso',         62,  2, 'Parcial 50%', 'AR'),
  ('Óptica Horizonte',     'Web + Chatbot',      'Pagado · ajustes', 88,  3, 'Pagado',      'LP'),
  ('Taller Ronda',         'Automatización WA',  'En revisión',      75,  1, 'Pendiente',   'LP'),
  ('Academia Logos',       'Web + Captación',    'En curso',         35,  0, 'Parcial 40%', 'LP'),
  ('Restaurante Marinero', 'Chatbot reservas',   'Pagado · ajustes', 95,  1, 'Pagado',      'AR'),
  ('Inmobiliaria Litoral', 'Web premium',        'Cerrado',          100, 0, 'Pagado',      'AR');

insert into gastos (concepto, tipo, monto, recurrente, fecha) values
  ('OpenAI — API',            'IA',          128, true,  '15 abr'),
  ('Anthropic — Claude',      'IA',           85, true,  '12 abr'),
  ('Vercel Pro',              'Infra',         20, true,  '8 abr'),
  ('Figma equipo',            'Herramienta',   30, true,  '5 abr'),
  ('Dominio .com cliente',    'Infra',         18, false, '3 abr'),
  ('Freelance copywriter',    'Personas',     320, false, '10 abr');

-- ============================================================
-- ROW LEVEL SECURITY (opcional — actívalo cuando añadas auth)
-- ============================================================
-- alter table leads     enable row level security;
-- alter table clientes  enable row level security;
-- alter table tareas    enable row level security;
-- alter table proyectos enable row level security;
-- alter table gastos    enable row level security;

-- Política básica: usuarios autenticados leen y escriben todo
-- create policy "auth users" on leads     for all using (auth.role() = 'authenticated');
-- create policy "auth users" on clientes  for all using (auth.role() = 'authenticated');
-- create policy "auth users" on tareas    for all using (auth.role() = 'authenticated');
-- create policy "auth users" on proyectos for all using (auth.role() = 'authenticated');
-- create policy "auth users" on gastos    for all using (auth.role() = 'authenticated');
