import { describe, expect, test } from 'bun:test'
import { parityActive } from './parity'

describe('parityActive', () => {
  // Días reales de 2026 con su número ISO de semana
  // 2026-01-05 (lunes) → semana 2 (par)
  // 2026-01-12 (lunes) → semana 3 (impar)
  const evenWeekDate = new Date('2026-01-05T10:00:00Z')
  const oddWeekDate  = new Date('2026-01-12T10:00:00Z')

  test('"all" siempre activa', () => {
    expect(parityActive('all', evenWeekDate)).toBe(true)
    expect(parityActive('all', oddWeekDate)).toBe(true)
  })

  test('"even" activa solo en semanas pares', () => {
    expect(parityActive('even', evenWeekDate)).toBe(true)
    expect(parityActive('even', oddWeekDate)).toBe(false)
  })

  test('"odd" activa solo en semanas impares', () => {
    expect(parityActive('odd', evenWeekDate)).toBe(false)
    expect(parityActive('odd', oddWeekDate)).toBe(true)
  })

  test('valores desconocidos no se activan (excepto "all")', () => {
    expect(parityActive('garbage', evenWeekDate)).toBe(false)
    expect(parityActive('', oddWeekDate)).toBe(false)
  })
})
