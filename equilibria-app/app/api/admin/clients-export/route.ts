import { NextRequest } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/clients-export
 * Devuelve un CSV con todas las clientas para uso contable o backup.
 * Columnas: nombre, código, plan, tipo horario, estado pago,
 * último pago, recuperaciones del mes, teléfono, cumpleaños, miembro desde
 */
export async function GET(_req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const admin = createAdminClient()
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
  const monthStartStr = monthStart.toISOString().slice(0,10)

  const [{ data: profiles }, { data: recoveriesAll }] = await Promise.all([
    admin.from('profiles').select('*, plans(name, classes_per_week)').eq('is_admin', false).order('full_name'),
    admin.from('recovery_bookings').select('user_id').eq('status', 'confirmed').gte('class_date', monthStartStr),
  ])

  const recByUser: Record<string, number> = {}
  ;(recoveriesAll ?? []).forEach((r: { user_id: string }) => {
    recByUser[r.user_id] = (recByUser[r.user_id] ?? 0) + 1
  })

  const headers = [
    'Nombre', 'Codigo', 'Plan', 'Tipo horario',
    'Estado pago', 'Ultimo pago', 'Reservas/Recup mes',
    'Telefono', 'Cumpleaños', 'Miembro desde',
  ]

  type Row = {
    full_name: string; username: string | null; phone: string | null
    plan_id: string | null; payment_status: string; last_payment_date: string | null
    schedule_type: string | null; created_at: string; birthday: string | null; id: string
    plans: { name: string } | null
  }

  const rows = ((profiles ?? []) as Row[]).map(p => [
    csvEscape(p.full_name),
    csvEscape(p.username ?? ''),
    csvEscape(p.plans?.name ?? p.plan_id ?? ''),
    p.schedule_type ?? '',
    paymentLabel(p.payment_status),
    p.last_payment_date ?? '',
    String(recByUser[p.id] ?? 0),
    csvEscape(p.phone ?? ''),
    p.birthday ?? '',
    p.created_at?.slice(0, 10) ?? '',
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  // BOM para Excel ES con tildes
  const body = '﻿' + csv

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes_equilibria_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function paymentLabel(s: string): string {
  if (s === 'al_dia')    return 'Al dia'
  if (s === 'pendiente') return 'Pendiente'
  if (s === 'atrasado')  return 'Atrasado'
  return s
}
