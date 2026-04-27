import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { code, password } = await req.json()
  if (!code || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  // Verificar que el código existe y no ha sido usado
  const sb = await createServerClient()
  const { data: invite, error: inviteError } = await sb
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .eq('is_used', false)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Código inválido o ya utilizado' }, { status: 400 })
  }

  // Crear usuario con service role (sin confirmación de email)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || serviceKey.includes('XXXXXXXXXX')) {
    return NextResponse.json({ error: 'Servidor no configurado aún. Contacta con Equilibria.' }, { status: 503 })
  }

  const adminSb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const email = `${code}@equilibria.app`
  const { data, error: createError } = await adminSb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { invite_code: code },
  })

  if (createError) {
    if (createError.message.includes('already registered')) {
      return NextResponse.json({ error: 'Este código ya tiene una cuenta. Ve a iniciar sesión.' }, { status: 409 })
    }
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Loguear al usuario en la sesión actual
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.json({ error: 'Cuenta creada. Ya puedes iniciar sesión.' }, { status: 201 })
  }

  return NextResponse.json({ ok: true, userId: data.user?.id })
}
