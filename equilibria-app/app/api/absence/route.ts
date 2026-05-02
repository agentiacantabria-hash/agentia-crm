import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CANCEL_DEADLINE_HOURS } from '@/lib/types'
import { notifyFirstInWaitlist } from '@/lib/waitlist-notify'
import { broadcastScheduleChange } from '@/lib/schedule-events'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, class_date } = await req.json()

  // Verificar plazo de 2 horas
  const { data: slot } = await sb.from('schedule_slots').select('start_time').eq('id', slot_id).single()
  if (slot) {
    const classDateTime = new Date(`${class_date}T${slot.start_time}`)
    const hoursUntilClass = (classDateTime.getTime() - Date.now()) / 3_600_000
    if (hoursUntilClass < CANCEL_DEADLINE_HOURS) {
      return NextResponse.json(
        { error: `Solo se puede marcar falta con ${CANCEL_DEADLINE_HOURS}h de antelación` },
        { status: 409 }
      )
    }
  }

  // Si la clase ya está cancelada, marcar falta no tiene sentido
  const { data: cancelled } = await sb.from('cancelled_classes')
    .select('id').eq('slot_id', slot_id).eq('class_date', class_date).maybeSingle()
  if (cancelled) {
    return NextResponse.json(
      { error: 'Esta clase ha sido cancelada — no necesitas marcar falta' },
      { status: 409 }
    )
  }

  // Verificar que tiene esta clase como fija
  const { data: regular } = await sb.from('regular_slots')
    .select('id').eq('user_id', user.id).eq('slot_id', slot_id).single()
  if (!regular) return NextResponse.json({ error: 'No tienes esta clase en tu horario fijo' }, { status: 400 })

  const { error } = await sb.from('absences').insert({ user_id: user.id, slot_id, class_date })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya marcaste falta en esta clase' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notificar al primero de la lista de espera si hay
  await notifyFirstInWaitlist(slot_id, class_date)
  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, class_date } = await req.json()
  const { error } = await sb.from('absences')
    .delete().eq('user_id', user.id).eq('slot_id', slot_id).eq('class_date', class_date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await broadcastScheduleChange({ slotId: slot_id, classDate: class_date })
  return NextResponse.json({ ok: true })
}

