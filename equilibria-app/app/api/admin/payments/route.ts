import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/payments?user_id=...&limit=10
 * Devuelve histórico de pagos de un cliente.
 */
export async function GET(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const { searchParams } = new URL(req.url)
  const user_id = searchParams.get('user_id')
  const limit   = Number(searchParams.get('limit') ?? '20')
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('payments')
    .select('id, amount, method, notes, paid_at')
    .eq('user_id', user_id)
    .order('paid_at', { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}

/**
 * POST /api/admin/payments
 * Body: { user_id, amount?, method?, notes?, mark_al_dia? = true }
 * Registra un pago y opcionalmente marca al cliente como al día.
 */
export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const { user_id, amount, method, notes, mark_al_dia = true } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const admin = createAdminClient()

  const { data: payment, error } = await admin.from('payments').insert({
    user_id,
    amount:  typeof amount === 'number' ? amount : null,
    method:  method || null,
    notes:   notes  || null,
    created_by: guard.user.id,
  }).select('id, paid_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (mark_al_dia) {
    await admin.from('profiles').update({
      payment_status:    'al_dia',
      last_payment_date: new Date().toISOString().slice(0, 10),
    }).eq('id', user_id)
  }

  return NextResponse.json({ ok: true, payment })
}

/**
 * DELETE /api/admin/payments
 * Body: { id }
 * Borra un pago concreto. NO revierte el estado del profile (lo hace
 * el admin manualmente si quiere).
 */
export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('payments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
