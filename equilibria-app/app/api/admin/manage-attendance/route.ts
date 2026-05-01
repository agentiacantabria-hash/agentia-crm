import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { type, user_id, slot_id, class_date, week_parity } = await req.json()

  if (type === 'regular') {
    const { error } = await sb.from('regular_slots').insert({
      user_id, slot_id, week_parity: week_parity || 'all',
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Ya tiene esta clase fija' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (type === 'recovery') {
    if (!class_date) return NextResponse.json({ error: 'Falta class_date para reserva puntual' }, { status: 400 })
    const { error } = await sb.from('recovery_bookings').insert({
      user_id, slot_id, class_date, status: 'confirmed',
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Ya tiene reserva ese día' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    return NextResponse.json({ error: 'type debe ser "regular" o "recovery"' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { type, user_id, slot_id, class_date } = await req.json()

  if (type === 'regular') {
    await sb.from('regular_slots').delete().eq('user_id', user_id).eq('slot_id', slot_id)
  } else if (type === 'recovery') {
    if (!class_date) return NextResponse.json({ error: 'Falta class_date' }, { status: 400 })
    await sb.from('recovery_bookings')
      .delete()
      .eq('user_id', user_id).eq('slot_id', slot_id).eq('class_date', class_date)
  } else {
    return NextResponse.json({ error: 'type debe ser "regular" o "recovery"' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
