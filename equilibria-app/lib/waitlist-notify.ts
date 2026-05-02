import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications'

/**
 * Notifica a la primera persona en la lista de espera de un slot+fecha
 * que se ha liberado plaza. Idempotente y silencioso ante errores —
 * usar como "best effort" después de cualquier acción que libere aforo
 * (alumna marca falta, admin marca falta, alumna cancela recovery, etc.)
 *
 * RLS de waitlist limita a la sesión propia → necesitamos admin client
 * para ver la cola completa.
 */
export async function notifyFirstInWaitlist(slotId: string, classDate: string): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>
  try { admin = createAdminClient() } catch { return }

  const { data: waitlist } = await admin
    .from('waitlist')
    .select('user_id')
    .eq('slot_id', slotId)
    .eq('class_date', classDate)
    .order('created_at')
    .limit(1)

  if (!waitlist?.length) return
  const firstUserId = (waitlist[0] as { user_id: string }).user_id

  const { data: slot } = await admin
    .from('schedule_slots')
    .select('start_time, class_types(name)')
    .eq('id', slotId)
    .single()

  const className = (slot?.class_types as unknown as { name: string } | null)?.name ?? 'tu clase'
  const time = slot?.start_time?.slice(0, 5) ?? ''
  const dateLabel = new Date(classDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

  await createNotification({
    user_id: firstUserId,
    type: 'waitlist_freed',
    title: `Hay sitio en ${className}`,
    body: `Estabas en la lista de espera de ${dateLabel} a las ${time}h. Entra al horario para reservar tu plaza.`,
    link: '/horario',
  })
}
