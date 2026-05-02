import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createNotifications } from '@/lib/notifications'
import { broadcastScheduleChange } from '@/lib/schedule-events'

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb, user } = guard

  const { slot_id, class_date, reason } = await req.json()

  // Snapshot de quienes están afectados ANTES de tocar nada, para
  // poder notificar correctamente sin pillar a las que ya habían
  // cancelado por su cuenta.
  const admin = createAdminClient()
  const [{ data: regulars }, { data: confirmedRecoveries }] = await Promise.all([
    admin.from('regular_slots').select('user_id').eq('slot_id', slot_id),
    admin.from('recovery_bookings').select('user_id').eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed'),
  ])

  const { error } = await sb.from('cancelled_classes').insert({
    slot_id, class_date, reason: reason || null, created_by: user.id,
  })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Esta clase ya está cancelada' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Devolver créditos a quienes tenían recuperación confirmada
  await sb.from('recovery_bookings')
    .update({ status: 'cancelled' })
    .eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed')

  // Limpiar lista de espera (la clase ya no existe)
  await sb.from('waitlist').delete().eq('slot_id', slot_id).eq('class_date', class_date)

  // Notificar a las realmente afectadas
  const regularIds  = ((regulars ?? []) as { user_id: string }[]).map(r => r.user_id)
  const recoveryIds = ((confirmedRecoveries ?? []) as { user_id: string }[]).map(r => r.user_id)
  await notifyCancelled(slot_id, class_date, reason, Array.from(new Set([...regularIds, ...recoveryIds])))

  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { slot_id, class_date } = await req.json()

  // Antes de borrar el cancelled_classes, sacamos lista de quienes
  // tenían recovery cancelada por la cancelación admin para revertirlas
  // a confirmed y notificar.
  const admin = createAdminClient()
  const { data: cancelledRecoveries } = await admin
    .from('recovery_bookings')
    .select('user_id')
    .eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'cancelled')

  await sb.from('cancelled_classes').delete().eq('slot_id', slot_id).eq('class_date', class_date)

  // Revertir las recoveries a confirmed (status = cancelled fue puesto al cancelar la clase)
  await admin.from('recovery_bookings')
    .update({ status: 'confirmed' })
    .eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'cancelled')

  // Avisar a las regulars y a las recoveries reactivadas
  const { data: regulars } = await admin
    .from('regular_slots').select('user_id').eq('slot_id', slot_id)

  const regularIds  = ((regulars ?? []) as { user_id: string }[]).map(r => r.user_id)
  const recoveryIds = ((cancelledRecoveries ?? []) as { user_id: string }[]).map(r => r.user_id)
  await notifyReinstated(slot_id, class_date, Array.from(new Set([...regularIds, ...recoveryIds])))

  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })
  return NextResponse.json({ ok: true })
}

async function getSlotMeta(slotId: string, classDate: string) {
  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return null }
  const { data: slot } = await admin
    .from('schedule_slots').select('start_time, class_types(name)').eq('id', slotId).single()
  return {
    className: (slot?.class_types as unknown as { name: string } | null)?.name ?? 'tu clase',
    time:      slot?.start_time?.slice(0, 5) ?? '',
    dateLabel: new Date(classDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }),
  }
}

async function notifyCancelled(slotId: string, classDate: string, reason: string | null, userIds: string[]) {
  if (!userIds.length) return
  const meta = await getSlotMeta(slotId, classDate)
  if (!meta) return
  const reasonText = reason ? ` Motivo: ${reason}.` : ''
  await createNotifications(userIds, {
    type: 'class_cancelled',
    title: `${meta.className} de ${meta.dateLabel} cancelada`,
    body: `La clase de ${meta.dateLabel} a las ${meta.time}h ha sido cancelada.${reasonText} Si tenías recuperación, se te ha devuelto el crédito.`,
    link: '/horario',
  })
}

async function notifyReinstated(slotId: string, classDate: string, userIds: string[]) {
  if (!userIds.length) return
  const meta = await getSlotMeta(slotId, classDate)
  if (!meta) return
  await createNotifications(userIds, {
    type: 'announcement',
    title: `${meta.className} restablecida`,
    body: `La clase del ${meta.dateLabel} a las ${meta.time}h vuelve a celebrarse. Tu plaza está reservada.`,
    link: '/horario',
  })
}
