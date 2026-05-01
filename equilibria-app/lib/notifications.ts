import { createAdminClient } from '@/lib/supabase/admin'
import { logServerError } from '@/lib/log'

export type NotificationType =
  | 'waitlist_freed'
  | 'class_cancelled'
  | 'announcement'

export interface NotificationInput {
  user_id: string
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}

/**
 * Inserta una notificación in-app para un usuario. Usa el admin client
 * (service role) porque no hay policy de INSERT en `notifications` —
 * eso evita que un usuario pueda crear notificaciones a otros.
 *
 * Idempotente desde el punto de vista del caller: si falla, se logea pero
 * no lanza. Las notificaciones son "best effort", no debe romper el flujo
 * de la operación principal (marcar falta, cancelar clase, etc.).
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('notifications').insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })
    if (error) logServerError('createNotification', error, { input })
  } catch (e) {
    logServerError('createNotification:throw', e, { input })
  }
}

/** Versión bulk para notificar a varios usuarios con el mismo contenido. */
export async function createNotifications(
  user_ids: string[],
  notif: Omit<NotificationInput, 'user_id'>,
): Promise<void> {
  if (!user_ids.length) return
  try {
    const admin = createAdminClient()
    const rows = user_ids.map((user_id) => ({
      user_id,
      type: notif.type,
      title: notif.title,
      body: notif.body ?? null,
      link: notif.link ?? null,
    }))
    const { error } = await admin.from('notifications').insert(rows)
    if (error) logServerError('createNotifications', error, { count: user_ids.length, type: notif.type })
  } catch (e) {
    logServerError('createNotifications:throw', e, { count: user_ids.length })
  }
}
