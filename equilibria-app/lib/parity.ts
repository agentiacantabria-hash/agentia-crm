import { getISOWeek } from 'date-fns'

export type WeekParity = 'all' | 'even' | 'odd'

/**
 * Devuelve true si una clase con cierta paridad de semana está activa
 * en la fecha dada. La paridad se calcula sobre el número ISO de semana
 * (1..53) — `even`/`odd` se compara contra `getISOWeek(date) % 2 === 0`.
 * Cualquier valor distinto de los tres conocidos devuelve false.
 */
export function parityActive(parity: WeekParity | string, date: Date): boolean {
  if (parity === 'all') return true
  if (parity !== 'even' && parity !== 'odd') return false
  const weekIsEven = getISOWeek(date) % 2 === 0
  return (parity === 'even') === weekIsEven
}
