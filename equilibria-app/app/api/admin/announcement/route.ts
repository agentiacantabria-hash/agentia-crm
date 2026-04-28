import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { sb, user: null, error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  const { data } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) return { sb, user: null, error: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  return { sb, user, error: null }
}

export async function POST(req: NextRequest) {
  const { sb, error } = await requireAdmin()
  if (error) return error

  const { emoji, title, body, pinned, expires_at } = await req.json()
  if (!title || !body) return NextResponse.json({ error: 'Título y mensaje son obligatorios' }, { status: 400 })

  const { data, error: dbError } = await sb.from('announcements').insert({
    emoji: emoji || '📢',
    title,
    body,
    pinned: pinned ?? false,
    expires_at: expires_at || null,
  }).select().single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true, announcement: data })
}

export async function PATCH(req: NextRequest) {
  const { sb, error } = await requireAdmin()
  if (error) return error

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const allowed = ['emoji', 'title', 'body', 'pinned', 'is_active', 'expires_at']
  const clean   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const { error: dbError } = await sb.from('announcements').update(clean).eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { sb, error } = await requireAdmin()
  if (error) return error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { error: dbError } = await sb.from('announcements').delete().eq('id', id)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
