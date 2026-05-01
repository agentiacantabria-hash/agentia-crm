import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CANCEL_DEADLINE_HOURS } from '@/lib/types'
import { logServerError } from '@/lib/log'

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
  _sb: Awaited<ReturnType<typeof createClient>>,
  slotId: string,
  classDate: string
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.startsWith('re_XXX')) return

  // RLS de waitlist y profiles limita a la sesión propia, así que aquí no
  // sirve el server client. Necesitamos admin para ver toda la cola.
  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return }

  const { data: waitlist } = await admin
    .from('waitlist')
    .select('user_id, profiles(full_name)')
    .eq('slot_id', slotId)
    .eq('class_date', classDate)
    .order('created_at')
    .limit(1)

  if (!waitlist?.length) return
  const first = waitlist[0] as unknown as { user_id: string; profiles: { full_name: string } | null }

  // El email vive en auth.users, no en profiles
  const { data: userData } = await admin.auth.admin.getUserById(first.user_id)
  const email = userData?.user?.email
  if (!email) return

  const { data: slot } = await admin
    .from('schedule_slots')
    .select('start_time, class_types(name)')
    .eq('id', slotId)
    .single()

  const className = (slot?.class_types as unknown as { name: string } | null)?.name ?? ''
  const time = slot?.start_time?.slice(0, 5) ?? ''
  const firstName = first.profiles?.full_name?.split(' ')[0] ?? 'Hola'

  // El sender 'onboarding@resend.dev' es el dominio sandbox de Resend y solo
  // entrega a la cuenta verificada del titular. Para enviar a alumnas reales,
  // verificar dominio propio en https://resend.com/domains y cambiar el `from`.
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Equilibria <onboarding@resend.dev>',
        to: [email],
        bcc: process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : undefined,
        subject: `Hay una plaza libre — ${className} ${classDate}`,
        html: `<p>Hola ${firstName},</p>
<p>Se ha liberado una plaza en <b>${className}</b> el ${classDate} a las ${time}h.</p>
<p>Estabas en la lista de espera. Entra en la app para reservar tu recuperación.</p>
<p style="color:#999;font-size:12px;">— Equilibria</p>`,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logServerError('notifyWaitlist:resend', new Error(`HTTP ${res.status}`), { body, slotId, classDate })
    }
  } catch (e) {
    logServerError('notifyWaitlist:fetch', e, { slotId, classDate })
  }
}
