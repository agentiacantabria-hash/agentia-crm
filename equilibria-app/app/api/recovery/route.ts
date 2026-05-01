import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_CAPACITY } from '@/lib/types'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, class_date } = await req.json()

  // Verificar créditos de recuperación disponibles este mes
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
  const [{ data: profile }, { count: usedCredits }] = await Promise.all([
    sb.from('profiles').select('plan_id, schedule_type, plans(max_recoveries_per_month)').eq('id', user.id).single(),
    sb.from('recovery_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('class_date', monthStart.toISOString().slice(0,10)),
  ])

  const maxRecoveries = (profile?.plans as unknown as { max_recoveries_per_month: number } | null)?.max_recoveries_per_month ?? 2
  if ((usedCredits ?? 0) >= maxRecoveries) {
    return NextResponse.json({ error: `Has agotado tus ${maxRecoveries} recuperación${maxRecoveries > 1 ? 'es' : ''} de este mes` }, { status: 409 })
  }

  // Verificar capacidad de la clase
  const [{ count: regularCount }, { count: absentCount }, { count: recoveryCount }] = await Promise.all([
    sb.from('regular_slots').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id),
    sb.from('absences').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date),
    sb.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed'),
  ])
  const capacity = (regularCount ?? 0) - (absentCount ?? 0) + (recoveryCount ?? 0)
  if (capacity >= MAX_CAPACITY) return NextResponse.json({ error: 'La clase está completa' }, { status: 409 })

  // Clientes fijos no pueden reservar su propia clase fija como recuperación
  const isRotating = (profile as unknown as { schedule_type?: string })?.schedule_type === 'rotativo'
  if (!isRotating) {
    const { data: ownSlot } = await sb.from('regular_slots')
      .select('id').eq('user_id', user.id).eq('slot_id', slot_id).single()
    if (ownSlot) return NextResponse.json({ error: 'No puedes recuperar tu propia clase fija' }, { status: 400 })
  }

  const { error } = await sb.from('recovery_bookings').insert({ user_id: user.id, slot_id, class_date, status: 'confirmed' })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya tienes una recuperación en esta clase' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Quitar de la lista de espera si estaba
  await sb.from('waitlist').delete().eq('user_id', user.id).eq('slot_id', slot_id).eq('class_date', class_date)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, class_date } = await req.json()
  const { error } = await sb.from('recovery_bookings')
    .update({ status: 'cancelled' })
    .eq('user_id', user.id).eq('slot_id', slot_id).eq('class_date', class_date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
