import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcastScheduleChange } from '@/lib/schedule-events'
import { createNotification } from '@/lib/notifications'
import { maxRecoveriesPerMonth } from '@/lib/plan'
import { DAY_NAMES, MAX_CAPACITY } from '@/lib/types'

type SlotMeta = { className: string; dayName: string; time: string }

async function getSlotMeta(slotId: string): Promise<SlotMeta | null> {
  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return null }
  const { data } = await admin.from('schedule_slots')
    .select('day_of_week, start_time, class_types(name)')
    .eq('id', slotId).single()
  if (!data) return null
  const d = data as unknown as { day_of_week: number; start_time: string; class_types: { name: string } | null }
  return {
    className: d.class_types?.name ?? 'tu clase',
    dayName:   DAY_NAMES[d.day_of_week] ?? '',
    time:      d.start_time?.slice(0, 5) ?? '',
  }
}

function formatDateEs(yyyyMmDd: string): string {
  return new Date(yyyyMmDd + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { type, user_id, slot_id, class_date, force } = await req.json()
  const admin = createAdminClient()

  if (type === 'regular') {
    // Validar plan: classes_per_week >= regulares actuales + 1
    if (!force) {
      const [{ data: profile }, { count: currentRegulars }] = await Promise.all([
        admin.from('profiles').select('plan_id, schedule_type, plans(classes_per_week, name)').eq('id', user_id).single(),
        admin.from('regular_slots').select('*', { count: 'exact', head: true }).eq('user_id', user_id),
      ])
      if ((profile as { schedule_type?: string } | null)?.schedule_type === 'rotativo') {
        return NextResponse.json({ error: 'Esta clienta es rotativa y no tiene clases fijas. Cambia su tipo a fijo primero o usa "Solo este día".' }, { status: 409 })
      }
      const plan = (profile?.plans as unknown as { classes_per_week: number; name: string } | null)
      if (plan && (currentRegulars ?? 0) + 1 > plan.classes_per_week) {
        return NextResponse.json({
          error: `Esta clienta ya tiene ${currentRegulars} clase${currentRegulars !== 1 ? 's' : ''} fija${currentRegulars !== 1 ? 's' : ''} y su plan "${plan.name}" solo permite ${plan.classes_per_week}.`,
          code: 'plan_conflict',
        }, { status: 409 })
      }
    }

    const { error } = await sb.from('regular_slots').insert({
      user_id, slot_id, week_parity: 'all',
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Ya tiene esta clase fija' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const meta = await getSlotMeta(slot_id)
    if (meta) {
      await createNotification({
        user_id,
        type: 'announcement',
        title: `Te hemos apuntado a ${meta.className}`,
        body: `${meta.dayName} a las ${meta.time}h. Ya aparece en tus clases fijas.`,
        link: '/mis-clases',
      })
    }
  } else if (type === 'recovery') {
    if (!class_date) return NextResponse.json({ error: 'Falta class_date para reserva puntual' }, { status: 400 })

    if (!force) {
      // Validar que la clase no esté cancelada
      const { data: cancelled } = await admin
        .from('cancelled_classes').select('id').eq('slot_id', slot_id).eq('class_date', class_date).maybeSingle()
      if (cancelled) {
        return NextResponse.json({ error: 'Esta clase está cancelada' }, { status: 409 })
      }

      // Validar aforo (regulars + recoveries confirmed - absences)
      const [{ data: slotInfo }, { count: regularCount }, { count: absentCount }, { count: recoveryCount }] = await Promise.all([
        admin.from('schedule_slots').select('max_capacity').eq('id', slot_id).single(),
        admin.from('regular_slots').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id),
        admin.from('absences').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date),
        admin.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed'),
      ])
      const slotMax = (slotInfo as { max_capacity?: number } | null)?.max_capacity ?? MAX_CAPACITY
      const capacity = (regularCount ?? 0) - (absentCount ?? 0) + (recoveryCount ?? 0)
      if (capacity >= slotMax) {
        return NextResponse.json({
          error: `La clase está completa (${capacity}/${slotMax}). Usa force=true para forzarlo.`,
          code: 'capacity_conflict',
        }, { status: 409 })
      }

      // Validar cupo mensual de la alumna
      const { data: profile } = await admin
        .from('profiles').select('schedule_type, plans(classes_per_week, max_recoveries_per_month)').eq('id', user_id).single()
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
      const { count: usedRecoveries } = await admin
        .from('recovery_bookings').select('*', { count: 'exact', head: true })
        .eq('user_id', user_id).eq('status', 'confirmed').gte('class_date', monthStart.toISOString().slice(0,10))
      const scheduleType = (profile as { schedule_type?: string } | null)?.schedule_type
      const plan = (profile?.plans as unknown as { classes_per_week: number; max_recoveries_per_month: number } | null)
      const maxRecoveries = maxRecoveriesPerMonth(scheduleType, plan)
      if ((usedRecoveries ?? 0) >= maxRecoveries) {
        return NextResponse.json({
          error: `Ha agotado su cupo del mes (${usedRecoveries}/${maxRecoveries}). Usa force=true para forzarlo.`,
          code: 'cupo_conflict',
        }, { status: 409 })
      }
    }

    // Reactivar reserva cancelada anterior si existe
    const { data: existing } = await admin
      .from('recovery_bookings').select('id, status')
      .eq('user_id', user_id).eq('slot_id', slot_id).eq('class_date', class_date)
      .maybeSingle()

    if (existing && (existing as { status: string }).status === 'confirmed') {
      return NextResponse.json({ error: 'Ya tiene reserva ese día' }, { status: 409 })
    }

    const { error } = existing
      ? await sb.from('recovery_bookings').update({ status: 'confirmed' }).eq('id', (existing as { id: string }).id)
      : await sb.from('recovery_bookings').insert({ user_id, slot_id, class_date, status: 'confirmed' })

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Ya tiene reserva ese día' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const meta = await getSlotMeta(slot_id)
    if (meta) {
      await createNotification({
        user_id,
        type: 'announcement',
        title: `Reserva añadida: ${meta.className}`,
        body: `${formatDateEs(class_date)} a las ${meta.time}h. Te hemos apuntado desde el estudio.`,
        link: '/mis-clases',
      })
    }
  } else {
    return NextResponse.json({ error: 'type debe ser "regular" o "recovery"' }, { status: 400 })
  }

  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date ?? null })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { type, user_id, slot_id, class_date } = await req.json()

  if (type === 'regular') {
    const { error } = await sb.from('regular_slots').delete().eq('user_id', user_id).eq('slot_id', slot_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const meta = await getSlotMeta(slot_id)
    if (meta) {
      await createNotification({
        user_id,
        type: 'announcement',
        title: `Hemos modificado tu horario`,
        body: `Ya no estás apuntada a ${meta.className} de los ${meta.dayName} a las ${meta.time}h.`,
        link: '/mis-clases',
      })
    }
  } else if (type === 'recovery') {
    if (!class_date) return NextResponse.json({ error: 'Falta class_date' }, { status: 400 })
    const { error } = await sb.from('recovery_bookings')
      .delete()
      .eq('user_id', user_id).eq('slot_id', slot_id).eq('class_date', class_date)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const meta = await getSlotMeta(slot_id)
    if (meta) {
      await createNotification({
        user_id,
        type: 'announcement',
        title: `Reserva eliminada: ${meta.className}`,
        body: `Tu reserva del ${formatDateEs(class_date)} a las ${meta.time}h ha sido cancelada desde el estudio.`,
        link: '/mis-clases',
      })
    }
  } else {
    return NextResponse.json({ error: 'type debe ser "regular" o "recovery"' }, { status: 400 })
  }

  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date ?? null })
  return NextResponse.json({ ok: true })
}
