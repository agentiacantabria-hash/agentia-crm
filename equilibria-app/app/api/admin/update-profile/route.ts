import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function sanitizePassword(s: string): string {
  return Array.from(s.trim()).filter(c => {
    const code = c.codePointAt(0) ?? 0
    return (code >= 32 && code <= 126) || (code >= 160 && code <= 255)
  }).join('')
}

function sanitizeText(s: string): string {
  return Array.from(s.trim()).filter(c => {
    const code = c.codePointAt(0) ?? 0
    if (code === 0xFEFF || code === 0x00AD) return false
    if (code >= 0x200B && code <= 0x200F) return false
    return code >= 32
  }).join('')
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const raw = await req.json()
  if (!raw.user_id) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 })

  const user_id   = raw.user_id
  const full_name = raw.full_name !== undefined ? sanitizeText(String(raw.full_name))    : undefined
  const username  = raw.username  !== undefined ? sanitizeText(String(raw.username))     : undefined
  const phone     = raw.phone     !== undefined ? sanitizeText(String(raw.phone))        : undefined
  const password  = raw.password  !== undefined ? sanitizePassword(String(raw.password)) : undefined

  const admin = createAdminClient()

  const authUpdates: Record<string, string> = {}
  if (password) authUpdates.password = password
  if (username) authUpdates.email = `${username.toLowerCase().replace(/\s+/g, '')}@equilibria.app`

  if (Object.keys(authUpdates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authUpdates)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profileUpdates: Record<string, unknown> = {}
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (username  !== undefined) profileUpdates.username  = username.toLowerCase().replace(/\s+/g, '') || null
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
