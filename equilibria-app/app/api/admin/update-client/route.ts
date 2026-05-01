import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'

export async function PATCH(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { user_id, payment_status, last_payment_date, notes, plan_id, schedule_type } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (payment_status    !== undefined) updates.payment_status    = payment_status
  if (last_payment_date !== undefined) updates.last_payment_date = last_payment_date || null
  if (notes             !== undefined) updates.notes             = notes || null
  if (plan_id           !== undefined) updates.plan_id           = plan_id
  if (schedule_type     !== undefined && ['fijo', 'rotativo'].includes(schedule_type)) updates.schedule_type = schedule_type

  const { error } = await sb.from('profiles').update(updates).eq('id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
