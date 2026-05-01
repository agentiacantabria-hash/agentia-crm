'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, startOfMonth, isBefore, startOfDay, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Plan } from '@/lib/types'
import { MAX_CAPACITY } from '@/lib/types'

export default function RecuperarPage() {
  const router = useRouter()
  const [plan, setPlan]               = useState<Plan | null>(null)
  const [usedCredits, setUsed]        = useState(0)
  const [weekStart, setWeekStart]     = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [slots, setSlots]             = useState<ScheduleSlot[]>([])
  const [regularParities, setRP]      = useState<Record<string, string[]>>({})
  const [absentCounts, setAC]         = useState<Record<string, Record<string, number>>>({})
  const [recoveryCounts, setRVC]      = useState<Record<string, Record<string, number>>>({})
  const [userRegularMap, setURMap]    = useState<Map<string, string>>(new Map())
  const [userAbsentMap, setUAM]       = useState<Record<string, Set<string>>>({})
  const [userRecoveryMap, setURM]     = useState<Record<string, Set<string>>>({})
  const [cancelledSet, setCancelled]  = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [actionLoading, setAL]        = useState<string | null>(null)
  const [error, setError]             = useState('')
  const [bookedKey, setBookedKey]     = useState<string | null>(null)

  const dateFrom = format(weekStart, 'yyyy-MM-dd')
  const dateTo   = format(addDays(weekStart, 4), 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    const [
      { data: profile },
      { data: rawSlots },
      { data: allRegular },
      { data: absencesAll },
      { data: recoveriesAll },
      { data: userRegular },
      { data: userAbsences },
      { data: userRecoveries },
      { data: cancelledAll },
      { count: creditsUsed },
    ] = await Promise.all([
      sb.from('profiles').select('plan_id, plans(*)').eq('id', user.id).single(),
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, week_parity'),
      sb.from('absences').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date').eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('regular_slots').select('slot_id, week_parity').eq('user_id', user.id),
      sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date').eq('user_id', user.id).eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed').gte('class_date', monthStart),
    ])

    setPlan((profile?.plans as unknown as Plan) ?? null)
    setUsed(creditsUsed ?? 0)

    const rp: Record<string, string[]> = {}
    ;(allRegular ?? []).forEach((r: { slot_id: string; week_parity: string }) => {
      rp[r.slot_id] ??= []; rp[r.slot_id].push(r.week_parity)
    })
    setRP(rp)

    const ac: Record<string, Record<string, number>> = {}
    ;(absencesAll ?? []).forEach((a: { slot_id: string; class_date: string }) => {
      ac[a.slot_id] ??= {}; ac[a.slot_id][a.class_date] = (ac[a.slot_id][a.class_date] ?? 0) + 1
    })
    setAC(ac)

    const rvc: Record<string, Record<string, number>> = {}
    ;(recoveriesAll ?? []).forEach((r: { slot_id: string; class_date: string }) => {
      rvc[r.slot_id] ??= {}; rvc[r.slot_id][r.class_date] = (rvc[r.slot_id][r.class_date] ?? 0) + 1
    })
    setRVC(rvc)

    const urmReg = new Map<string, string>()
    ;(userRegular ?? []).forEach((r: { slot_id: string; week_parity: string }) => urmReg.set(r.slot_id, r.week_parity))
    setURMap(urmReg)

    const uam: Record<string, Set<string>> = {}
    ;(userAbsences ?? []).forEach((a: { slot_id: string; class_date: string }) => {
      uam[a.slot_id] ??= new Set(); uam[a.slot_id].add(a.class_date)
    })
    setUAM(uam)

    const urmRec: Record<string, Set<string>> = {}
    ;(userRecoveries ?? []).forEach((r: { slot_id: string; class_date: string }) => {
      urmRec[r.slot_id] ??= new Set(); urmRec[r.slot_id].add(r.class_date)
    })
    setURM(urmRec)

    setCancelled(new Set((cancelledAll ?? []).map((c: { slot_id: string; class_date: string }) => `${c.slot_id}|${c.class_date}`)))
    setSlots((rawSlots ?? []) as ScheduleSlot[])
    setLoading(false)
  }, [dateFrom, dateTo, router])

  useEffect(() => { load() }, [load])

  function getCapacity(slotId: string, dateStr: string, date: Date) {
    const weekIsEven = getISOWeek(date) % 2 === 0
    const regularCount = (regularParities[slotId] ?? [])
      .filter(p => p === 'all' || (p === 'even') === weekIsEven).length
    return regularCount
      - (absentCounts[slotId]?.[dateStr] ?? 0)
      + (recoveryCounts[slotId]?.[dateStr] ?? 0)
  }

  async function bookRecovery(slot: ScheduleSlot, dateStr: string) {
    const key = `${slot.id}|${dateStr}`
    setAL(key); setError(''); setBookedKey(null)
    const res = await fetch('/api/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.id, class_date: dateStr }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setAL(null); return }
    setBookedKey(key)
    setAL(null)
    load()
  }

  const creditsMax  = plan?.max_recoveries_per_month ?? 0
  const creditsLeft = Math.max(0, creditsMax - usedCredits)
  const today       = startOfDay(new Date())

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Recuperaciones</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-1">Recuperar clase</h1>

      {/* Badge créditos */}
      <div className="mb-6">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold
          ${creditsLeft > 0 ? 'bg-blue/10 text-blue' : 'bg-ink/8 text-ink/40'}`}>
          <span>{creditsLeft}/{creditsMax}</span>
          <span className="font-normal">recuperaciones disponibles este mes</span>
        </div>
      </div>

      {creditsLeft === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎫</p>
          <p className="font-display font-bold text-xl text-navy mb-2">Sin créditos este mes</p>
          <p className="text-ink/40 text-sm">Los créditos se renuevan el 1 de cada mes</p>
        </div>
      ) : (
        <>
          {/* Navegación semana */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => setWeekStart(d => addDays(d, -7))}
              disabled={!isBefore(today, weekStart)}
              className="w-9 h-9 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-navy font-bold shadow-sm active:scale-95 transition-transform disabled:opacity-30"
            >‹</button>
            <span className="flex-1 text-center font-mono text-xs text-ink/50">
              {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 4), "d MMM", { locale: es })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              className="w-9 h-9 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-navy font-bold shadow-sm active:scale-95 transition-transform">›</button>
          </div>

          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{error}</p>}

          <div className="space-y-5 pb-6">
            {weekDays.map((date, i) => {
              const dateStr = format(date, 'yyyy-MM-dd')
              if (isBefore(date, today)) return null

              const dayLabel = format(date, "EEEE d", { locale: es })
              const dow = i + 1

              const daySlots = slots
                .filter(s => s.day_of_week === dow)
                .filter(s => !cancelledSet.has(`${s.id}|${dateStr}`))
                .filter(s => !userRecoveryMap[s.id]?.has(dateStr))
                .filter(s => {
                  const parity   = userRegularMap.get(s.id)
                  const weekIsEven = getISOWeek(date) % 2 === 0
                  const isOwn    = parity !== undefined && (parity === 'all' || (parity === 'even') === weekIsEven)
                  const isAbsent = userAbsentMap[s.id]?.has(dateStr) ?? false
                  return !isOwn || isAbsent
                })
                .sort((a, b) => a.start_time.localeCompare(b.start_time))

              if (!daySlots.length) return null

              return (
                <div key={dateStr}>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2 capitalize">
                    {dayLabel}
                  </p>
                  <div className="space-y-2">
                    {daySlots.map(slot => {
                      const cap  = getCapacity(slot.id, dateStr, date)
                      const full = cap >= MAX_CAPACITY
                      const key  = `${slot.id}|${dateStr}`

                      return (
                        <div key={slot.id} className={`card overflow-hidden flex ${full ? 'opacity-50' : ''}`}>
                          <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: slot.class_types.color }}/>
                          <div className="flex-1 px-4 py-4 flex items-center justify-between">
                            <div>
                              <p className="font-display font-bold text-navy">{slot.class_types.name}</p>
                              <p className="font-mono text-[10px] text-ink/40 uppercase tracking-wider mt-0.5">
                                {slot.start_time.slice(0, 5)}h · {Math.max(0, cap)}/{MAX_CAPACITY} plazas
                              </p>
                              {bookedKey === key && (
                                <span className="inline-block mt-1 text-[10px] font-mono text-green-600 uppercase tracking-wider">✓ Reservado</span>
                              )}
                            </div>
                            <button
                              onClick={() => bookRecovery(slot, dateStr)}
                              disabled={full || actionLoading === key}
                              className="text-xs font-mono px-3 py-2 rounded-xl bg-blue/10 text-blue disabled:opacity-40 font-bold"
                            >
                              {actionLoading === key ? '…' : full ? 'Llena' : 'Reservar'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
