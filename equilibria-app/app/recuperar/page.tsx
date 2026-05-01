'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, startOfMonth, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Plan } from '@/lib/types'
import { parityActive } from '@/lib/parity'
import { maxRecoveriesPerMonth } from '@/lib/plan'
import { toast } from '@/lib/toast'

export default function RecuperarPage() {
  const router = useRouter()
  const [plan, setPlan]               = useState<Plan | null>(null)
  const [scheduleType, setScheduleType] = useState<string | null>(null)
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

    const countsPromise = fetch('/api/horario-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
    }).then(r => r.ok ? r.json() : null).catch(() => null)

    const [
      { data: profile },
      { data: rawSlots },
      counts,
      { data: userRegular },
      { data: userAbsences },
      { data: userRecoveries },
      { count: creditsUsed },
    ] = await Promise.all([
      sb.from('profiles').select('plan_id, schedule_type, plans(*)').eq('id', user.id).single(),
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      countsPromise,
      sb.from('regular_slots').select('slot_id, week_parity').eq('user_id', user.id),
      sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date').eq('user_id', user.id).eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'confirmed').gte('class_date', monthStart),
    ])

    setPlan((profile?.plans as unknown as Plan) ?? null)
    setScheduleType((profile as { schedule_type?: string } | null)?.schedule_type ?? null)
    setUsed(creditsUsed ?? 0)

    setRP(counts?.regularParities ?? {})
    setAC(counts?.absentCounts ?? {})
    setRVC(counts?.recoveryCounts ?? {})
    setCancelled(new Set<string>(counts?.cancelledKeys ?? []))

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

    setSlots((rawSlots ?? []) as ScheduleSlot[])
    setLoading(false)
  }, [dateFrom, dateTo, router])

  useEffect(() => { load() }, [load])

  function getCapacity(slotId: string, dateStr: string, date: Date) {
    const regularCount = (regularParities[slotId] ?? []).filter(p => parityActive(p, date)).length
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
    toast.success(`Reservado · ${slot.class_types.name}`)
    setBookedKey(key)
    setAL(null)
    load()
  }

  const creditsMax  = maxRecoveriesPerMonth(scheduleType, plan)
  const creditsLeft = Math.max(0, creditsMax - usedCredits)
  const isRotating  = scheduleType === 'rotativo'
  const today       = startOfDay(new Date())

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <p className="page-eyebrow">{isRotating ? 'Reservar' : 'Recuperar'}</p>
      <h1 className="page-title">
        {isRotating ? <>Reserva una <em>clase</em></> : <>Recuperar <em>clase</em></>}
      </h1>

      {/* Card de cupo */}
      <div className="card-tint mt-5 mb-6 px-5 py-4" style={{ ['--tint' as string]: '#1E4DB7' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep/70 font-semibold">
          {isRotating ? 'Reservas disponibles' : 'Recuperaciones disponibles'}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <p className="font-display text-3xl font-semibold text-brand-deep tabular-nums leading-none">
            {creditsLeft}
            <span className="text-brand-deep/30 text-2xl">/{creditsMax}</span>
          </p>
          <div className="flex flex-wrap gap-1 flex-1 max-w-[60%]">
            {Array.from({ length: creditsMax || 4 }).map((_, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full transition-all flex-shrink-0"
                style={{ backgroundColor: i < creditsLeft ? '#1E4DB7' : 'rgba(30,77,183,0.15)' }}/>
            ))}
          </div>
        </div>
      </div>

      {creditsLeft === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, rgba(232,200,147,0.25) 0%, transparent 70%)' }}>
            <span className="text-4xl">🎫</span>
          </div>
          <p className="font-display text-xl text-navy mb-1">Sin cupo este mes</p>
          <p className="text-ink/45 text-sm max-w-xs mx-auto">El cupo se renueva el día 1 de cada mes</p>
        </div>
      ) : (
        <>
          {/* Navegación semana */}
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => setWeekStart(d => addDays(d, -7))}
              disabled={!isBefore(today, weekStart)}
              aria-label="Semana anterior"
              className="w-10 h-10 rounded-2xl bg-white border border-ink/5 flex items-center justify-center text-brand text-lg font-semibold shadow-card-soft active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
            >‹</button>
            <span className="flex-1 text-center font-mono text-[11px] text-ink/50 uppercase tracking-widest font-semibold">
              {format(weekStart, "d MMM", { locale: es })} → {format(addDays(weekStart, 4), "d MMM", { locale: es })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              aria-label="Semana siguiente"
              className="w-10 h-10 rounded-2xl bg-white border border-ink/5 flex items-center justify-center text-brand text-lg font-semibold shadow-card-soft active:scale-95 transition-transform">›</button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 animate-fade-in">
              <p className="font-mono text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-5 pb-8">
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
                  const isOwn    = parity !== undefined && parityActive(parity, date)
                  const isAbsent = userAbsentMap[s.id]?.has(dateStr) ?? false
                  return !isOwn || isAbsent
                })
                .sort((a, b) => a.start_time.localeCompare(b.start_time))

              if (!daySlots.length) return null

              return (
                <div key={dateStr} className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-2 px-0.5">
                    <p className="font-mono text-[11px] text-brand-deep tracking-widest font-semibold capitalize">
                      {dayLabel}
                    </p>
                    <span className="flex-1 h-px bg-gradient-to-r from-brand/15 to-transparent"/>
                  </div>
                  <div className="space-y-2">
                    {daySlots.map(slot => {
                      const cap     = getCapacity(slot.id, dateStr, date)
                      const slotMax = slot.max_capacity ?? 7
                      const capNum  = Math.max(0, cap)
                      const full    = capNum >= slotMax
                      const key     = `${slot.id}|${dateStr}`
                      const color   = slot.class_types.color

                      return (
                        <div key={slot.id}
                          className={`card-tint overflow-hidden flex transition-all ${full ? 'opacity-55' : ''}`}
                          style={{ ['--tint' as string]: color }}>
                          <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }}/>
                          <div className="flex-1 px-4 py-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-display font-semibold text-navy text-base tracking-tight">
                                {slot.class_types.name}
                              </p>
                              <p className="font-mono text-[11px] text-ink/55 mt-1 tabular-nums">
                                {slot.start_time.slice(0, 5)}h
                                <span className="mx-1.5 text-ink/30">·</span>
                                <span className={full ? '' : 'font-semibold text-ink/70'}>{capNum}/{slotMax}</span>
                              </p>
                              {bookedKey === key && (
                                <span className="badge badge-success mt-1.5">✓ Reservado</span>
                              )}
                            </div>
                            <button
                              onClick={() => bookRecovery(slot, dateStr)}
                              disabled={full || actionLoading === key}
                              className="flex-shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all active:scale-95
                                disabled:opacity-40 disabled:cursor-not-allowed
                                bg-brand text-paper hover:bg-brand-deep
                                disabled:bg-ink/10 disabled:text-ink/40"
                              style={!full ? { boxShadow: '0 4px 14px rgba(30,77,183,0.28)' } : {}}
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
