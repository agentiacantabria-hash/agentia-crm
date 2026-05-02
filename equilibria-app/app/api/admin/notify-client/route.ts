import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/auth/admin-guard'
import { createNotification } from '@/lib/notifications'

/**
 * POST /api/admin/notify-client
 * Body: { user_id, title, body? }
 * Envía una notificación in-app puntual desde el admin a una clienta.
 */
export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const { user_id, title, body } = await req.json()
  if (!user_id || !title) return NextResponse.json({ error: 'Faltan user_id y/o title' }, { status: 400 })

  await createNotification({
    user_id,
    type: 'announcement',
    title: String(title).slice(0, 120),
    body: body ? String(body).slice(0, 500) : null,
    link: '/avisos',
  })

  return NextResponse.json({ ok: true })
}
