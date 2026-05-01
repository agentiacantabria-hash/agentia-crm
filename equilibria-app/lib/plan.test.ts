import { describe, expect, test } from 'bun:test'
import { maxRecoveriesPerMonth } from './plan'

describe('maxRecoveriesPerMonth', () => {
  const plan2x = { classes_per_week: 2, max_recoveries_per_month: 2 }
  const plan3x = { classes_per_week: 3, max_recoveries_per_month: 3 }
  const plan5x = { classes_per_week: 5, max_recoveries_per_month: 5 }

  test('cliente fijo usa max_recoveries_per_month del plan', () => {
    expect(maxRecoveriesPerMonth('fijo', plan2x)).toBe(2)
    expect(maxRecoveriesPerMonth('fijo', plan3x)).toBe(3)
    expect(maxRecoveriesPerMonth('fijo', plan5x)).toBe(5)
  })

  test('cliente rotativo usa classes_per_week × 4', () => {
    expect(maxRecoveriesPerMonth('rotativo', plan2x)).toBe(8)
    expect(maxRecoveriesPerMonth('rotativo', plan3x)).toBe(12)
    expect(maxRecoveriesPerMonth('rotativo', plan5x)).toBe(20)
  })

  test('schedule_type desconocido se trata como fijo', () => {
    expect(maxRecoveriesPerMonth(null, plan2x)).toBe(2)
    expect(maxRecoveriesPerMonth(undefined, plan2x)).toBe(2)
    expect(maxRecoveriesPerMonth('garbage', plan2x)).toBe(2)
  })

  test('sin plan devuelve 0', () => {
    expect(maxRecoveriesPerMonth('fijo', null)).toBe(0)
    expect(maxRecoveriesPerMonth('rotativo', undefined)).toBe(0)
  })
})
