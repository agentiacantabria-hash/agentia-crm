import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CANCEL_DEADLINE_HOURS } from '@/lib/types'

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
  await notifyWaitlist(sb, slot_id, class_date)

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
  return NextResponse.json({ ok: true })
}

async function notifyWaitlist(
  sb: Awaited<ReturnType<typeof createClient>>,
  slotId: string,
  classDate: string
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.startsWith('re_XXX')) return

  const { data: waitlist } = await sb
    .from('waitlist')
    .select('user_id, profiles(full_name)')
    .eq('slot_id', slotId)
    .eq('class_date', classDate)
    .order('created_at')
    .limit(1)

  if (!waitlist?.length) return

  const { data: slot } = await sb
    .from('schedule_slots')
    .select('start_time, class_types(name)')
    .eq('id', slotId)
    .single()

  const className = (slot?.class_types as unknown as { name: string } | null)?.name ?? ''
  const time = slot?.start_time?.slice(0, 5) ?? ''

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Equilibria <onboarding@resend.dev>',
      to: [process.env.ADMIN_EMAIL],
      subject: `Hay una plaza libre — ${className} ${classDate}`,
      html: `<p>Se ha liberado una plaza en <b>${className}</b> el ${classDate} a las ${time}h. Hay alguien en la lista de espera.</p>`,
    }),
  })
}
