import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { username, password, full_name, phone, plan_id } = await req.json()
  if (!username || !password || !full_name || !plan_id) {
    return NextResponse.json({ error: 'Faltan campos obligatorios (username, password, full_name, plan_id)' }, { status: 400 })
  }

  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '')
  const email         = `${cleanUsername}@equilibria.app`

  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  // El trigger crea la fila de profile; esperamos y luego la actualizamos
  await new Promise(r => setTimeout(r, 800))

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name, username: cleanUsername, phone: phone || null, plan_id })
    .eq('id', created.user!.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: created.user!.id })
}
