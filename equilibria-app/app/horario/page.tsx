'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { format, addDays, startOfWeek, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Announcement } from '@/lib/types'
import { DAY_SHORT } from '@/lib/types'
import { parityActive } from '@/lib/parity'
import SlotModal from '@/components/SlotModal'

export type SlotInfo = {
  slot: ScheduleSlot
  date: Date
  capacity: number
  regularCount: number              // activos esta semana (antes de ausencias/recuperaciones)
  isUserRegular: boolean            // fijo Y paridad activa esta semana
  userRegularParity: string | null  // paridad si tiene entrada (cualquier semana)
  isUserAbsent: boolean
  isUserRecovery: boolean
  isUserWaitlist: boolean
  isCancelled: boolean
  waitlistCount: number
  isRotating: boolean
}

export default function HorarioPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [slots, setSlots]             = useState<ScheduleSlot[]>([])
  const [selected, setSelected]       = useState<SlotInfo | null>(null)
  const [loading, setLoading]         = useState(true)
  const [isAdmin, setIsAdmin]         = useState(false)
  const [isRotating, setIsRotating]   = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())

  // Contadores globales: slot_id → lista de week_parity de cada alumno fijo
  const [regularParities,  setRegularParities]  = useState<Record<string, string[]>>({})
  const [absentCounts,     setAbsentCounts]     = useState<Record<string, Record<string, number>>>({})
  const [recoveryCounts,   setRecoveryCounts]   = useState<Record<string, Record<string, number>>>({})
  const [waitlistCounts,   setWaitlistCounts]   = useState<Record<string, Record<string, number>>>({})
  const [cancelledSet,     setCancelledSet]     = useState<Set<string>>(new Set())

  // Estado del usuario: slot_id → week_parity (o undefined si no es fijo)
  const [userRegularMap,  setUserRegularMap]  = useState<Map<string, string>>(new Map())
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

    if (user) {
      sb.from('profiles').select('is_admin, schedule_type').eq('id', user.id).single()
        .then(({ data }) => {
          setIsAdmin(data?.is_admin ?? false)
          setIsRotating(data?.schedule_type === 'rotativo')
        })
    }

    // Conteos GLOBALES → endpoint server-side con admin client (saltarse RLS).
    // Datos PROPIOS del usuario → queries directas con RLS (filtran a su id).
    const countsPromise = fetch('/api/horario-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
    }).then(r => r.ok ? r.json() : null).catch(() => null)

    const [
      { data: rawSlots },
      counts,
      { data: userRegular },
      { data: userAbsences },
      { data: userRecoveries },
      { data: userWaitlist },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      countsPromise,
      user ? sb.from('regular_slots').select('slot_id, week_parity').eq('user_id', user.id) : Promise.resolve({ data: [] }),
      user ? sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
      user ? sb.from('recovery_bookings').select('slot_id, class_date').eq('user_id', user.id).eq('status','confirmed').gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
      user ? sb.from('waitlist').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo) : Promise.resolve({ data: [] }),
    ])

    setRegularParities(counts?.regularParities ?? {})
    setAbsentCounts(counts?.absentCounts ?? {})
    setRecoveryCounts(counts?.recoveryCounts ?? {})
    setWaitlistCounts(counts?.waitlistCounts ?? {})
    setCancelledSet(new Set<string>(counts?.cancelledKeys ?? []))

    // Mapa usuario: slot_id → week_parity
    const urm = new Map<string, string>()
    ;(userRegular ?? []).forEach((r: { slot_id: string; week_parity: string }) => {
      urm.set(r.slot_id, r.week_parity)
    })
    setUserRegularMap(urm)

    const uam: Record<string, Set<string>> = {}
    ;(userAbsences ?? []).forEach((a: { slot_id: string; class_date: string }) => {
      uam[a.slot_id] ??= new Set(); uam[a.slot_id].add(a.class_date)
    })
    setUserAbsentMap(uam)

    const urvm: Record<string, Set<string>> = {}
    ;(userRecoveries ?? []).forEach((r: { slot_id: string; class_date: string }) => {
      urvm[r.slot_id] ??= new Set(); urvm[r.slot_id].add(r.class_date)
    })
    setUserRecoveryMap(urvm)

    const uwm: Record<string, Set<string>> = {}
    ;(userWaitlist ?? []).forEach((w: { slot_id: string; class_date: string }) => {
      uwm[w.slot_id] ??= new Set(); uwm[w.slot_id].add(w.class_date)
    })
    setUserWaitlistMap(uwm)

    setSlots((rawSlots ?? []) as ScheduleSlot[])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  // Realtime: recargar cuando cambia cualquier dato del horario
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel('horario-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regular_slots' },     () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' },          () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recovery_bookings' }, () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' },          () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancelled_classes' }, () => loadRef.current())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])

  // Cargar anuncios activos + dismissed de localStorage
  useEffect(() => {
    const sb = createClient()
    sb.from('announcements').select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => setAnnouncements((data ?? []) as Announcement[]))
    try {
      const stored = JSON.parse(localStorage.getItem('eq_dismissed') ?? '[]')
      setDismissed(new Set(stored))
    } catch {}
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed).add(id)
    setDismissed(next)
    localStorage.setItem('eq_dismissed', JSON.stringify([...next]))
  }

  const visibleAnnouncements = announcements.filter(a => a.pinned || !dismissed.has(a.id))

  function getCapacity(slotId: string, dateStr: string, date: Date) {
    const parities = regularParities[slotId] ?? []
    const regularCount = parities.filter(p => parityActive(p, date)).length
    return regularCount
      - (absentCounts[slotId]?.[dateStr] ?? 0)
      + (recoveryCounts[slotId]?.[dateStr] ?? 0)
  }

  const times = [...new Set(slots.map(s => s.start_time))].sort()
  const today = startOfDay(new Date())

  function handleCell(slot: ScheduleSlot, date: Date) {
    const dateStr         = format(date, 'yyyy-MM-dd')
    const userParity      = userRegularMap.get(slot.id) ?? null
    const isUserRegular   = userParity !== null && parityActive(userParity, date)
    const regularCount    = (regularParities[slot.id] ?? []).filter(p => parityActive(p, date)).length

    setSelected({
      slot,
      date,
      capacity:           getCapacity(slot.id, dateStr, date),
      regularCount,
      isUserRegular,
      userRegularParity:  userParity,
      isUserAbsent:       userAbsentMap[slot.id]?.has(dateStr)   ?? false,
      isUserRecovery:     userRecoveryMap[slot.id]?.has(dateStr) ?? false,
      isUserWaitlist:     userWaitlistMap[slot.id]?.has(dateStr) ?? false,
      isCancelled:        cancelledSet.has(`${slot.id}|${dateStr}`),
      waitlistCount:      waitlistCounts[slot.id]?.[dateStr] ?? 0,
      isRotating,
    })
  }

  return (
    <div className="max-w-lg mx-auto px-3 pt-6">

      {/* ── Anuncios ──────────────────────────────────── */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2 mb-5">
          {visibleAnnouncements.map(a => (
            <div key={a.id}
              className="relative rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #07153A 0%, #15306B 100%)' }}>
              {/* Blob decorativo */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(46,91,255,0.35) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}/>
              <div className="relative px-4 py-4 flex gap-3">
                <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-paper text-base leading-tight">{a.title}</p>
                  <p className="font-mono text-paper/70 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <p className="font-mono text-paper/30 text-[9px] uppercase tracking-wider mt-2">
                    {new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    {a.pinned && <span className="ml-2 text-paper/40">· Fijado</span>}
                  </p>
                </div>
                {!a.pinned && (
                  <button onClick={() => dismiss(a.id)}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-paper/10 flex items-center justify-center text-paper/50 text-xs font-bold hover:bg-paper/20 transition-colors">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <p className="page-eyebrow">Horario</p>
          <h1 className="font-display font-extrabold text-2xl text-navy leading-tight tracking-tight">
            {format(weekStart, "d MMM", { locale: es })}
            <span className="text-ink/30 font-normal"> — </span>
            {format(addDays(weekStart, 4), "d MMM", { locale: es })}
          </h1>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setWeekStart(d => addDays(d, -7))}
            className="w-9 h-9 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-navy font-bold shadow-sm active:scale-95 transition-transform">‹</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 h-9 rounded-2xl bg-white border border-black/5 text-navy font-mono text-[9px] uppercase tracking-wider shadow-sm active:scale-95 transition-transform">Hoy</button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="w-9 h-9 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-navy font-bold shadow-sm active:scale-95 transition-transform">›</button>
        </div>
      </div>

      {/* Días */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {weekDays.map((day, i) => {
          const isToday = format(day,'yyyy-MM-dd') === format(new Date(),'yyyy-MM-dd')
          return (
            <div key={i} className={`text-center py-2 rounded-2xl transition-all
              ${isToday ? 'bg-navy' : 'bg-white/50'}`}
              style={isToday ? { boxShadow: '0 4px 16px rgba(11,31,77,0.25)' } : {}}>
              <div className={`font-mono text-[8px] uppercase tracking-wider ${isToday ? 'text-paper/50' : 'text-ink/30'}`}>{DAY_SHORT[i+1]}</div>
              <div className={`font-display font-bold text-sm mt-0.5 ${isToday ? 'text-paper' : 'text-ink/70'}`}>{format(day,'d')}</div>
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
                <div className="font-mono text-[9px] text-ink/30 uppercase tracking-widest mb-1.5 px-0.5">{time.slice(0,5)}</div>
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
                          const cap          = getCapacity(slot.id, dateStr, date)
                          const cancelled    = cancelledSet.has(`${slot.id}|${dateStr}`)
                          const userParity   = userRegularMap.get(slot.id)
                          const isRegular    = userParity !== undefined && parityActive(userParity, date)
                          const isAbsent     = userAbsentMap[slot.id]?.has(dateStr) ?? false
                          const isRecovery   = userRecoveryMap[slot.id]?.has(dateStr) ?? false
                          const capNum        = Math.max(0, cap)
                          const slotMax       = slot.max_capacity ?? 7
                          const isFull        = capNum >= slotMax
                          const activeRegs    = (regularParities[slot.id] ?? []).filter(p => parityActive(p, date)).length
                          const isEnFormacion = slot.min_regulars > 0 && activeRegs < slot.min_regulars

                          return (
                            <button
                              key={slot.id}
                              onClick={() => handleCell(slot, date)}
                              className={`w-full rounded-xl overflow-hidden text-left transition-all active:scale-[0.94] select-none
                                ${cancelled ? 'opacity-20' : ''}
                                ${isPast && !cancelled ? 'opacity-35' : ''}
                                ${isAbsent ? 'opacity-40' : ''}
                              `}
                              style={{
                                backgroundColor: 'white',
                                boxShadow: isRegular && !isAbsent
                                  ? `0 0 0 2px #0B1F4D, 0 2px 10px rgba(11,31,77,0.18)`
                                  : isRecovery
                                    ? `0 0 0 2px #2E5BFF, 0 2px 10px rgba(46,91,255,0.18)`
                                    : `0 1px 6px rgba(11,31,77,0.08)`,
                              }}
                            >
                              <div className="h-[3px] w-full" style={{ backgroundColor: slot.class_types.color }}/>
                              <div className="px-1.5 pt-1.5 pb-2">
                                <p className={`text-[8px] font-bold text-ink/80 leading-tight truncate ${cancelled ? 'line-through' : ''}`}>
                                  {slot.class_types.name}
                                </p>
                                {cancelled ? (
                                  <p className="text-[7px] font-mono text-ink/30 mt-0.5">cancel.</p>
                                ) : isAbsent ? (
                                  <p className="text-[7px] font-mono text-red-400 mt-0.5">falta</p>
                                ) : (
                                  <div className="flex gap-[2px] mt-1.5 flex-wrap">
                                    {Array.from({ length: slotMax }).map((_, i) => (
                                      <div key={i} className="w-[4px] h-[4px] rounded-full flex-shrink-0"
                                        style={{
                                          backgroundColor: i < capNum
                                            ? slot.class_types.color
                                            : `${slot.class_types.color}30`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                                {isEnFormacion && !cancelled && !isAbsent && (
                                  <p className="text-[6px] font-mono text-amber-500 mt-0.5 uppercase tracking-wider">form.</p>
                                )}
                                {isFull && !isEnFormacion && !cancelled && !isAbsent && (
                                  <p className="text-[6px] font-mono text-ink/30 mt-0.5 uppercase tracking-wider">llena</p>
                                )}
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
        <SlotModal info={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); load() }}/>
      )}
    </div>
  )
}
