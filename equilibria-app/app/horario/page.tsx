'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { format, addDays, startOfWeek, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Announcement } from '@/lib/types'
import { DAY_SHORT } from '@/lib/types'
import { parityActive } from '@/lib/parity'
import { SCHEDULE_REALTIME_TOPIC } from '@/lib/schedule-events'
import SlotModal from '@/components/SlotModal'

export type SlotInfo = {
  slot: ScheduleSlot
  date: Date
  capacity: number
  regularCount: number
  isUserRegular: boolean
  userRegularParity: string | null
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
  const [firstName, setFirstName]     = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())

  const [regularParities,  setRegularParities]  = useState<Record<string, string[]>>({})
  const [absentCounts,     setAbsentCounts]     = useState<Record<string, Record<string, number>>>({})
  const [recoveryCounts,   setRecoveryCounts]   = useState<Record<string, Record<string, number>>>({})
  const [waitlistCounts,   setWaitlistCounts]   = useState<Record<string, Record<string, number>>>({})
  const [cancelledSet,     setCancelledSet]     = useState<Set<string>>(new Set())

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
      sb.from('profiles').select('is_admin, schedule_type, full_name').eq('id', user.id).single()
        .then(({ data }) => {
          const d = data as { is_admin?: boolean; schedule_type?: string; full_name?: string } | null
          setIsAdmin(d?.is_admin ?? false)
          setIsRotating(d?.schedule_type === 'rotativo')
          setFirstName(d?.full_name?.split(' ')[0] ?? null)
        })
    }

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

  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  useEffect(() => {
    const sb = createClient()
    // postgres_changes: actualiza al instante para los rows del PROPIO
    // usuario (RLS filtra los eventos al user_id, así que solo veo los míos)
    const ownCh = sb.channel('horario-own')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regular_slots' },     () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' },          () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recovery_bookings' }, () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' },          () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancelled_classes' }, () => loadRef.current())
      .subscribe()
    // broadcast: el server publica aquí cuando cualquier alumna modifica
    // algo. RLS no aplica → todas reciben el evento y se actualizan
    const sharedCh = sb.channel(SCHEDULE_REALTIME_TOPIC)
      .on('broadcast', { event: 'change' }, () => loadRef.current())
      .subscribe()
    return () => { sb.removeChannel(ownCh); sb.removeChannel(sharedCh) }
  }, [])

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

  const isCurrentWeek = format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  function greeting(): string {
    const h = new Date().getHours()
    if (h < 6)  return 'Buenas noches'
    if (h < 13) return 'Buenos días'
    if (h < 21) return 'Buenas tardes'
    return 'Buenas noches'
  }

  function isHappeningNow(slot: ScheduleSlot, date: Date): boolean {
    const now = new Date()
    if (format(date, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) return false
    const [h, m] = slot.start_time.split(':').map(Number)
    const start = new Date(date); start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + (slot.duration_minutes ?? 50) * 60_000)
    return now >= start && now < end
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">

      {/* ── Anuncios ──────────────────────────────────── */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-2.5 mb-6 animate-fade-in">
          {visibleAnnouncements.map(a => (
            <div key={a.id}
              className="relative rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #143A8C 0%, #1E4DB7 60%, #2657C9 100%)' }}>
              <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)' }}/>
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(232,200,147,0.22) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}/>
              <div className="relative px-5 py-5 flex gap-4">
                <span className="text-3xl flex-shrink-0 leading-none mt-0.5 drop-shadow-sm">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-paper text-lg leading-tight tracking-tight">{a.title}</p>
                  <p className="text-paper/80 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <p className="font-mono text-paper/40 text-[10px] uppercase tracking-widest mt-3">
                    {new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                    {a.pinned && <span className="ml-2 text-paper/50">· Fijado</span>}
                  </p>
                </div>
                {!a.pinned && (
                  <button onClick={() => dismiss(a.id)}
                    aria-label="Descartar aviso"
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-paper/15 backdrop-blur flex items-center justify-center text-paper/70 text-sm hover:bg-paper/25 active:scale-95 transition-all">
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cabecera ──────────────────────────────────── */}
      <div className="mb-5 animate-fade-in">
        {firstName && isCurrentWeek ? (
          <p className="page-eyebrow">{greeting()}, <span className="text-brand-deep font-bold normal-case tracking-normal">{firstName}</span></p>
        ) : (
          <p className="page-eyebrow">Horario</p>
        )}
        <h1 className="page-title">
          {isCurrentWeek ? <>Esta <em>semana</em></> : <em>{format(weekStart, "MMMM", { locale: es })}</em>}
        </h1>
        <p className="font-mono text-xs text-ink/45 mt-2 tracking-wide">
          {format(weekStart, "d 'de' MMM", { locale: es })}
          <span className="mx-1.5 text-ink/25">→</span>
          {format(addDays(weekStart, 4), "d 'de' MMM", { locale: es })}
        </p>
      </div>

      {/* ── Nav semana ────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1.5 mb-5">
        <button onClick={() => setWeekStart(d => addDays(d, -7))}
          aria-label="Semana anterior"
          className="w-10 h-10 rounded-2xl bg-white border border-ink/5 flex items-center justify-center text-brand text-lg font-semibold shadow-card-soft active:scale-95 transition-transform">‹</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          disabled={isCurrentWeek}
          className="px-4 h-10 rounded-2xl bg-white border border-ink/5 text-brand-deep font-mono text-[11px] uppercase tracking-widest font-bold shadow-card-soft active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed">
          Hoy
        </button>
        <button onClick={() => setWeekStart(d => addDays(d, 7))}
          aria-label="Semana siguiente"
          className="w-10 h-10 rounded-2xl bg-white border border-ink/5 flex items-center justify-center text-brand text-lg font-semibold shadow-card-soft active:scale-95 transition-transform">›</button>
      </div>

      {/* ── Días ─────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {weekDays.map((day, i) => {
          const isToday = format(day,'yyyy-MM-dd') === format(new Date(),'yyyy-MM-dd')
          const isPast = isBefore(day, today)
          return (
            <div key={i}
              className={`relative text-center py-3 rounded-2xl transition-all
                ${isToday ? '' : 'bg-white/60 border border-ink/5'}
                ${isPast && !isToday ? 'opacity-50' : ''}`}
              style={isToday ? {
                background: 'linear-gradient(180deg, #2657C9 0%, #1E4DB7 100%)',
                boxShadow: '0 8px 28px rgba(30,77,183,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              } : {}}>
              <div className={`font-mono text-[10px] uppercase tracking-widest font-semibold ${isToday ? 'text-paper/80' : 'text-ink/45'}`}>
                {DAY_SHORT[i+1]}
              </div>
              <div className={`font-display font-semibold text-xl mt-0.5 leading-none tracking-tight ${isToday ? 'text-paper' : 'text-ink/85'}`}>
                {format(day,'d')}
              </div>
              {isToday && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-paper/60"/>
              )}
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="space-y-5 pb-8">
          {[0,1,2].map(i => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <div className="h-3 w-12 rounded bg-ink/8 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}/>
                </div>
                <span className="flex-1 h-px bg-ink/5"/>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5].map(d => (
                  <div key={d} className="rounded-2xl bg-ink/5 relative overflow-hidden" style={{ minHeight: '78px' }}>
                    <div className="absolute inset-0 -translate-x-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5 pb-8">
          {times.map(time => {
            const slotsAtTime = slots.filter(s => s.start_time === time)
            return (
              <div key={time} className="animate-slide-up">
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className="font-mono text-sm text-brand-deep tracking-widest font-semibold">{time.slice(0,5)}</span>
                  <span className="flex-1 h-px bg-gradient-to-r from-brand/15 to-transparent"/>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1,2,3,4,5].map(dow => {
                    const date    = weekDays[dow - 1]
                    const dateStr = format(date, 'yyyy-MM-dd')
                    const isPast  = isBefore(date, today)
                    const daySlots = slotsAtTime.filter(s => s.day_of_week === dow)
                    if (!daySlots.length) return <div key={dow}/>
                    return (
                      <div key={dow} className="flex flex-col gap-1.5">
                        {daySlots.map(slot => {
                          const cap          = getCapacity(slot.id, dateStr, date)
                          const cancelled    = cancelledSet.has(`${slot.id}|${dateStr}`)
                          const userParity   = userRegularMap.get(slot.id)
                          const isRegular    = userParity !== undefined && parityActive(userParity, date)
                          const isAbsent     = userAbsentMap[slot.id]?.has(dateStr) ?? false
                          const isRecovery   = userRecoveryMap[slot.id]?.has(dateStr) ?? false
                          const capNum       = Math.max(0, cap)
                          const slotMax      = slot.max_capacity ?? 7
                          const spotsLeft    = Math.max(0, slotMax - capNum)
                          const isFull       = capNum >= slotMax
                          const activeRegs   = (regularParities[slot.id] ?? []).filter(p => parityActive(p, date)).length
                          const isEnFormacion= slot.min_regulars > 0 && activeRegs < slot.min_regulars
                          const color        = slot.class_types.color
                          const isNow        = !cancelled && isHappeningNow(slot, date)

                          // Estado del puntito superior derecha
                          let statusColor = '#9BC4BC' // verde teal — libre
                          if (isFull && !isAbsent) statusColor = 'rgba(11,31,77,0.2)'
                          else if (spotsLeft <= 2 && !isAbsent) statusColor = '#E8C893' // amber

                          return (
                            <button
                              key={slot.id}
                              onClick={() => handleCell(slot, date)}
                              className={`group relative w-full rounded-2xl overflow-hidden text-left transition-all active:scale-[0.96] select-none
                                ${cancelled ? 'opacity-25' : ''}
                                ${isPast && !cancelled ? 'opacity-40' : ''}
                                ${isAbsent ? 'opacity-45' : ''}
                              `}
                              style={{
                                background: `linear-gradient(180deg, ${color}1F 0%, ${color}0A 60%, white 100%)`,
                                border: isRegular && !isAbsent
                                  ? `1.5px solid #1E4DB7`
                                  : isRecovery
                                    ? `1.5px solid #3D6FD9`
                                    : `1px solid ${color}33`,
                                boxShadow: isRegular && !isAbsent
                                  ? `0 6px 20px rgba(30,77,183,0.18)`
                                  : isRecovery
                                    ? `0 4px 16px rgba(30,77,183,0.14)`
                                    : `0 2px 10px rgba(11,31,77,0.05)`,
                                minHeight: '78px',
                              }}
                            >
                              {/* Franja de color clase arriba */}
                              <div className="h-1 w-full" style={{ backgroundColor: color }}/>

                              {/* Status dot */}
                              {!cancelled && !isAbsent && !isNow && (
                                <span
                                  className={`absolute top-2 right-2 w-2 h-2 rounded-full ${spotsLeft > 0 && spotsLeft <= 2 ? 'animate-pulse-soft' : ''}`}
                                  style={{ backgroundColor: statusColor }}
                                />
                              )}

                              {/* Indicador "ocurriendo ahora" */}
                              {isNow && (
                                <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: '#DC2626', boxShadow: '0 2px 8px rgba(220,38,38,0.4)' }}>
                                  <span className="relative flex w-1.5 h-1.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-white animate-pulse-ring"/>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"/>
                                  </span>
                                  <span className="font-mono text-[8px] font-bold text-white tracking-widest uppercase">Ahora</span>
                                </span>
                              )}

                              <div className="px-2 pt-2 pb-2.5">
                                <p className={`font-display font-semibold text-[12px] text-ink leading-tight truncate tracking-tight ${cancelled ? 'line-through' : ''}`}>
                                  {slot.class_types.name}
                                </p>
                                {cancelled ? (
                                  <p className="font-mono text-[9px] font-bold text-ink/40 mt-1 uppercase tracking-wider">cancel.</p>
                                ) : isAbsent ? (
                                  <p className="font-mono text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">falta</p>
                                ) : (
                                  <p className="font-mono text-[10px] text-ink/55 mt-1 tabular-nums">
                                    <span className="font-bold text-ink/85">{capNum}</span>
                                    <span className="text-ink/30">/{slotMax}</span>
                                  </p>
                                )}
                                {isEnFormacion && !cancelled && !isAbsent && (
                                  <p className="font-mono text-[8px] font-bold text-amber-700 mt-0.5 uppercase tracking-widest">en form.</p>
                                )}
                                {isFull && !isEnFormacion && !cancelled && !isAbsent && (
                                  <p className="font-mono text-[8px] font-bold text-ink/40 mt-0.5 uppercase tracking-widest">llena</p>
                                )}
                                {isRegular && !isAbsent && !cancelled && (
                                  <p className="font-mono text-[8px] font-bold text-brand mt-0.5 uppercase tracking-widest">tu clase</p>
                                )}
                                {isRecovery && !cancelled && (
                                  <p className="font-mono text-[8px] font-bold text-brand-soft mt-0.5 uppercase tracking-widest">{isRotating ? 'reserv.' : 'recup.'}</p>
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
