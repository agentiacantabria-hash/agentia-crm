import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { user_id, slot_id, class_date } = await req.json()

  const { error } = await sb.from('absences').insert({ user_id, slot_id, class_date })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya tiene falta ese día' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { user_id, slot_id, class_date } = await req.json()
  await sb.from('absences').delete().eq('user_id', user_id).eq('slot_id', slot_id).eq('class_date', class_date)
  return NextResponse.json({ ok: true })
}
