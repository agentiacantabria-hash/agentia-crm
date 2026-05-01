import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Guard para rutas API de administrador. Garantiza que la sesión existe
 * y que el perfil tiene `is_admin = true`. Devuelve `{ ok: true, sb, user }`
 * o `{ ok: false, response }` listo para retornar desde el handler.
 *
 * Uso:
 *   const guard = await assertAdmin()
 *   if (!guard.ok) return guard.response
 *   const { sb, user } = guard
 */
export async function assertAdmin(): Promise<
  | { ok: true; sb: ServerClient; user: User }
  | { ok: false; response: NextResponse }
> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) {
    return { ok: false, response: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  }
  return { ok: true, sb, user }
}
