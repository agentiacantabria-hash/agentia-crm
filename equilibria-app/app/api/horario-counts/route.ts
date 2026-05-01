import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Devuelve agregados de aforo por (slot_id, class_date) para una ventana
// de fechas. Usa admin client para esquivar las policies RLS de
// regular_slots/absences/recovery_bookings/waitlist (que limitan al
// usuario propio) y así obtener los conteos reales que necesita el
// horario para mostrar capacidad correcta a todas las alumnas.
//
// Solo expone agregados — nunca user_id u otra información identificable.
export async function POST(req: NextRequest) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const dateFrom: string | undefined = body?.date_from
  const dateTo:   string | undefined = body?.date_to
  if (!dateFrom || !dateTo || !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return NextResponse.json({ error: 'date_from / date_to inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [
    { data: regularAll },
    { data: absencesAll },
    { data: recoveriesAll },
    { data: waitlistAll },
    { data: cancelledAll },
  ] = await Promise.all([
    admin.from('regular_slots').select('slot_id, week_parity'),
    admin.from('absences').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
    admin.from('recovery_bookings').select('slot_id, class_date').eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
    admin.from('waitlist').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
    admin.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
  ])

  const regularParities: Record<string, string[]> = {}
  for (const r of (regularAll ?? []) as { slot_id: string; week_parity: string }[]) {
    (regularParities[r.slot_id] ??= []).push(r.week_parity)
  }

  const absentCounts:   Record<string, Record<string, number>> = {}
  const recoveryCounts: Record<string, Record<string, number>> = {}
  const waitlistCounts: Record<string, Record<string, number>> = {}

  for (const a of (absencesAll ?? []) as { slot_id: string; class_date: string }[]) {
    (absentCounts[a.slot_id] ??= {})[a.class_date] = (absentCounts[a.slot_id][a.class_date] ?? 0) + 1
  }
  for (const r of (recoveriesAll ?? []) as { slot_id: string; class_date: string }[]) {
    (recoveryCounts[r.slot_id] ??= {})[r.class_date] = (recoveryCounts[r.slot_id][r.class_date] ?? 0) + 1
  }
  for (const w of (waitlistAll ?? []) as { slot_id: string; class_date: string }[]) {
    (waitlistCounts[w.slot_id] ??= {})[w.class_date] = (waitlistCounts[w.slot_id][w.class_date] ?? 0) + 1
  }

  const cancelledKeys = ((cancelledAll ?? []) as { slot_id: string; class_date: string }[])
    .map(c => `${c.slot_id}|${c.class_date}`)

  return NextResponse.json({
    regularParities,
    absentCounts,
    recoveryCounts,
    waitlistCounts,
    cancelledKeys,
  })
}
