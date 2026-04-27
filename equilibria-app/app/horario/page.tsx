'use client'
import { useEffect, useState, useCallback } from 'react'
import { format, addDays, startOfWeek, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot } from '@/lib/types'
import { MAX_CAPACITY, DAY_SHORT } from '@/lib/types'
import SlotModal from '@/components/SlotModal'

export type SlotInfo = {
  slot: ScheduleSlot
  date: Date
  capacity: number          // personas que van
  isUserRegular: boolean    // es clase fija del usuario
  isUserAbsent: boolean     // ha marcado falta ese día
  isUserRecovery: boolean   // tiene recuperación aquí
  isUserWaitlist: boolean   // está en lista de espera
  isCancelled: boolean      // cancelada por admin
  waitlistCount: number
}

export default function HorarioPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [slots, setSlots]     = useState<ScheduleSlot[]>([])
  const [selected, setSelected] = useState<SlotInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Contadores indexados por slot_id → date → count
  const [regularCounts,  setRegularCounts]  = useState<Record<string, number>>({})
  const [absentCounts,   setAbsentCounts]   = useState<Record<string, Record<string, number>>>({})
  const [recoveryCounts, setRecoveryCounts] = useState<Record<string, Record<string, number>>>({})
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, Record<string, number>>>({})
  const [cancelledSet,   setCancelledSet]   = useState<Set<string>>(new Set())

  // Estado del usuario
  const [userRegularIds,  setUserRegularIds]  = useState<Set<string>>(new Set())
  const [userAbsentMap,   setUserAbsentMap]   = useState<Record<string, Set<string>>>({})
  const [userRecoveryMap, setUserRecoveryMap] = useState<Record<string, Set<string>>>({})
  const [userWaitlistMap, setUserWaitlistMap] = useState<Record<string, Set<string>>>({})

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const dateFrom = format(weekStart, 'yyyy-MM-dd')
  const dateTo   = format(addDays(weekStart, 4), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()

    const [
      { data: rawSlots },
      { data: regularAll },
      { data: absencesAll },
      { data: recoveriesAll },
      { data: waitlistAll },
      { data: cancelledAll },
      { data: userRegular },
      { data: userAbsences },
      { data: userRecoveries },
      { data: userWaitlist },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id'),
      sb.from('absences').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date').eq('status','confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('waitlist').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
      user ? sb.from('regular_slots').select('slot_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      user ? sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
      user ? sb.from('recovery_bookings').select('slot_id, class_date').eq('user_id', user.id).eq('status','confirmed').gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
      user ? sb.from('waitlist').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
    ])

    // Construir contadores globales
    const rc: Record<string, number> = {}
    ;(regularAll ?? []).forEach((r: { slot_id: string }) => { rc[r.slot_id] = (rc[r.slot_id] ?? 0) + 1 })
    setRegularCounts(rc)

    const ac: Record<string, Record<string, number>> = {}
    ;(absencesAll ?? []).forEach((a: { slot_id: string; class_date: string }) => {
      ac[a.slot_id] ??= {}; ac[a.slot_id][a.class_date] = (ac[a.slot_id][a.class_date] ?? 0) + 1
    })
    setAbsentCounts(ac)

    const rvc: Record<string, Record<string, number>> = {}
    ;(recoveriesAll ?? []).forEach((r: { slot_id: string; class_date: string }) => {
      rvc[r.slot_id] ??= {}; rvc[r.slot_id][r.class_date] = (rvc[r.slot_id][r.class_date] ?? 0) + 1
    })
    setRecoveryCounts(rvc)

    const wlc: Record<string, Record<string, number>> = {}
    ;(waitlistAll ?? []).forEach((w: { slot_id: string; class_date: string }) => {
      wlc[w.slot_id] ??= {}; wlc[w.slot_id][w.class_date] = (wlc[w.slot_id][w.class_date] ?? 0) + 1
    })
    setWaitlistCounts(wlc)

    const cc = new Set<string>((cancelledAll ?? []).map((c: { slot_id: string; class_date: string }) => `${c.slot_id}|${c.class_date}`))
    setCancelledSet(cc)

    // Estado del usuario
    setUserRegularIds(new Set((userRegular ?? []).map((r: { slot_id: string }) => r.slot_id)))

    const uam: Record<string, Set<string>> = {}
    ;(userAbsences ?? []).forEach((a: { slot_id: string; class_date: string }) => {
      uam[a.slot_id] ??= new Set(); uam[a.slot_id].add(a.class_date)
    })
    setUserAbsentMap(uam)

    const urm: Record<string, Set<string>> = {}
    ;(userRecoveries ?? []).forEach((r: { slot_id: string; class_date: string }) => {
      urm[r.slot_id] ??= new Set(); urm[r.slot_id].add(r.class_date)
    })
    setUserRecoveryMap(urm)

    const uwm: Record<string, Set<string>> = {}
    ;(userWaitlist ?? []).forEach((w: { slot_id: string; class_date: string }) => {
      uwm[w.slot_id] ??= new Set(); uwm[w.slot_id].add(w.class_date)
    })
    setUserWaitlistMap(uwm)

    setSlots((rawSlots ?? []) as ScheduleSlot[])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  function getCapacity(slotId: string, dateStr: string) {
    return (regularCounts[slotId] ?? 0)
      - (absentCounts[slotId]?.[dateStr] ?? 0)
      + (recoveryCounts[slotId]?.[dateStr] ?? 0)
  }

  const times   = [...new Set(slots.map(s => s.start_time))].sort()
  const today   = startOfDay(new Date())

  function handleCell(slot: ScheduleSlot, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSelected({
      slot,
      date,
      capacity: getCapacity(slot.id, dateStr),
      isUserRegular:   userRegularIds.has(slot.id),
      isUserAbsent:    userAbsentMap[slot.id]?.has(dateStr)   ?? false,
      isUserRecovery:  userRecoveryMap[slot.id]?.has(dateStr) ?? false,
      isUserWaitlist:  userWaitlistMap[slot.id]?.has(dateStr) ?? false,
      isCancelled:     cancelledSet.has(`${slot.id}|${dateStr}`),
      waitlistCount:   waitlistCounts[slot.id]?.[dateStr] ?? 0,
    })
  }

  return (
    <div className="max-w-lg mx-auto px-3 pt-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Horario</p>
          <h1 className="font-display font-bold text-xl text-navy leading-tight">
            {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 4), "d MMM", { locale: es })}
          </h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setWeekStart(d => addDays(d, -7))}
            className="w-8 h-8 rounded-full bg-paper-2 flex items-center justify-center text-navy font-bold text-sm">‹</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-2.5 h-8 rounded-full bg-paper-2 text-navy font-mono text-[9px] uppercase tracking-wider">Hoy</button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="w-8 h-8 rounded-full bg-paper-2 flex items-center justify-center text-navy font-bold text-sm">›</button>
        </div>
      </div>

      {/* Días */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {weekDays.map((day, i) => {
          const isToday = format(day,'yyyy-MM-dd') === format(new Date(),'yyyy-MM-dd')
          return (
            <div key={i} className={`text-center py-1.5 rounded-xl ${isToday ? 'bg-navy text-paper' : ''}`}>
              <div className="font-mono text-[8px] uppercase tracking-wider opacity-50">{DAY_SHORT[i+1]}</div>
              <div className="font-display font-bold text-sm">{format(day,'d')}</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          {times.map(time => {
            const slotsAtTime = slots.filter(s => s.start_time === time)
            return (
              <div key={time}>
                <div className="font-mono text-[9px] text-ink/30 uppercase tracking-widest mb-1">{time.slice(0,5)}</div>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5].map(dow => {
                    const date    = weekDays[dow - 1]
                    const dateStr = format(date, 'yyyy-MM-dd')
                    const isPast  = isBefore(date, today)
                    const daySlots = slotsAtTime.filter(s => s.day_of_week === dow)
                    if (!daySlots.length) return <div key={dow}/>
                    return (
                      <div key={dow} className="flex flex-col gap-1">
                        {daySlots.map(slot => {
                          const cap       = getCapacity(slot.id, dateStr)
                          const full      = cap >= MAX_CAPACITY
                          const cancelled = cancelledSet.has(`${slot.id}|${dateStr}`)
                          const isRegular = userRegularIds.has(slot.id)
                          const isAbsent  = userAbsentMap[slot.id]?.has(dateStr) ?? false
                          const isRecovery= userRecoveryMap[slot.id]?.has(dateStr) ?? false

                          return (
                            <button
                              key={slot.id}
                              onClick={() => handleCell(slot, date)}
                              className={`w-full rounded-lg p-1.5 text-left transition-all active:scale-95
                                ${cancelled ? 'opacity-20 line-through' : ''}
                                ${isPast && !cancelled ? 'opacity-30' : ''}
                                ${isRegular && !isAbsent ? 'ring-2 ring-navy ring-offset-1' : ''}
                                ${isAbsent ? 'opacity-40' : ''}
                                ${isRecovery ? 'ring-2 ring-blue ring-offset-1' : ''}
                              `}
                              style={{ backgroundColor: slot.class_types.color }}
                            >
                              <div className="text-[9px] font-bold text-ink/80 leading-tight truncate">
                                {slot.class_types.name}
                              </div>
                              <div className="font-mono text-[8px] mt-0.5 text-ink/50">
                                {cancelled ? '✕' : isAbsent ? 'falta' : `${Math.max(0, cap)}/${MAX_CAPACITY}`}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <SlotModal info={selected} onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); load() }}/>
      )}
    </div>
  )
}
