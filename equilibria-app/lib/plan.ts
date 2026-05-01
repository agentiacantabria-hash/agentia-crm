const WEEKS_PER_MONTH = 4

/**
 * Calcula el cupo mensual de reservas/recuperaciones para un perfil.
 *
 * - Cliente `fijo`: usa `max_recoveries_per_month` del plan (suele coincidir
 *   con `classes_per_week`). Sus clases fijas NO consumen cupo, solo las
 *   recuperaciones puntuales lo hacen.
 * - Cliente `rotativo`: cada reserva es puntual (no tiene clases fijas), así
 *   que su cupo equivale a `classes_per_week × 4` semanas. Plan 2x rotativo
 *   → 8 reservas/mes; plan 3x → 12, etc.
 *
 * Mantener este cálculo en un único sitio porque se usa en /api/recovery
 * (gating) y en las vistas de cliente (display).
 */
export function maxRecoveriesPerMonth(
  scheduleType: string | null | undefined,
  plan: { classes_per_week: number; max_recoveries_per_month: number } | null | undefined,
): number {
  if (!plan) return 0
  if (scheduleType === 'rotativo') return plan.classes_per_week * WEEKS_PER_MONTH
  return plan.max_recoveries_per_month
}
