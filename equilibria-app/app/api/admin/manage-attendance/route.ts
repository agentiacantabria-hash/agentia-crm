import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { broadcastScheduleChange } from '@/lib/schedule-events'
import { createNotification } from '@/lib/notifications'
import { DAY_NAMES } from '@/lib/types'

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

  const { type, user_id, slot_id, class_date, week_parity } = await req.json()

  if (type === 'regular') {
    const { error } = await sb.from('regular_slots').insert({
      user_id, slot_id, week_parity: week_parity || 'all',
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
    const { error } = await sb.from('recovery_bookings').insert({
      user_id, slot_id, class_date, status: 'confirmed',
    })
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
