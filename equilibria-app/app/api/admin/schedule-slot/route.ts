import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function adminCheck(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? user : null
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  if (!await adminCheck(sb)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { day_of_week, start_time, duration_minutes, class_type_id, min_regulars, max_capacity } = await req.json()
  if (!day_of_week || !start_time || !class_type_id) {
    return NextResponse.json({ error: 'Faltan campos (day_of_week, start_time, class_type_id)' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('schedule_slots')
    .insert({ day_of_week, start_time, duration_minutes: duration_minutes || 50, class_type_id, is_active: true, min_regulars: min_regulars ?? 0, max_capacity: max_capacity ?? 7 })
    .select('*, class_types(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, slot: data })
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient()
  if (!await adminCheck(sb)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { slot_id, day_of_week, start_time, duration_minutes, class_type_id, is_active, min_regulars, max_capacity } = await req.json()
  if (!slot_id) return NextResponse.json({ error: 'Falta slot_id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (day_of_week      !== undefined) updates.day_of_week      = day_of_week
  if (start_time       !== undefined) updates.start_time       = start_time
  if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes
  if (class_type_id    !== undefined) updates.class_type_id    = class_type_id
  if (is_active        !== undefined) updates.is_active        = is_active
  if (min_regulars     !== undefined) updates.min_regulars     = min_regulars
  if (max_capacity     !== undefined) updates.max_capacity     = max_capacity

  const { error } = await sb.from('schedule_slots').update(updates).eq('id', slot_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  if (!await adminCheck(sb)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { slot_id } = await req.json()
  if (!slot_id) return NextResponse.json({ error: 'Falta slot_id' }, { status: 400 })

  const { error } = await sb.from('schedule_slots').update({ is_active: false }).eq('id', slot_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
