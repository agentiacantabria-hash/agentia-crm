'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Plan } from '@/lib/types'
import { CANCEL_DEADLINE_HOURS } from '@/lib/types'
import { parityActive } from '@/lib/parity'

type SlotFull = ScheduleSlot & { isAbsent: boolean; week_parity: string }

export default function MisClasesPage() {
  const [slots, setSlots]         = useState<SlotFull[]>([])
  const [plan, setPlan]           = useState<Plan | null>(null)
  const [usedCredits, setUsed]    = useState(0)
  const [loading, setLoading]     = useState(true)
  const [actionLoading, setAL]    = useState<string | null>(null)
  const [error, setError]         = useState('')
  const router = useRouter()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  async function load() {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const dateFrom   = format(weekStart, 'yyyy-MM-dd')
    const dateTo     = format(addDays(weekStart, 4), 'yyyy-MM-dd')

    const [
      { data: profile },
      { data: userRegular },
      { data: absencesWeek },
      { count: creditsUsed },
    ] = await Promise.all([
      sb.from('profiles').select('plan_id, plans(*)').eq('id', user.id).single(),
      sb.from('regular_slots').select('slot_id, week_parity, schedule_slots(*, class_types(*))').eq('user_id', user.id),
      sb.from('absences').select('slot_id, class_date').eq('user_id', user.id).gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status','confirmed').gte('class_date', monthStart.toISOString().slice(0,10)),
    ])

    setPlan((profile?.plans as unknown as Plan) ?? null)
    setUsed(creditsUsed ?? 0)

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
    setLoading(false)
  }

  function weekDayDate(dow: number) {
    return addDays(weekStart, dow - 1)
  }

  useEffect(() => { load() }, [])

  async function toggleAbsence(slot: SlotFull) {
    const dayDate = weekDayDate(slot.day_of_week)
    const dateStr = format(dayDate, 'yyyy-MM-dd')

    // Verificar plazo
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
    setAL(null)
    load()
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/>
    </div>
  )

  const creditsMax = plan?.max_recoveries_per_month ?? 0
  const creditsLeft = Math.max(0, creditsMax - usedCredits)

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Esta semana</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-1">Mis clases</h1>

      {/* Badge de recuperaciones */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold
          ${creditsLeft > 0 ? 'bg-blue/10 text-blue' : 'bg-ink/8 text-ink/40'}`}>
          <span>{creditsLeft}/{creditsMax}</span>
          <span className="font-normal">recuperaciones este mes</span>
        </div>
        {creditsLeft > 0 && (
          <button onClick={() => router.push('/recuperar')}
            className="text-xs font-mono text-blue underline underline-offset-2">
            Usar →
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{error}</p>}

      {slots.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-display font-bold text-xl text-navy mb-2">Sin clases fijas</p>
          <p className="text-ink/40 text-sm mb-6">Ve al horario y añade tus clases de la semana</p>
          <button onClick={() => router.push('/horario')}
            className="bg-navy text-paper font-display font-bold px-6 py-3 rounded-2xl">
            Ver horario
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...slots].sort((a,b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
            .map(slot => {
              const dayDate   = weekDayDate(slot.day_of_week)
              const dateStr   = format(dayDate, 'yyyy-MM-dd')
              const dayLabel  = format(dayDate, "EEEE d", { locale: es })
              const isPast    = isBefore(dayDate, new Date(new Date().setHours(0,0,0,0)))

              return (
                <div key={slot.id} className={`card overflow-hidden flex ${slot.isAbsent ? 'opacity-50' : ''}`}>
                  <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: slot.class_types.color }}/>
                  <div className="flex-1 px-4 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-navy">{slot.class_types.name}</p>
                      <p className="font-mono text-[10px] text-ink/40 uppercase tracking-wider mt-0.5 capitalize">
                        {dayLabel} · {slot.start_time.slice(0,5)}h
                      </p>
                      {slot.week_parity !== 'all' && (
                        <span className="inline-block mt-0.5 text-[9px] font-mono text-ink/30 uppercase tracking-wider">semanas alternas</span>
                      )}
                      {slot.isAbsent && (
                        <span className="inline-block mt-1 text-[10px] font-mono text-red-500 uppercase tracking-wider">Falta marcada</span>
                      )}
                    </div>
                    {!isPast && (
                      <button
                        onClick={() => toggleAbsence(slot)}
                        disabled={actionLoading === slot.id}
                        className={`text-xs font-mono px-3 py-1.5 rounded-xl transition-colors
                          ${slot.isAbsent
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                          } disabled:opacity-40`}
                      >
                        {actionLoading === slot.id ? '…'
                          : slot.isAbsent ? 'Quitar falta'
                          : 'Marcar falta'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <p className="text-center text-xs text-ink/30 font-mono mt-8 uppercase tracking-wider">
        Plan actual: {plan?.name ?? '—'}
      </p>
    </div>
  )
}
