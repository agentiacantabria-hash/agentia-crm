import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { code, full_name, phone, plan_id } = await req.json()
  if (!code || !full_name || !plan_id) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const cleanCode = code.trim().toLowerCase()

  const { error } = await sb.from('invite_codes').insert({
    code: cleanCode, full_name, phone: phone || null, plan_id,
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: `El código "${cleanCode}" ya existe` }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, code: cleanCode })
}
