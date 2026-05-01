import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Capacidad: usar admin client para que el count NO esté sesgado por las
  // policies RLS (que limitan a regulares/recoveries propias del usuario)
  const admin = createAdminClient()
  const [{ data: slotInfo }, { count: regularCount }, { count: absentCount }, { count: recoveryCount }] = await Promise.all([
    admin.from('schedule_slots').select('max_capacity').eq('id', slot_id).single(),
    admin.from('regular_slots').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id),
    admin.from('absences').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date),
    admin.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed'),
  ])
  const slotMax = slotInfo?.max_capacity ?? MAX_CAPACITY
  const capacity = (regularCount ?? 0) - (absentCount ?? 0) + (recoveryCount ?? 0)
  if (capacity >= slotMax) return NextResponse.json({ error: 'La clase está completa' }, { status: 409 })

  // Clientes fijos no pueden reservar su propia clase fija como recuperación
  const isRotating = (profile as unknown as { schedule_type?: string })?.schedule_type === 'rotativo'
  if (!isRotating) {
    const { data: ownSlot } = await sb.from('regular_slots')
      .select('id').eq('user_id', user.id).eq('slot_id', slot_id).single()
    if (ownSlot) return NextResponse.json({ error: 'No puedes recuperar tu propia clase fija' }, { status: 400 })
  }

  // Si existe una reserva cancelada anterior, reactivarla en lugar de chocar con el UNIQUE
  const { data: existing } = await sb.from('recovery_bookings')
    .select('id, status')
    .eq('user_id', user.id).eq('slot_id', slot_id).eq('class_date', class_date)
    .maybeSingle()

  if (existing?.status === 'confirmed') {
    return NextResponse.json({ error: 'Ya tienes una recuperación en esta clase' }, { status: 409 })
  }

  const { error } = existing
    ? await sb.from('recovery_bookings').update({ status: 'confirmed' }).eq('id', existing.id)
    : await sb.from('recovery_bookings').insert({ user_id: user.id, slot_id, class_date, status: 'confirmed' })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya tienes una recuperación en esta clase' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Post-check: re-contar tras el insert. Si nos hemos pasado del aforo por una
  // race condition (dos reservas concurrentes), revertir esta y devolver 409.
  // No es 100% atómico pero reduce la ventana a milisegundos.
  const { count: postRecoveryCount } = await admin
    .from('recovery_bookings').select('*', { count: 'exact', head: true })
    .eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed')
  const postCapacity = (regularCount ?? 0) - (absentCount ?? 0) + (postRecoveryCount ?? 0)
  if (postCapacity > slotMax) {
    await sb.from('recovery_bookings')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id).eq('slot_id', slot_id).eq('class_date', class_date)
    return NextResponse.json({ error: 'La clase acaba de llenarse' }, { status: 409 })
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
