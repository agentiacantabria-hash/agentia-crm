import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { user_id, full_name, username, phone, password } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const admin = createAdminClient()

  // Actualizar auth: contraseña y/o email (derivado del nuevo username)
  const authUpdates: Record<string, string> = {}
  if (password) authUpdates.password = password
  if (username) authUpdates.email    = `${username.trim().toLowerCase().replace(/\s+/g, '')}@equilibria.app`

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authUpdates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profileUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (username  !== undefined) profileUpdates.username  = username.trim().toLowerCase().replace(/\s+/g, '') || null
  if (phone     !== undefined) profileUpdates.phone     = phone || null

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdates).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
