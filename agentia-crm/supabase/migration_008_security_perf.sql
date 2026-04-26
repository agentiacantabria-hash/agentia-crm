-- ================================================================
-- MIGRACIÓN 008: Seguridad + Índices de rendimiento
--
-- Problemas corregidos:
--   1. search_path mutable en funciones SECURITY DEFINER
--      → vector de inyección si un atacante crea funciones en otro schema
--   2. Ausencia de índices en columnas filtradas por RLS y queries frecuentes
--      → full table scan en cada evaluación de política
-- ================================================================

-- ── 1. Fijar search_path en funciones SECURITY DEFINER ─────────────
--    SET search_path = '' obliga a usar nombres completamente cualificados
--    (public.usuarios) y elimina el riesgo de shadowing.

CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT rol = 'Admin' FROM public.usuarios WHERE auth_uid = auth.uid() LIMIT 1),
    FALSE
  )
$$;

CREATE OR REPLACE FUNCTION auth_iniciales()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT iniciales FROM public.usuarios WHERE auth_uid = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION auth_is_manager_or_above()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT rol IN ('Admin', 'Manager') FROM public.usuarios WHERE auth_uid = auth.uid() LIMIT 1),
    FALSE
  )
$$;

-- ── 2. Índices en columnas de RLS y filtros frecuentes ─────────────

-- leads.responsable → usado en RLS SELECT/UPDATE/DELETE y filtros de pipeline
CREATE INDEX IF NOT EXISTS idx_leads_responsable
  ON public.leads (responsable);

-- clientes.responsable → usado en RLS
CREATE INDEX IF NOT EXISTS idx_clientes_responsable
  ON public.clientes (responsable);

-- tareas.resp → usado en RLS
CREATE INDEX IF NOT EXISTS idx_tareas_resp
  ON public.tareas (resp);

-- proyectos.resp → usado en RLS
CREATE INDEX IF NOT EXISTS idx_proyectos_resp
  ON public.proyectos (resp);

-- actividad.lead_id → FK + subquery en RLS employee_actividad
CREATE INDEX IF NOT EXISTS idx_actividad_lead_id
  ON public.actividad (lead_id);

-- comentarios.lead_id → FK + subquery en RLS employee_comentarios_select
CREATE INDEX IF NOT EXISTS idx_comentarios_lead_id
  ON public.comentarios (lead_id);

-- notificaciones.para → usado en RLS + query de no leídas
-- Índice compuesto (para, leida) cubre también el count de no leídas
CREATE INDEX IF NOT EXISTS idx_notificaciones_para_leida
  ON public.notificaciones (para, leida);

-- cobros.cliente → agrupaciones en Finanzas y suscripciones
CREATE INDEX IF NOT EXISTS idx_cobros_cliente
  ON public.cobros (cliente);
