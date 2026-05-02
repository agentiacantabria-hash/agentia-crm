import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createNotifications } from '@/lib/notifications'
import { broadcastScheduleChange } from '@/lib/schedule-events'

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb, user } = guard

  const { slot_id, class_date, reason } = await req.json()

  const { error } = await sb.from('cancelled_classes').insert({
    slot_id, class_date, reason: reason || null, created_by: user.id,
  })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Esta clase ya está cancelada' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Devolver créditos a quienes tenían recuperación en esta clase
  await sb.from('recovery_bookings')
    .update({ status: 'cancelled' })
    .eq('slot_id', slot_id).eq('class_date', class_date).eq('status', 'confirmed')

  // Enviar email a afectados
  await notifyAffected(sb, slot_id, class_date, reason)
  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { slot_id, class_date } = await req.json()
  await sb.from('cancelled_classes').delete().eq('slot_id', slot_id).eq('class_date', class_date)
  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })
  return NextResponse.json({ ok: true })
}

async function notifyAffected(
  _sb: Awaited<ReturnType<typeof createClient>>,
  slotId: string,
  classDate: string,
  reason: string | null
) {
  // Las afectadas son: regulares activas esa semana (paridad) + recuperaciones
  // confirmadas para esa fecha. Usamos admin client para esquivar RLS.
  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return }

  const [{ data: slot }, { data: regulars }, { data: recoveries }] = await Promise.all([
    admin.from('schedule_slots').select('start_time, class_types(name)').eq('id', slotId).single(),
    admin.from('regular_slots').select('user_id').eq('slot_id', slotId),
    admin.from('recovery_bookings').select('user_id').eq('slot_id', slotId).eq('class_date', classDate).eq('status', 'cancelled'),
  ])

  const className = (slot?.class_types as unknown as { name: string } | null)?.name ?? 'tu clase'
  const time = slot?.start_time?.slice(0, 5) ?? ''
  const dateLabel = new Date(classDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

  const activeRegulars = ((regulars ?? []) as { user_id: string }[]).map(r => r.user_id)
  const recoveryUsers  = ((recoveries ?? []) as { user_id: string }[]).map(r => r.user_id)

  // Dedup por user_id (alguien podría tener regular + recovery — improbable pero curarse en salud)
  const userIds = Array.from(new Set([...activeRegulars, ...recoveryUsers]))

  const reasonText = reason ? ` Motivo: ${reason}.` : ''
  await createNotifications(userIds, {
    type: 'class_cancelled',
    title: `${className} de ${dateLabel} cancelada`,
    body: `La clase de ${dateLabel} a las ${time}h ha sido cancelada.${reasonText} Si tenías recuperación, se te ha devuelto el crédito.`,
    link: '/horario',
  })
}
