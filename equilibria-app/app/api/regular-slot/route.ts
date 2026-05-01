import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, week_parity = 'all' } = await req.json()
  if (!['all', 'even', 'odd'].includes(week_parity)) {
    return NextResponse.json({ error: 'Frecuencia no válida' }, { status: 400 })
  }

  const [{ data: profile }, { data: existingSlots }] = await Promise.all([
    sb.from('profiles').select('plan_id, plans(classes_per_week)').eq('id', user.id).single(),
    sb.from('regular_slots').select('week_parity').eq('user_id', user.id),
  ])

  const maxSlots = (profile?.plans as unknown as { classes_per_week: number } | null)?.classes_per_week ?? 2
  const parities = (existingSlots ?? []).map((s: { week_parity: string }) => s.week_parity)

  // Comprobar que no se supera el límite en ninguna semana tras añadir
  const countOdd  = parities.filter(p => p === 'all' || p === 'odd').length  + (week_parity === 'all' || week_parity === 'odd'  ? 1 : 0)
  const countEven = parities.filter(p => p === 'all' || p === 'even').length + (week_parity === 'all' || week_parity === 'even' ? 1 : 0)

  if (countOdd > maxSlots || countEven > maxSlots) {
    return NextResponse.json({
      error: `Tu plan permite ${maxSlots} clase${maxSlots !== 1 ? 's' : ''} fija${maxSlots !== 1 ? 's' : ''} por semana`,
    }, { status: 409 })
  }

  const { error } = await sb.from('regular_slots').insert({ user_id: user.id, slot_id, week_parity })
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya tienes esta clase en tu horario' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { slot_id, week_parity } = await req.json()
  if (!['all', 'even', 'odd'].includes(week_parity)) {
    return NextResponse.json({ error: 'Frecuencia no válida' }, { status: 400 })
  }

  // Límite del plan excluyendo este slot (que ya existe y se va a reemplazar)
  const [{ data: profile }, { data: existingSlots }] = await Promise.all([
    sb.from('profiles').select('plan_id, plans(classes_per_week)').eq('id', user.id).single(),
    sb.from('regular_slots').select('week_parity').eq('user_id', user.id).neq('slot_id', slot_id),
  ])

  const maxSlots = (profile?.plans as unknown as { classes_per_week: number } | null)?.classes_per_week ?? 2
  const parities = (existingSlots ?? []).map((s: { week_parity: string }) => s.week_parity)

  const countOdd  = parities.filter(p => p === 'all' || p === 'odd').length  + (week_parity === 'all' || week_parity === 'odd'  ? 1 : 0)
  const countEven = parities.filter(p => p === 'all' || p === 'even').length + (week_parity === 'all' || week_parity === 'even' ? 1 : 0)

  if (countOdd > maxSlots || countEven > maxSlots) {
    return NextResponse.json({
      error: `Tu plan permite ${maxSlots} clase${maxSlots !== 1 ? 's' : ''} fija${maxSlots !== 1 ? 's' : ''} por semana`,
    }, { status: 409 })
  }

  const { error } = await sb.from('regular_slots')
    .update({ week_parity })
    .eq('user_id', user.id)
    .eq('slot_id', slot_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
