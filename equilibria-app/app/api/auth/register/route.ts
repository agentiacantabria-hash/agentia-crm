import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { code, password } = await req.json()
  if (!code || !password) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const cleanCode = code.trim().toLowerCase()

  // Delegar la creación del usuario a la Edge Function (tiene service role built-in)
  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register`
  const fnRes = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ code: cleanCode, password }),
  })

  const json = await fnRes.json()
  if (!fnRes.ok) return NextResponse.json({ error: json.error ?? 'Error al crear cuenta' }, { status: fnRes.status })

  // Iniciar sesión automáticamente tras el registro
  const sb = await createClient()
  const email = `${cleanCode}@equilibria.app`
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password })
  if (signInError) {
    return NextResponse.json({ error: 'Cuenta creada. Ya puedes iniciar sesión.' }, { status: 201 })
  }

  return NextResponse.json({ ok: true })
}
