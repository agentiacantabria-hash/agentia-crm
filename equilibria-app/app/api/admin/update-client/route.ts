import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'
import { broadcastScheduleChange } from '@/lib/schedule-events'

/**
 * PATCH /api/admin/update-client — actualiza datos de cliente con
 * gating de coherencia:
 *
 * - Si cambias plan a uno con menos `classes_per_week` que las
 *   clases fijas actuales de la alumna en cualquier semana (par o
 *   impar), devolvemos 409 con detalle. El admin tiene que quitar
 *   regulares antes de cambiar el plan, o pasar `force: true`.
 *
 * - Si cambias schedule_type 'fijo' → 'rotativo', borramos
 *   automáticamente todas las regular_slots del cliente porque el
 *   rotativo no tiene clases fijas. Notificamos a la alumna.
 */
export async function PATCH(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response
  const { sb } = guard

  const { user_id, payment_status, last_payment_date, notes, plan_id, schedule_type, force } =
    await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const admin = createAdminClient()

  // Estado actual del cliente y regulares (admin client porque la
  // sesión actual NO ve las regulars de otra alumna por RLS)
  const [{ data: profile }, { data: regulars }] = await Promise.all([
    admin.from('profiles').select('plan_id, schedule_type, plans(classes_per_week)').eq('id', user_id).single(),
    admin.from('regular_slots').select('id').eq('user_id', user_id),
  ])

  const currentPlan = (profile?.plans as unknown as { classes_per_week: number } | null) ?? null
  const currentScheduleType = (profile as { schedule_type?: string } | null)?.schedule_type ?? null

  // Gating: si baja classes_per_week por debajo de las regulares actuales
  if (plan_id && plan_id !== profile?.plan_id && !force) {
    const { data: newPlan } = await admin.from('plans').select('classes_per_week, name').eq('id', plan_id).single()
    if (newPlan && regulars && regulars.length) {
      const cpw = (newPlan as { classes_per_week: number }).classes_per_week
      const total = regulars.length
      if (total > cpw) {
        return NextResponse.json({
          error: `Esta clienta tiene ${total} clase${total !== 1 ? 's' : ''} fija${total !== 1 ? 's' : ''} a la semana, pero el plan "${(newPlan as { name: string }).name}" solo permite ${cpw}. Retira ${total - cpw} clase${total - cpw !== 1 ? 's' : ''} primero.`,
          code: 'plan_conflict',
        }, { status: 409 })
      }
    }
  }

  // Aplicar update del profile
  const updates: Record<string, unknown> = {}
  if (payment_status    !== undefined) updates.payment_status    = payment_status
  if (last_payment_date !== undefined) updates.last_payment_date = last_payment_date || null
  if (notes             !== undefined) updates.notes             = notes || null
  if (plan_id           !== undefined) updates.plan_id           = plan_id
  if (schedule_type     !== undefined && ['fijo', 'rotativo'].includes(schedule_type)) updates.schedule_type = schedule_type

  const { error } = await sb.from('profiles').update(updates).eq('id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Limpieza si pasa fijo → rotativo
  let cleanedCount = 0
  if (schedule_type === 'rotativo' && currentScheduleType === 'fijo' && regulars && regulars.length) {
    const ids = (regulars as { id: string }[]).map(r => r.id)
    const { error: delErr } = await admin.from('regular_slots').delete().in('id', ids)
    if (!delErr) {
      cleanedCount = ids.length
      await createNotification({
        user_id,
        type: 'announcement',
        title: 'Tu horario ha cambiado',
        body: `Ahora tienes plan rotativo. Hemos retirado tus ${cleanedCount} clase${cleanedCount !== 1 ? 's' : ''} fija${cleanedCount !== 1 ? 's' : ''} y puedes reservar puntualmente cada semana desde el horario.`,
        link: '/horario',
      })
      await broadcastScheduleChange({})
    }
  }

  // Si solo bajó el plan (con force=true) sin cambiar schedule_type:
  // notificamos genéricamente para que la alumna sepa que cambió
  if (plan_id && plan_id !== profile?.plan_id && cleanedCount === 0) {
    const newCpw = (await admin.from('plans').select('classes_per_week').eq('id', plan_id).single()).data?.classes_per_week
    const oldCpw = currentPlan?.classes_per_week
    if (newCpw && oldCpw && newCpw !== oldCpw) {
      await createNotification({
        user_id,
        type: 'announcement',
        title: 'Plan actualizado',
        body: `Tu plan ahora es de ${newCpw} clase${newCpw !== 1 ? 's' : ''} por semana.`,
        link: '/perfil',
      })
    }
  }

  return NextResponse.json({ ok: true, cleanedRegulars: cleanedCount })
}

