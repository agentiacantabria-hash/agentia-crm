import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getISOWeek } from 'date-fns'

export async function GET(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const slot_id    = searchParams.get('slot_id')
  const class_date = searchParams.get('class_date')
  if (!slot_id || !class_date) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const date       = new Date(class_date + 'T12:00:00')
  const weekIsEven = getISOWeek(date) % 2 === 0
  const parity     = weekIsEven ? 'even' : 'odd'

  const [{ data: regulars }, { data: absences }, { data: recoveries }, { data: waitlist }] = await Promise.all([
    sb.from('regular_slots')
      .select('user_id, week_parity, profiles(full_name, username)')
      .eq('slot_id', slot_id)
      .in('week_parity', ['all', parity]),
    sb.from('absences')
      .select('user_id')
      .eq('slot_id', slot_id)
      .eq('class_date', class_date),
    sb.from('recovery_bookings')
      .select('user_id, profiles(full_name, username)')
      .eq('slot_id', slot_id)
      .eq('class_date', class_date)
      .eq('status', 'confirmed'),
    sb.from('waitlist')
      .select('user_id, profiles(full_name, username)')
      .eq('slot_id', slot_id)
      .eq('class_date', class_date),
  ])

  const absentIds = new Set((absences ?? []).map((a: { user_id: string }) => a.user_id))

  type Row = { user_id: string; full_name: string; type: 'regular' | 'recovery' | 'absent' | 'waitlist' }
  type AnyRow = { user_id: string; profiles: unknown }

  function name(r: AnyRow): string {
    const p = r.profiles as { full_name?: string; username?: string } | null
    return p?.full_name || p?.username || '—'
  }

  const regularList: Row[] = (regulars ?? [] as AnyRow[]).map((r: AnyRow) => ({
    user_id:   r.user_id,
    full_name: name(r),
    type:      absentIds.has(r.user_id) ? 'absent' : 'regular',
  }))

  const recoveryList: Row[] = (recoveries ?? [] as AnyRow[]).map((r: AnyRow) => ({
    user_id:   r.user_id,
    full_name: name(r),
    type:      'recovery',
  }))

  const waitlistList: Row[] = (waitlist ?? [] as AnyRow[]).map((r: AnyRow) => ({
    user_id:   r.user_id,
    full_name: name(r),
    type:      'waitlist',
  }))

  return NextResponse.json({
    attendees: [...regularList, ...recoveryList],
    waitlist:  waitlistList,
  })
}
