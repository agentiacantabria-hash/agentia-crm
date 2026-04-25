-- ================================================================
-- MIGRACIÓN 003: Row Level Security (RLS)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Qué hace:
--   • Habilita RLS en todas las tablas del CRM
--   • Admins (rol = 'Admin' en la tabla usuarios) tienen acceso total
--   • Empleados solo ven/editan sus propios datos (por iniciales)
--   • Cobros y gastos: solo admins los leen; empleados pueden insertar
--     cobros (necesario para autoWinLead cuando cierran un lead)
-- ================================================================

-- ── Funciones helper (security definer = bypass RLS al leer usuarios) ──

create or replace function auth_is_admin()
returns boolean
language sql security definer stable
as $$
  select coalesce(
    (select rol = 'Admin' from usuarios where auth_uid = auth.uid() limit 1),
    false
  )
$$;

create or replace function auth_iniciales()
returns text
language sql security definer stable
as $$
  select iniciales from usuarios where auth_uid = auth.uid() limit 1
$$;

-- ── Habilitar RLS ──────────────────────────────────────────────────

alter table leads     enable row level security;
alter table clientes  enable row level security;
alter table tareas    enable row level security;
alter table proyectos enable row level security;
alter table cobros    enable row level security;
alter table gastos    enable row level security;
alter table usuarios  enable row level security;

-- ── LEADS ──────────────────────────────────────────────────────────
-- Admin: acceso total
-- Empleado: solo sus leads (responsable = sus iniciales)

drop policy if exists "leads_admin"      on leads;
drop policy if exists "leads_emp_select" on leads;
drop policy if exists "leads_emp_insert" on leads;
drop policy if exists "leads_emp_update" on leads;
drop policy if exists "leads_emp_delete" on leads;

create policy "leads_admin"
  on leads for all
  using (auth_is_admin());

create policy "leads_emp_select"
  on leads for select
  using (not auth_is_admin() and responsable = auth_iniciales());

create policy "leads_emp_insert"
  on leads for insert
  with check (not auth_is_admin() and responsable = auth_iniciales());

create policy "leads_emp_update"
  on leads for update
  using (not auth_is_admin() and responsable = auth_iniciales());

create policy "leads_emp_delete"
  on leads for delete
  using (not auth_is_admin() and responsable = auth_iniciales());

-- ── CLIENTES ───────────────────────────────────────────────────────

drop policy if exists "clientes_admin"      on clientes;
drop policy if exists "clientes_emp_select" on clientes;
drop policy if exists "clientes_emp_insert" on clientes;
drop policy if exists "clientes_emp_update" on clientes;
drop policy if exists "clientes_emp_delete" on clientes;

create policy "clientes_admin"
  on clientes for all
  using (auth_is_admin());

create policy "clientes_emp_select"
  on clientes for select
  using (not auth_is_admin() and responsable = auth_iniciales());

create policy "clientes_emp_insert"
  on clientes for insert
  with check (not auth_is_admin() and responsable = auth_iniciales());

create policy "clientes_emp_update"
  on clientes for update
  using (not auth_is_admin() and responsable = auth_iniciales());

create policy "clientes_emp_delete"
  on clientes for delete
  using (not auth_is_admin() and responsable = auth_iniciales());

-- ── TAREAS ─────────────────────────────────────────────────────────

drop policy if exists "tareas_admin"      on tareas;
drop policy if exists "tareas_emp_select" on tareas;
drop policy if exists "tareas_emp_insert" on tareas;
drop policy if exists "tareas_emp_update" on tareas;
drop policy if exists "tareas_emp_delete" on tareas;

create policy "tareas_admin"
  on tareas for all
  using (auth_is_admin());

create policy "tareas_emp_select"
  on tareas for select
  using (not auth_is_admin() and resp = auth_iniciales());

create policy "tareas_emp_insert"
  on tareas for insert
  with check (not auth_is_admin() and resp = auth_iniciales());

create policy "tareas_emp_update"
  on tareas for update
  using (not auth_is_admin() and resp = auth_iniciales());

create policy "tareas_emp_delete"
  on tareas for delete
  using (not auth_is_admin() and resp = auth_iniciales());

-- ── PROYECTOS ──────────────────────────────────────────────────────

drop policy if exists "proyectos_admin"      on proyectos;
drop policy if exists "proyectos_emp_select" on proyectos;
drop policy if exists "proyectos_emp_insert" on proyectos;
drop policy if exists "proyectos_emp_update" on proyectos;
drop policy if exists "proyectos_emp_delete" on proyectos;

create policy "proyectos_admin"
  on proyectos for all
  using (auth_is_admin());

create policy "proyectos_emp_select"
  on proyectos for select
  using (not auth_is_admin() and resp = auth_iniciales());

create policy "proyectos_emp_insert"
  on proyectos for insert
  with check (not auth_is_admin() and resp = auth_iniciales());

create policy "proyectos_emp_update"
  on proyectos for update
  using (not auth_is_admin() and resp = auth_iniciales());

create policy "proyectos_emp_delete"
  on proyectos for delete
  using (not auth_is_admin() and resp = auth_iniciales());

-- ── COBROS ─────────────────────────────────────────────────────────
-- Admin: acceso total
-- Empleado: solo puede insertar (autoWinLead crea cobros al cerrar leads)
--           No puede leer, editar ni borrar cobros

drop policy if exists "cobros_admin"      on cobros;
drop policy if exists "cobros_emp_insert" on cobros;

create policy "cobros_admin"
  on cobros for all
  using (auth_is_admin());

create policy "cobros_emp_insert"
  on cobros for insert
  with check (not auth_is_admin() and auth.uid() is not null);

-- ── GASTOS ─────────────────────────────────────────────────────────
-- Solo admins

drop policy if exists "gastos_admin" on gastos;

create policy "gastos_admin"
  on gastos for all
  using (auth_is_admin());

-- ── USUARIOS ───────────────────────────────────────────────────────
-- Todos pueden leer (necesario para cargar el perfil propio al login)
-- Solo admins pueden escribir (crear / editar / borrar usuarios del equipo)

drop policy if exists "usuarios_select"       on usuarios;
drop policy if exists "usuarios_admin_insert" on usuarios;
drop policy if exists "usuarios_admin_update" on usuarios;
drop policy if exists "usuarios_admin_delete" on usuarios;

create policy "usuarios_select"
  on usuarios for select
  using (true);

create policy "usuarios_admin_insert"
  on usuarios for insert
  with check (auth_is_admin());

create policy "usuarios_admin_update"
  on usuarios for update
  using (auth_is_admin());

create policy "usuarios_admin_delete"
  on usuarios for delete
  using (auth_is_admin());
