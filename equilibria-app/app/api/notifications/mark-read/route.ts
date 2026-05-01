import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Marca notificaciones como leídas. Acepta:
 * - { id: "..." }     → solo esa notificación
 * - { all: true }     → todas las del usuario que aún están sin leer
 *
 * RLS: la policy de UPDATE en `notifications` ya garantiza que solo se
 * modifiquen las del propio usuario.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  if (body.all === true) {
    const { error } = await sb.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (typeof body.id === 'string') {
    const { error } = await sb.from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Falta id o all=true' }, { status: 400 })
}
