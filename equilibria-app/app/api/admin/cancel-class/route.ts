import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

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

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { slot_id, class_date } = await req.json()
  await sb.from('cancelled_classes').delete().eq('slot_id', slot_id).eq('class_date', class_date)
  return NextResponse.json({ ok: true })
}

async function notifyAffected(
  sb: Awaited<ReturnType<typeof createClient>>,
  slotId: string,
  classDate: string,
  reason: string | null
) {
  const apiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL
  if (!apiKey || apiKey.startsWith('re_XXX') || !adminEmail) return

  const { data: slot } = await sb
    .from('schedule_slots')
    .select('start_time, class_types(name)')
    .eq('id', slotId)
    .single()

  const className = (slot?.class_types as unknown as { name: string } | null)?.name ?? ''
  const time = slot?.start_time?.slice(0, 5) ?? ''
  const reasonText = reason ? ` Motivo: ${reason}.` : ''

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Equilibria <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `[Admin] Clase cancelada — ${className} ${classDate}`,
      html: `<p>La clase de <b>${className}</b> del ${classDate} a las ${time}h ha sido cancelada.${reasonText}</p>`,
    }),
  })
}
