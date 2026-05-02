'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, isBefore, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Plan } from '@/lib/types'
import { CANCEL_DEADLINE_HOURS } from '@/lib/types'
import { parityActive } from '@/lib/parity'
import { maxRecoveriesPerMonth } from '@/lib/plan'
import { toast } from '@/lib/toast'

type SlotFull = ScheduleSlot & { isAbsent: boolean; week_parity: string }

type Booking = {
  id: string
  slot_id: string
  class_date: string
  start_time: string
  className: string
  color: string
}

export default function MisClasesPage() {
  const [slots, setSlots]               = useState<SlotFull[]>([])
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [plan, setPlan]                 = useState<Plan | null>(null)
  const [scheduleType, setScheduleType] = useState<string | null>(null)
  const [usedCredits, setUsed]          = useState(0)
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setAL]          = useState<string | null>(null)
  const [error, setError]               = useState('')
  const router = useRouter()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const monthStart = startOfMonth(new Date())
    const monthStartStr = format(monthStart, 'yyyy-MM-dd')
    const dateFrom   = format(weekStart, 'yyyy-MM-dd')
    const dateTo     = format(addDays(weekStart, 4), 'yyyy-MM-dd')

    const [
      { data: profile },
      { data: userRegular },
      { data: absencesWeek },
      { data: userRecoveries },
      { count: creditsUsed },
    ] = await Promise.all([
      sb.from('profiles').select('plan_id, schedule_type, plans(*)').eq('id', user.id).single(),
      sb.from('regular_slots').select('slot_id, week_parity, schedule_slots(*, class_types(*))').eq('user_id', user.id),
      sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings')
        .select('id, slot_id, class_date, schedule_slots(start_time, class_types(name, color))')
        .eq('user_id', user.id).eq('status', 'confirmed')
        .gte('class_date', monthStartStr)
        .order('class_date', { ascending: true }),
      sb.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status','confirmed').gte('class_date', monthStartStr),
    ])

    setPlan((profile?.plans as unknown as Plan) ?? null)
    setScheduleType((profile as { schedule_type?: string } | null)?.schedule_type ?? null)
    setUsed(creditsUsed ?? 0)

    // Regulares activas esta semana
    const absentSet = new Set((absencesWeek ?? []).map((a: { slot_id: string; class_date: string }) => `${a.slot_id}|${a.class_date}`))
    type UserRegRow = { slot_id: string; week_parity: string; schedule_slots: ScheduleSlot }
    const enriched = ((userRegular ?? []) as unknown as UserRegRow[])
      .filter(r => parityActive(r.week_parity, weekStart))
      .map(r => {
        const s = r.schedule_slots
        const dayDate = weekDayDate(s.day_of_week)
        const dateStr = format(dayDate, 'yyyy-MM-dd')
        return { ...s, week_parity: r.week_parity, isAbsent: absentSet.has(`${s.id}|${dateStr}`) }
      })
    setSlots(enriched)

    // Reservas puntuales del mes
    type RecRow = {
      id: string
      slot_id: string
      class_date: string
      schedule_slots: { start_time: string; class_types: { name: string; color: string } | null } | null
    }
    const bs: Booking[] = ((userRecoveries ?? []) as unknown as RecRow[]).map(r => ({
      id:         r.id,
      slot_id:    r.slot_id,
      class_date: r.class_date,
      start_time: r.schedule_slots?.start_time ?? '00:00',
      className:  r.schedule_slots?.class_types?.name ?? '—',
      color:      r.schedule_slots?.class_types?.color ?? '#1E4DB7',
    }))
    setBookings(bs)
    setLoading(false)
  }

  function weekDayDate(dow: number) {
    return addDays(weekStart, dow - 1)
  }

  useEffect(() => { load() }, [])

  async function toggleAbsence(slot: SlotFull) {
    const dayDate = weekDayDate(slot.day_of_week)
    const dateStr = format(dayDate, 'yyyy-MM-dd')

    const classDateTime = new Date(`${dateStr}T${slot.start_time}`)
    const hoursUntil    = (classDateTime.getTime() - Date.now()) / 3_600_000
    if (!slot.isAbsent && hoursUntil < CANCEL_DEADLINE_HOURS) {
      setError(`Solo puedes marcar falta con ${CANCEL_DEADLINE_HOURS}h de antelación`)
      return
    }

    setAL(slot.id); setError('')
    const method = slot.isAbsent ? 'DELETE' : 'POST'
    const res = await fetch('/api/absence', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.id, class_date: dateStr }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setAL(null); return }
    toast.success(slot.isAbsent ? 'Has quitado la falta' : 'Falta registrada')
    setAL(null)
    load()
  }

  async function cancelBooking(b: Booking) {
    const classDateTime = new Date(`${b.class_date}T${b.start_time}`)
    const hoursUntil    = (classDateTime.getTime() - Date.now()) / 3_600_000
    if (hoursUntil < CANCEL_DEADLINE_HOURS) {
      setError(`Solo puedes cancelar con ${CANCEL_DEADLINE_HOURS}h de antelación`)
      return
    }

    setAL(b.id); setError('')
    const res = await fetch('/api/recovery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: b.slot_id, class_date: b.class_date }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setAL(null); return }
    toast.success('Reserva cancelada')
    setAL(null)
    load()
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin"/>
    </div>
  )

  const creditsMax = maxRecoveriesPerMonth(scheduleType, plan)
  const creditsLeft = Math.max(0, creditsMax - usedCredits)
  const isRotating = scheduleType === 'rotativo'
  const cupLabel   = isRotating ? 'reservas' : 'recuperaciones'

  const today = new Date(); today.setHours(0,0,0,0)
  const upcomingBookings = bookings.filter(b => !isBefore(new Date(b.class_date + 'T12:00:00'), today))
  const pastBookings     = bookings.filter(b =>  isBefore(new Date(b.class_date + 'T12:00:00'), today)).reverse()

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <p className="page-eyebrow">{isRotating ? 'Tus reservas' : 'Esta semana'}</p>
      <h1 className="page-title">Mis <em>clases</em></h1>

      {/* Card de cupo */}
      <div className="card-tint mt-5 mb-6 px-5 py-4" style={{ ['--tint' as string]: '#1E4DB7' }}>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep/70 font-semibold">
            {cupLabel} este mes
          </p>
          {creditsLeft > 0 && (
            <button onClick={() => router.push('/recuperar')}
              className="font-mono text-[10px] uppercase tracking-widest text-brand font-bold underline-offset-2 hover:underline">
              {isRotating ? 'Reservar →' : 'Usar →'}
            </button>
          )}
        </div>
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

      {error && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 animate-fade-in">
          <p className="font-mono text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ──── ROTATIVO: lista de reservas del mes ──── */}
      {isRotating ? (
        bookings.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(30,77,183,0.12) 0%, transparent 70%)' }}>
              <span className="text-4xl">🗓️</span>
            </div>
            <p className="font-display text-xl text-navy mb-1">Sin reservas este mes</p>
            <p className="text-ink/50 text-sm mb-6 max-w-xs mx-auto">Reserva la clase que quieras desde el horario y aparecerá aquí</p>
            <button onClick={() => router.push('/horario')}
              className="btn-primary max-w-xs mx-auto">
              Ver horario →
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-slide-up">
            {upcomingBookings.length > 0 && (
              <BookingsSection
                title="Próximas"
                items={upcomingBookings}
                onCancel={cancelBooking}
                actionLoading={actionLoading}
              />
            )}
            {pastBookings.length > 0 && (
              <BookingsSection
                title="Anteriores este mes"
                items={pastBookings}
                onCancel={null}
                actionLoading={actionLoading}
                muted
              />
            )}
          </div>
        )
      ) : (
        // ──── FIJO: clases fijas esta semana + opcional recoveries esta semana ────
        <>
          {slots.length === 0 ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle, rgba(30,77,183,0.12) 0%, transparent 70%)' }}>
                <span className="text-4xl">🌿</span>
              </div>
              <p className="font-display text-xl text-navy mb-1">Aún no tienes clases fijas</p>
              <p className="text-ink/50 text-sm mb-6 max-w-xs mx-auto">Apúntate a las que quieras desde el horario y aparecerán aquí</p>
              <button onClick={() => router.push('/horario')}
                className="btn-primary max-w-xs mx-auto">
                Ver horario →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 animate-slide-up">
              {[...slots].sort((a,b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
                .map(slot => {
                  const dayDate   = weekDayDate(slot.day_of_week)
                  const dayLabel  = format(dayDate, "EEEE d", { locale: es })
                  const isPast    = isBefore(dayDate, today)
                  const color     = slot.class_types.color

                  return (
                    <div key={slot.id}
                      className={`card-tint overflow-hidden flex transition-all ${slot.isAbsent ? 'opacity-55' : ''}`}
                      style={{ ['--tint' as string]: color }}>
                      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }}/>
                      <div className="flex-1 px-4 py-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display font-semibold text-navy text-lg tracking-tight leading-tight">
                            {slot.class_types.name}
                          </p>
                          <p className="font-mono text-[11px] text-ink/55 uppercase tracking-widest mt-1 capitalize">
                            {dayLabel} · {slot.start_time.slice(0,5)}h
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {slot.week_parity !== 'all' && (
                              <span className="badge badge-neutral !text-[9px]">Alternas</span>
                            )}
                            {slot.isAbsent && (
                              <span className="badge badge-danger !text-[9px]">Falta marcada</span>
                            )}
                          </div>
                        </div>
                        {!isPast && (
                          <button
                            onClick={() => toggleAbsence(slot)}
                            disabled={actionLoading === slot.id}
                            className={`flex-shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all active:scale-95
                              ${slot.isAbsent
                                ? 'bg-teal/30 text-emerald-800 hover:bg-teal/40'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                              } disabled:opacity-40`}
                          >
                            {actionLoading === slot.id ? '…'
                              : slot.isAbsent ? '↻ Recuperar'
                              : 'Marcar falta'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Recoveries de fijos esta semana (solo upcoming) */}
          {(() => {
            const weekEnd = addDays(weekStart, 4)
            const weekBookings = bookings.filter(b => {
              const d = new Date(b.class_date + 'T12:00:00')
              return !isBefore(d, today) && !isBefore(weekEnd, d)
            })
            if (!weekBookings.length) return null
            return (
              <div className="mt-7 animate-slide-up">
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <p className="font-mono text-[11px] text-brand-deep tracking-widest font-semibold uppercase">
                    Recuperaciones esta semana
                  </p>
                  <span className="flex-1 h-px bg-gradient-to-r from-brand/15 to-transparent"/>
                </div>
                <div className="space-y-2">
                  <BookingsSection title="" items={weekBookings} onCancel={cancelBooking} actionLoading={actionLoading} bare/>
                </div>
              </div>
            )
          })()}
        </>
      )}

      <p className="text-center font-mono text-[10px] text-ink/35 mt-10 uppercase tracking-widest">
        Plan actual · {plan?.name ?? '—'}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Sección de bookings — reutilizable
// ─────────────────────────────────────────────────────────────────
function BookingsSection({
  title, items, onCancel, actionLoading, muted = false, bare = false,
}: {
  title: string
  items: Booking[]
  onCancel: ((b: Booking) => void) | null
  actionLoading: string | null
  muted?: boolean
  bare?: boolean
}) {
  return (
    <div>
      {title && !bare && (
        <div className="flex items-center gap-2 mb-2 px-0.5">
          <p className="font-mono text-[11px] text-brand-deep tracking-widest font-semibold uppercase">
            {title}
          </p>
          <span className="flex-1 h-px bg-gradient-to-r from-brand/15 to-transparent"/>
        </div>
      )}
      <div className="space-y-2">
        {items.map(b => {
          const dateLabel = format(new Date(b.class_date + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })
          return (
            <div key={b.id}
              className={`card-tint overflow-hidden flex transition-all ${muted ? 'opacity-55' : ''}`}
              style={{ ['--tint' as string]: b.color }}>
              <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: b.color }}/>
              <div className="flex-1 px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-navy text-base tracking-tight">
                    {b.className}
                  </p>
                  <p className="font-mono text-[11px] text-ink/55 mt-1 capitalize">
                    {dateLabel} · {b.start_time.slice(0,5)}h
                  </p>
                </div>
                {onCancel && (
                  <button
                    onClick={() => onCancel(b)}
                    disabled={actionLoading === b.id}
                    className="flex-shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all active:scale-95 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                  >
                    {actionLoading === b.id ? '…' : 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
