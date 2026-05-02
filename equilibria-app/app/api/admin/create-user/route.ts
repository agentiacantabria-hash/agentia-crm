import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdmin } from '@/lib/auth/admin-guard'

/**
 * Supabase Auth exige que la password sea un ByteString (char codes 0-255).
 * iOS/macOS inyecta U+FEFF (65279) al final de campos de texto, lo que rompe createUser.
 * Filtramos a caracteres ASCII imprimibles (32-126) + Latin-1 (160-255).
 */
function sanitizePassword(s: string): string {
  return Array.from(s.trim()).filter(c => {
    const code = c.codePointAt(0) ?? 0
    return (code >= 32 && code <= 126) || (code >= 160 && code <= 255)
  }).join('')
}

function sanitizeText(s: string): string {
  return Array.from(s.trim()).filter(c => {
    const code = c.codePointAt(0) ?? 0
    // Excluir BOM (65279=0xFEFF), soft-hyphen (173=0x00AD) y zero-width chars (8203-8207)
    if (code === 0xFEFF || code === 0x00AD) return false
    if (code >= 0x200B && code <= 0x200F) return false
    return code >= 32
  }).join('')
}

export async function POST(req: NextRequest) {
  const guard = await assertAdmin()
  if (!guard.ok) return guard.response

  const raw = await req.json()

  const username      = sanitizeText(String(raw.username  ?? ''))
  const password      = sanitizePassword(String(raw.password  ?? ''))
  const full_name     = sanitizeText(String(raw.full_name ?? ''))
  const phone         = raw.phone ? sanitizeText(String(raw.phone)) : null
  const plan_id       = String(raw.plan_id ?? '')
  const schedule_type = ['fijo', 'rotativo'].includes(raw.schedule_type) ? raw.schedule_type : 'fijo'
  const birthday      = typeof raw.birthday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.birthday) ? raw.birthday : null

  if (!username || !password || !full_name || !plan_id) {
    return NextResponse.json({ error: 'Faltan campos obligatorios (username, password, full_name, plan_id)' }, { status: 400 })
  }

  const cleanUsername = username.toLowerCase().replace(/\s+/g, '')
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
    .update({ full_name, username: cleanUsername, phone: phone || null, plan_id, schedule_type, birthday })
    .eq('id', created.user!.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: created.user!.id })
}
