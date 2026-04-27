import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id } = await req.json()

  // Verificar límite del plan
  const [{ data: profile }, { count: current }] = await Promise.all([
    sb.from('profiles').select('plan_id, plans(classes_per_week)').eq('id', user.id).single(),
    sb.from('regular_slots').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const maxSlots = (profile?.plans as unknown as { classes_per_week: number } | null)?.classes_per_week ?? 2
  if ((current ?? 0) >= maxSlots) {
    return NextResponse.json({ error: `Tu plan permite ${maxSlots} clase${maxSlots > 1 ? 's' : ''} fija${maxSlots > 1 ? 's' : ''}. Quita una antes de añadir otra.` }, { status: 409 })
  }

  const { error } = await sb.from('regular_slots').insert({ user_id: user.id, slot_id })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya tienes esta clase en tu horario' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id } = await req.json()
  const { error } = await sb.from('regular_slots').delete().eq('user_id', user.id).eq('slot_id', slot_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
