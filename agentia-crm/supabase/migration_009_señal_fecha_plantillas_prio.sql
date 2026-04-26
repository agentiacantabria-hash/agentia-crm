-- ================================================================
-- MIGRACIÓN 009: señal_fecha en leads + prio en plantillas
--
-- Problemas corregidos:
--   1. leads.señal_fecha faltaba en el schema.
--      handleSeñalConfirm escribía { estado, señal_cobrada, señal_fecha }
--      pero PostgREST devolvía 400 (columna desconocida) y el error
--      se tragaba silenciosamente → el lead no persistía como 'Señal pagada'
--      en DB y revertía al estado anterior tras recargar la página,
--      dejando los dos cobros creados como huérfanos.
--   2. plantillas_tareas.prio usaba 'normal' como valor por defecto
--      y en las filas seed, pero tareas.prio tiene CHECK (prio IN
--      ('alta','media','baja')) → el INSERT fallaba al crear una tarea
--      desde esas plantillas.
-- ================================================================

-- ── 1. Columna señal_fecha en leads ────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS señal_fecha text;

-- ── 2. Normalizar prio 'normal' → 'media' en plantillas_tareas ─
--    'normal' y 'media' son equivalentes semánticamente; 'media' es
--    el único valor que cumple el CHECK constraint de tareas.prio.
UPDATE public.plantillas_tareas
  SET prio = 'media'
  WHERE prio = 'normal';

ALTER TABLE public.plantillas_tareas
  ALTER COLUMN prio SET DEFAULT 'media';
