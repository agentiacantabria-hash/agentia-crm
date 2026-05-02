'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot, Plan, InviteCode, ClassType, Announcement } from '@/lib/types'
import { MAX_CAPACITY, DAY_NAMES } from '@/lib/types'

type Tab = 'hoy' | 'semana' | 'clientes' | 'horario' | 'stats' | 'gestion' | 'registro'

type Attendee = {
  user_id: string
  full_name: string
  username: string | null
  type: 'regular' | 'recovery'
}

type ClassView = {
  slot: ScheduleSlot
  date: string
  isCancelled: boolean
  attendees: Attendee[]
}

type DayView = {
  date: string
  label: string
  classes: ClassView[]
}

type SlotStat = {
  slot: ScheduleSlot
  date: string
  dayLabel: string
  count: number
  isCancelled: boolean
}

type HistorialEntry = {
  id: string
  class_date: string
  profiles: { full_name: string; username: string | null }
  schedule_slots: { start_time: string; class_types: { name: string; color: string } } | null
}

type RegularRow  = { slot_id: string; user_id: string; profiles: { full_name: string; username: string | null } }
type RecoveryRow = { slot_id: string; class_date: string; user_id: string; profiles: { full_name: string; username: string | null } }

type ClientRow = {
  id: string
  full_name: string
  username: string | null
  phone: string | null
  plan_id: string
  plan_name: string
  payment_status: 'al_dia' | 'pendiente' | 'atrasado'
  last_payment_date: string | null
  notes: string | null
  recovery_used: number
  recovery_max: number
  schedule_type: 'fijo' | 'rotativo'
  created_at: string
  birthday: string | null
  regular_slots: { day_of_week: number; start_time: string; class_name: string; color: string }[]
  attended_estimate: number  // clases asistidas este mes (estimado)
  attended_max: number        // total potencial este mes
  last_activity: string | null // última recovery o falta (yyyy-mm-dd)
}

type PaymentRow = {
  id: string
  amount: number | null
  method: string | null
  notes: string | null
  paid_at: string
}

type SimpleClient = { id: string; full_name: string; username: string | null }

// ─── Subcomponent: card de clase ─────────────────────────────────────────────
function ClassCard({
  cv, onReload, allClients,
}: {
  cv: ClassView
  onReload?: () => void
  allClients?: SimpleClient[]
}) {
  const [markingId, setMarkingId]   = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [addUserId, setAddUserId]   = useState('')
  const [addType, setAddType]       = useState<'regular' | 'recovery'>('recovery')
  const [addLoading, setAddLoading] = useState(false)

  const presentIds       = new Set(cv.attendees.map(a => a.user_id))
  const availableClients = (allClients ?? []).filter(c => !presentIds.has(c.id))

  async function markAbsent(userId: string) {
    setMarkingId(userId)
    await fetch('/api/admin/mark-absence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, slot_id: cv.slot.id, class_date: cv.date }),
    })
    setMarkingId(null); onReload?.()
  }

  async function removeAttendee(a: Attendee) {
    setRemovingId(a.user_id)
    await fetch('/api/admin/manage-attendance', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: a.type, user_id: a.user_id, slot_id: cv.slot.id, class_date: cv.date }),
    })
    setRemovingId(null); onReload?.()
  }

  async function addAttendee() {
    if (!addUserId) return
    setAddLoading(true)
    await fetch('/api/admin/manage-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: addType, user_id: addUserId, slot_id: cv.slot.id, class_date: cv.date }),
    })
    setAddLoading(false); setShowAdd(false); setAddUserId(''); onReload?.()
  }

  const color = cv.slot.class_types.color
  return (
    <div className={`card-tint overflow-hidden flex ${cv.isCancelled ? 'opacity-50' : ''}`}
      style={{ ['--tint' as string]: color }}>
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: color }}/>
      <div className="flex-1 px-4 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="font-display font-semibold text-navy text-base tracking-tight">{cv.slot.class_types.name}</p>
            <p className="font-mono text-[11px] text-ink/55 mt-0.5 tabular-nums">{cv.slot.start_time.slice(0, 5)}h</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {cv.isCancelled && <span className="badge badge-danger">Cancelada</span>}
            <span className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums
              ${cv.attendees.length >= cv.slot.max_capacity ? 'bg-brand/12 text-brand-deep' : 'bg-ink/5 text-ink/55'}`}>
              {cv.attendees.length}/{cv.slot.max_capacity}
            </span>
            {!cv.isCancelled && allClients && (
              <button onClick={() => setShowAdd(v => !v)}
                aria-label={showAdd ? 'Cerrar añadir' : 'Añadir asistente'}
                className="w-7 h-7 rounded-full bg-brand/12 text-brand-deep font-bold text-base flex items-center justify-center leading-none active:scale-95 transition-transform">
                {showAdd ? '−' : '+'}
              </button>
            )}
          </div>
        </div>

        {cv.attendees.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {cv.attendees.map(a => (
              <div key={a.user_id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/70">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`badge ${a.type === 'recovery' ? 'badge-brand' : 'badge-neutral'}`}>
                    {a.type === 'recovery' ? 'Recup.' : 'Fija'}
                  </span>
                  <span className="font-display text-sm text-ink truncate">
                    {a.full_name}
                    {a.username && <span className="text-ink/35 font-mono text-[11px]"> · {a.username}</span>}
                  </span>
                </div>
                {!cv.isCancelled && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {a.type === 'regular' && (
                      <button onClick={() => markAbsent(a.user_id)} disabled={markingId === a.user_id}
                        className="font-mono text-[10px] uppercase tracking-wider text-amber-700 hover:text-amber-900 disabled:opacity-40 px-1.5 py-1">
                        {markingId === a.user_id ? '…' : 'Falta'}
                      </button>
                    )}
                    <button onClick={() => removeAttendee(a)} disabled={removingId === a.user_id}
                      aria-label={a.type === 'regular' ? 'Quitar fija' : 'Quitar reserva'}
                      className="font-mono text-[10px] uppercase tracking-wider text-red-500 hover:text-red-700 disabled:opacity-40 px-1.5 py-1">
                      {removingId === a.user_id ? '…' : 'Quitar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !cv.isCancelled && <p className="font-mono text-[11px] text-ink/40 text-center py-3 italic">Sin asistentes confirmados</p>
        )}

        {showAdd && (
          <div className="mt-3 pt-3 border-t border-ink/5 space-y-2">
            {availableClients.length === 0 ? (
              <p className="text-[10px] font-mono text-ink/30">Todos los clientes ya están en esta clase</p>
            ) : (
              <>
                <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                  <option value="">Seleccionar cliente...</option>
                  {availableClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}{c.username ? ` (${c.username})` : ''}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <select value={addType} onChange={e => setAddType(e.target.value as 'regular' | 'recovery')}
                    className="flex-1 font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                    <option value="recovery">Solo este día</option>
                    <option value="regular">Fija (siempre)</option>
                  </select>
                  <button onClick={addAttendee} disabled={!addUserId || addLoading}
                    className="px-4 py-2 bg-navy text-paper font-mono text-xs rounded-xl disabled:opacity-40">
                    {addLoading ? '…' : 'Añadir'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function paymentBadgeClass(s: string) {
  if (s === 'al_dia')    return 'bg-green-50 text-green-700'
  if (s === 'pendiente') return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}
function paymentLabel(s: string) {
  if (s === 'al_dia')    return 'Al día'
  if (s === 'pendiente') return 'Pendiente'
  return 'Atrasado'
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('hoy')
  const [plans, setPlans]             = useState<Plan[]>([])
  const [allClients, setAllClients]   = useState<SimpleClient[]>([])
  const [classTypes, setClassTypes]   = useState<ClassType[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      sb.from('profiles').select('is_admin').eq('id', user.id).single()
        .then(({ data }) => { if (!data?.is_admin) router.push('/horario') })
    })
    Promise.all([
      sb.from('plans').select('*'),
      sb.from('profiles').select('id, full_name, username').eq('is_admin', false).order('full_name'),
      sb.from('class_types').select('*').order('name'),
    ]).then(([{ data: p }, { data: c }, { data: ct }]) => {
      setPlans((p ?? []) as Plan[])
      setAllClients((c ?? []) as SimpleClient[])
      setClassTypes((ct ?? []) as ClassType[])
    })
  }, [router])

  // ══════════════════════════════════════════════════
  // TAB: HOY
  // ══════════════════════════════════════════════════
  const [todayClasses, setTodayClasses] = useState<ClassView[]>([])
  const [loadingHoy, setLoadingHoy]     = useState(false)
  const [isWeekend, setIsWeekend]       = useState(false)

  const loadHoy = useCallback(async () => {
    setLoadingHoy(true)
    const jsDow = new Date().getDay()
    if (jsDow === 0 || jsDow === 6) { setIsWeekend(true); setLoadingHoy(false); return }
    setIsWeekend(false)
    const sb = createClient()
    const todayDate  = format(new Date(), 'yyyy-MM-dd')

    const { data: rawSlots } = await sb.from('schedule_slots').select('*, class_types(*)')
      .eq('day_of_week', jsDow).eq('is_active', true)
    const slotIds = (rawSlots ?? []).map((s: ScheduleSlot) => s.id)
    if (!slotIds.length) { setTodayClasses([]); setLoadingHoy(false); return }

    const [
      { data: regularAll },
      { data: absencesToday },
      { data: recoveriesTotal },
      { data: cancelledToday },
    ] = await Promise.all([
      sb.from('regular_slots').select('slot_id, user_id, profiles(full_name, username)').in('slot_id', slotIds),
      sb.from('absences').select('slot_id, user_id').eq('class_date', todayDate).in('slot_id', slotIds),
      sb.from('recovery_bookings').select('slot_id, user_id, profiles(full_name, username)').eq('class_date', todayDate).eq('status', 'confirmed').in('slot_id', slotIds),
      sb.from('cancelled_classes').select('slot_id').eq('class_date', todayDate).in('slot_id', slotIds),
    ])

    const cancelledIds = new Set((cancelledToday ?? []).map((c: { slot_id: string }) => c.slot_id))
    const absentSet    = new Set((absencesToday ?? []).map((a: { slot_id: string; user_id: string }) => `${a.slot_id}|${a.user_id}`))
    const typedReg     = ((regularAll   ?? []) as unknown as RegularRow[])
    const typedRec     = ((recoveriesTotal ?? []) as unknown as RecoveryRow[])

    const classes: ClassView[] = (rawSlots ?? []).map((slot: ScheduleSlot) => {
      const regulars = typedReg.filter(r =>
        r.slot_id === slot.id && !absentSet.has(`${slot.id}|${r.user_id}`)
      ).map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

      const recoveries = typedRec.filter(r => r.slot_id === slot.id)
        .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'recovery' as const }))

      return { slot, date: todayDate, isCancelled: cancelledIds.has(slot.id), attendees: [...regulars, ...recoveries] }
    }).sort((a: ClassView, b: ClassView) => a.slot.start_time.localeCompare(b.slot.start_time))

    setTodayClasses(classes); setLoadingHoy(false)
  }, [])

  // ══════════════════════════════════════════════════
  // TAB: SEMANA
  // ══════════════════════════════════════════════════
  const [weekStart, setWeekStart]      = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weekData, setWeekData]        = useState<DayView[]>([])
  const [loadingSemana, setLoadingSem] = useState(false)

  const loadSemana = useCallback(async () => {
    setLoadingSem(true)
    const sb        = createClient()
    const dateFrom   = format(weekStart, 'yyyy-MM-dd')
    const dateTo     = format(addDays(weekStart, 4), 'yyyy-MM-dd')

    const [
      { data: rawSlots }, { data: regularAll }, { data: absencesAll },
      { data: recoveriesAll }, { data: cancelledAll },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, user_id, profiles(full_name, username)'),
      sb.from('absences').select('slot_id, class_date, user_id').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date, user_id, profiles(full_name, username)').eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
    ])

    const absentSet    = new Set((absencesAll ?? []).map((a: { slot_id: string; class_date: string; user_id: string }) => `${a.slot_id}|${a.class_date}|${a.user_id}`))
    const cancelledSet = new Set((cancelledAll ?? []).map((c: { slot_id: string; class_date: string }) => `${c.slot_id}|${c.class_date}`))
    const typedReg     = ((regularAll    ?? []) as unknown as RegularRow[])
    const typedRec     = ((recoveriesAll ?? []) as unknown as RecoveryRow[])

    const days: DayView[] = []
    for (let i = 0; i < 5; i++) {
      const date    = addDays(weekStart, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dow     = i + 1
      const label   = format(date, "EEEE d 'de' MMMM", { locale: es })
      const daySlots = (rawSlots ?? []).filter((s: ScheduleSlot) => s.day_of_week === dow)
      if (!daySlots.length) continue

      const classes: ClassView[] = daySlots.map((slot: ScheduleSlot) => {
        const regulars = typedReg.filter(r =>
          r.slot_id === slot.id && !absentSet.has(`${slot.id}|${dateStr}|${r.user_id}`)
        ).map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

        const recoveries = typedRec.filter(r => r.slot_id === slot.id && r.class_date === dateStr)
          .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'recovery' as const }))

        return { slot, date: dateStr, isCancelled: cancelledSet.has(`${slot.id}|${dateStr}`), attendees: [...regulars, ...recoveries] }
      }).sort((a: ClassView, b: ClassView) => a.slot.start_time.localeCompare(b.slot.start_time))

      days.push({ date: dateStr, label, classes })
    }
    setWeekData(days); setLoadingSem(false)
  }, [weekStart])

  // ══════════════════════════════════════════════════
  // TAB: CLIENTES
  // ══════════════════════════════════════════════════
  const [clients, setClients]            = useState<ClientRow[]>([])
  const [loadingCli, setLoadingCli]      = useState(false)
  const [editingId, setEditingId]        = useState<string | null>(null)
  const [expandedId, setExpandedId]      = useState<string | null>(null)
  const [search, setSearch]              = useState('')
  const [filterPay, setFilterPay]        = useState<'all' | 'al_dia' | 'pendiente' | 'atrasado'>('all')
  const [filterSched, setFilterSched]    = useState<'all' | 'fijo' | 'rotativo'>('all')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient]        = useState({ username: '', password: '', full_name: '', phone: '', birthday: '', plan_id: '2x', schedule_type: 'fijo' })
  const [newClientLoading, setNCL]       = useState(false)
  const [newClientError, setNCE]         = useState('')
  const [deletingId, setDeletingId]      = useState<string | null>(null)

  const loadClientes = useCallback(async () => {
    setLoadingCli(true)
    const sb        = createClient()
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    const [
      { data: profiles },
      { data: recoveryUsage },
      { data: regularsAll },
      { data: absencesMonth },
      { data: recoveriesMonth },
      { data: lastActivityRecov },
      { data: lastActivityAbs },
    ] = await Promise.all([
      sb.from('profiles').select('*, plans(*)').eq('is_admin', false).order('full_name', { ascending: true }),
      sb.from('recovery_bookings').select('user_id').eq('status', 'confirmed').gte('class_date', monthStart),
      sb.from('regular_slots').select('user_id, schedule_slots(day_of_week, start_time, class_types(name, color))'),
      sb.from('absences').select('user_id').gte('class_date', monthStart),
      sb.from('recovery_bookings').select('user_id').eq('status', 'confirmed').gte('class_date', monthStart),
      sb.from('recovery_bookings').select('user_id, class_date').eq('status', 'confirmed').order('class_date', { ascending: false }),
      sb.from('absences').select('user_id, class_date').order('class_date', { ascending: false }),
    ])

    const byUser: Record<string, number> = {}
    recoveryUsage?.forEach((r: { user_id: string }) => { byUser[r.user_id] = (byUser[r.user_id] ?? 0) + 1 })

    const absencesByUser: Record<string, number> = {}
    ;(absencesMonth ?? []).forEach((a: { user_id: string }) => {
      absencesByUser[a.user_id] = (absencesByUser[a.user_id] ?? 0) + 1
    })
    const recoveriesByUser: Record<string, number> = {}
    ;(recoveriesMonth ?? []).forEach((r: { user_id: string }) => {
      recoveriesByUser[r.user_id] = (recoveriesByUser[r.user_id] ?? 0) + 1
    })

    // Última señal por usuario: el max de su última recovery o última falta
    const lastByUser: Record<string, string> = {}
    ;[...(lastActivityRecov ?? []), ...(lastActivityAbs ?? [])]
      .forEach((r: { user_id: string; class_date: string }) => {
        const prev = lastByUser[r.user_id]
        if (!prev || r.class_date > prev) lastByUser[r.user_id] = r.class_date
      })

    type RegRow = {
      user_id: string
      schedule_slots: { day_of_week: number; start_time: string; class_types: { name: string; color: string } | null } | null
    }
    const regularsByUser: Record<string, ClientRow['regular_slots']> = {}
    ;((regularsAll ?? []) as unknown as RegRow[]).forEach(r => {
      const s = r.schedule_slots
      if (!s) return
      const list = (regularsByUser[r.user_id] ??= [])
      list.push({
        day_of_week: s.day_of_week,
        start_time:  s.start_time,
        class_name:  s.class_types?.name ?? '—',
        color:       s.class_types?.color ?? '#1E4DB7',
      })
    })
    Object.values(regularsByUser).forEach(arr =>
      arr.sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    )

    setClients((profiles ?? []).map((p: {
      id: string; full_name: string; username: string | null; phone: string | null
      plan_id: string; payment_status: string; last_payment_date: string | null; notes: string | null
      schedule_type: string | null; created_at: string; birthday: string | null
      plans: { name: string; max_recoveries_per_month: number; classes_per_week: number } | null
    }) => {
      const stype = (p.schedule_type ?? 'fijo') as ClientRow['schedule_type']
      const cpw   = p.plans?.classes_per_week ?? 0
      const max   = stype === 'rotativo' ? cpw * 4 : (p.plans?.max_recoveries_per_month ?? 0)
      const regulars = regularsByUser[p.id] ?? []
      // Asistencia estimada: (regulars × 4 semanas) - faltas + recoveries
      // Para rotativos: solo cuentan las recoveries
      const attendedMax = stype === 'rotativo' ? (recoveriesByUser[p.id] ?? 0) : regulars.length * 4
      const attendedEst = stype === 'rotativo'
        ? (recoveriesByUser[p.id] ?? 0)
        : Math.max(0, regulars.length * 4 - (absencesByUser[p.id] ?? 0) + (recoveriesByUser[p.id] ?? 0))
      return {
        id:                 p.id,
        full_name:          p.full_name,
        username:           p.username,
        phone:              p.phone,
        plan_id:            p.plan_id ?? '',
        plan_name:          p.plans?.name ?? '—',
        payment_status:     (p.payment_status ?? 'al_dia') as ClientRow['payment_status'],
        last_payment_date:  p.last_payment_date ?? null,
        notes:              p.notes ?? null,
        recovery_used:      byUser[p.id] ?? 0,
        recovery_max:       max,
        schedule_type:      stype,
        created_at:         p.created_at,
        birthday:           p.birthday ?? null,
        regular_slots:      regulars,
        attended_estimate:  attendedEst,
        attended_max:       attendedMax,
        last_activity:      lastByUser[p.id] ?? null,
      }
    }))
    setLoadingCli(false)
  }, [])

  async function updateClientPayment(userId: string, updates: Partial<Pick<ClientRow, 'payment_status' | 'last_payment_date' | 'notes' | 'plan_id' | 'schedule_type'>>) {
    await fetch('/api/admin/update-client', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...updates }),
    })
    setClients(prev => prev.map(c => {
      if (c.id !== userId) return c
      const u = { ...c, ...updates }
      if (updates.plan_id) {
        const p = plans.find(pl => pl.id === updates.plan_id)
        if (p) { u.plan_name = p.name; u.recovery_max = p.max_recoveries_per_month }
      }
      return u
    }))
  }

  async function updateClientProfile(userId: string, updates: { full_name?: string; username?: string; phone?: string; password?: string; birthday?: string | null }) {
    const res = await fetch('/api/admin/update-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...updates }),
    })
    if (res.ok) {
      setClients(prev => prev.map(c => c.id === userId ? { ...c, ...updates } : c))
      // Refresh simple clients list
      const sb = createClient()
      const { data } = await sb.from('profiles').select('id, full_name, username').eq('is_admin', false).order('full_name')
      if (data) setAllClients(data as SimpleClient[])
    }
    return res
  }

  async function createNewClient() {
    if (!newClient.username || !newClient.password || !newClient.full_name) {
      setNCE('Nombre, usuario y contraseña son obligatorios'); return
    }
    setNCL(true); setNCE('')
    const res  = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient),
    })
    const json = await res.json()
    if (!res.ok) { setNCE(json.error); setNCL(false); return }
    setNewClient({ username: '', password: '', full_name: '', phone: '', birthday: '', plan_id: '2x', schedule_type: 'fijo' })
    setShowNewClient(false); setNCL(false)
    loadClientes()
    const sb = createClient()
    const { data } = await sb.from('profiles').select('id, full_name, username').eq('is_admin', false).order('full_name')
    if (data) setAllClients(data as SimpleClient[])
  }

  async function deleteClient(userId: string) {
    if (!confirm('¿Eliminar este cliente? Esto borrará su cuenta y todos sus datos.')) return
    setDeletingId(userId)
    await fetch('/api/admin/update-profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    setDeletingId(null)
    setClients(prev => prev.filter(c => c.id !== userId))
    setAllClients(prev => prev.filter(c => c.id !== userId))
  }

  // ══════════════════════════════════════════════════
  // TAB: HORARIO
  // ══════════════════════════════════════════════════
  const [allSlots, setAllSlots]               = useState<ScheduleSlot[]>([])
  const [regularCountBySlot, setRCBS]         = useState<Record<string, number>>({})
  const [loadingHorario, setLH]               = useState(false)
  const [editingSlotId, setEditingSlotId]     = useState<string | null>(null)
  const [editDraft, setEditDraft]             = useState<Record<string, string | number | boolean>>({})
  const [showNewSlot, setShowNewSlot]         = useState(false)
  const [newSlot, setNewSlot]                 = useState({ day_of_week: 1, start_time: '09:00', class_type_id: 'pilates', duration_minutes: 50, min_regulars: 0, max_capacity: 7 })
  const [slotSaving, setSlotSaving]           = useState(false)

  const loadHorario = useCallback(async () => {
    setLH(true)
    const sb = createClient()
    const [{ data }, { data: regAll }] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').order('day_of_week').order('start_time'),
      sb.from('regular_slots').select('slot_id'),
    ])
    setAllSlots((data ?? []) as ScheduleSlot[])
    const rcbs: Record<string, number> = {}
    ;(regAll ?? []).forEach((r: { slot_id: string }) => { rcbs[r.slot_id] = (rcbs[r.slot_id] ?? 0) + 1 })
    setRCBS(rcbs)
    setLH(false)
  }, [])

  async function saveSlotEdit(slotId: string) {
    setSlotSaving(true)
    const res = await fetch('/api/admin/schedule-slot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, ...editDraft }),
    })
    if (res.ok) { setEditingSlotId(null); loadHorario() }
    setSlotSaving(false)
  }

  async function toggleSlotActive(slot: ScheduleSlot) {
    await fetch('/api/admin/schedule-slot', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slot.id, is_active: !slot.is_active }),
    })
    setAllSlots(prev => prev.map(s => s.id === slot.id ? { ...s, is_active: !s.is_active } : s))
  }

  async function createSlot() {
    setSlotSaving(true)
    const res  = await fetch('/api/admin/schedule-slot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSlot),
    })
    const json = await res.json()
    if (res.ok) {
      setShowNewSlot(false)
      setNewSlot({ day_of_week: 1, start_time: '09:00', class_type_id: 'pilates', duration_minutes: 50, min_regulars: 0, max_capacity: 7 })
      if (json.slot) setAllSlots(prev => [...prev, json.slot as ScheduleSlot].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
    }
    setSlotSaving(false)
  }

  // ══════════════════════════════════════════════════
  // TAB: STATS
  // ══════════════════════════════════════════════════
  const [statsData, setStatsData]       = useState<SlotStat[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    const sb        = createClient()
    const ws        = startOfWeek(new Date(), { weekStartsOn: 1 })
    const dateFrom   = format(ws, 'yyyy-MM-dd')
    const dateTo     = format(addDays(ws, 4), 'yyyy-MM-dd')

    const [
      { data: rawSlots }, { data: regularAll }, { data: absencesAll },
      { data: recoveriesAll }, { data: cancelledAll },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, user_id'),
      sb.from('absences').select('slot_id, class_date, user_id').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date, user_id').eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
    ])

    const stats: SlotStat[] = []
    for (let i = 0; i < 5; i++) {
      const date    = addDays(ws, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayLabel = format(date, "EEE d", { locale: es })
      const daySlots = (rawSlots ?? []).filter((s: ScheduleSlot) => s.day_of_week === i + 1)

      for (const slot of daySlots) {
        const isCancelled = (cancelledAll ?? []).some((c: { slot_id: string; class_date: string }) => c.slot_id === slot.id && c.class_date === dateStr)
        const absentIds   = new Set((absencesAll ?? []).filter((a: { slot_id: string; class_date: string; user_id: string }) => a.slot_id === slot.id && a.class_date === dateStr).map((a: { user_id: string }) => a.user_id))
        const regularCount = (regularAll ?? []).filter((r: { slot_id: string; user_id: string }) =>
          r.slot_id === slot.id && !absentIds.has(r.user_id)
        ).length
        const recoveryCount = (recoveriesAll ?? []).filter((r: { slot_id: string; class_date: string }) => r.slot_id === slot.id && r.class_date === dateStr).length
        stats.push({ slot, date: dateStr, dayLabel, count: regularCount + recoveryCount, isCancelled })
      }
    }
    setStatsData(stats.sort((a, b) => a.date.localeCompare(b.date) || a.slot.start_time.localeCompare(b.slot.start_time)))
    setLoadingStats(false)
  }, [])

  // ══════════════════════════════════════════════════
  // TAB: REGISTRO
  // ══════════════════════════════════════════════════
  const [absenceLog, setAbsenceLog]     = useState<HistorialEntry[]>([])
  const [recoveryLog, setRecoveryLog]   = useState<HistorialEntry[]>([])
  const [loadingReg, setLoadingReg]     = useState(false)

  const loadRegistro = useCallback(async () => {
    setLoadingReg(true)
    const sb = createClient()
    const thirtyDaysAgo = format(addDays(new Date(), -30), 'yyyy-MM-dd')
    const [{ data: abs }, { data: rec }] = await Promise.all([
      sb.from('absences')
        .select('id, class_date, profiles(full_name, username), schedule_slots(start_time, class_types(name, color))')
        .gte('class_date', thirtyDaysAgo)
        .order('class_date', { ascending: false })
        .limit(80),
      sb.from('recovery_bookings')
        .select('id, class_date, profiles(full_name, username), schedule_slots(start_time, class_types(name, color))')
        .eq('status', 'confirmed')
        .gte('class_date', thirtyDaysAgo)
        .order('class_date', { ascending: false })
        .limit(80),
    ])
    setAbsenceLog((abs ?? []) as unknown as HistorialEntry[])
    setRecoveryLog((rec ?? []) as unknown as HistorialEntry[])
    setLoadingReg(false)
  }, [])

  // ══════════════════════════════════════════════════
  // TAB: GESTIÓN
  // ══════════════════════════════════════════════════
  const [cancelAllSlots, setCancelAllSlots] = useState<ScheduleSlot[]>([])
  const [cancelDate, setCancelDate]         = useState('')
  const [cancelSlotId, setCancelSlotId]     = useState('')
  const [cancelReason, setCancelReason]     = useState('')
  const [cancelLoading, setCancelLoading]   = useState(false)
  const [cancelError, setCancelError]       = useState('')
  const [cancelSuccess, setCancelSuccess]   = useState('')
  const [inviteCodes, setInviteCodes]       = useState<InviteCode[]>([])
  const [newInvite, setNewInvite]           = useState({ full_name: '', phone: '', plan_id: '2x', code: '' })
  const [inviteLoading, setInviteLoading]   = useState(false)
  const [inviteError, setInviteError]       = useState('')
  const [inviteSuccess, setInviteSuccess]   = useState('')

  // Anuncios
  const [announcements, setAnnouncements]   = useState<Announcement[]>([])
  const [newAnnounce, setNewAnnounce]       = useState({ emoji: '📢', title: '', body: '', pinned: false, expires_at: '' })
  const [announceLoading, setAnnounceL]     = useState(false)
  const [announceError, setAnnounceErr]     = useState('')

  const loadGestion = useCallback(async () => {
    const sb = createClient()
    const [{ data: slots }, { data: codes }, { data: ann }] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('invite_codes').select('*').order('created_at', { ascending: false }),
      sb.from('announcements').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setCancelAllSlots((slots ?? []) as ScheduleSlot[])
    setInviteCodes((codes ?? []) as InviteCode[])
    setAnnouncements((ann ?? []) as Announcement[])
  }, [])

  async function createAnnouncement() {
    if (!newAnnounce.title || !newAnnounce.body) { setAnnounceErr('Título y mensaje obligatorios'); return }
    setAnnounceL(true); setAnnounceErr('')
    // El input type="date" devuelve "YYYY-MM-DD" → en Postgres se trata como
    // 00:00 del día y el anuncio "caduca" al empezar la jornada. Lo
    // interpretamos como "fin del día indicado" para que dure todo ese día.
    const expiresAt = newAnnounce.expires_at
      ? new Date(`${newAnnounce.expires_at}T23:59:59`).toISOString()
      : null
    const res = await fetch('/api/admin/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emoji:      newAnnounce.emoji || '📢',
        title:      newAnnounce.title,
        body:       newAnnounce.body,
        pinned:     newAnnounce.pinned,
        expires_at: expiresAt,
      }),
    })
    if (res.ok) {
      setNewAnnounce({ emoji: '📢', title: '', body: '', pinned: false, expires_at: '' })
      loadGestion()
    } else {
      const j = await res.json(); setAnnounceErr(j.error)
    }
    setAnnounceL(false)
  }

  async function toggleAnnouncement(id: string, is_active: boolean) {
    await fetch('/api/admin/announcement', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active } : a))
  }

  async function deleteAnnouncement(id: string) {
    await fetch('/api/admin/announcement', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  async function submitCancel() {
    if (!cancelDate || !cancelSlotId) return
    setCancelLoading(true); setCancelError(''); setCancelSuccess('')
    const res  = await fetch('/api/admin/cancel-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: cancelSlotId, class_date: cancelDate, reason: cancelReason || null }),
    })
    const json = await res.json()
    if (!res.ok) { setCancelError(json.error); setCancelLoading(false); return }
    setCancelSuccess('Clase cancelada. Se han devuelto los créditos afectados.')
    setCancelDate(''); setCancelSlotId(''); setCancelReason(''); setCancelLoading(false)
  }

  async function createInvite() {
    if (!newInvite.full_name) return
    setInviteLoading(true); setInviteError(''); setInviteSuccess('')
    const autoCode = newInvite.code.trim() ||
      newInvite.full_name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').slice(0, 8) +
      String(Math.floor(Math.random() * 900) + 100)
    const res  = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: newInvite.full_name, phone: newInvite.phone || null, plan_id: newInvite.plan_id, code: autoCode }),
    })
    const json = await res.json()
    if (!res.ok) { setInviteError(json.error); setInviteLoading(false); return }
    setInviteSuccess(`Código: ${json.code}`)
    setNewInvite({ full_name: '', phone: '', plan_id: '2x', code: '' })
    setInviteLoading(false); loadGestion()
  }

  // ── Carga por tab
  useEffect(() => {
    if (tab === 'hoy')      loadHoy()
    if (tab === 'semana')   loadSemana()
    if (tab === 'clientes') loadClientes()
    if (tab === 'horario')  loadHorario()
    if (tab === 'stats')    loadStats()
    if (tab === 'gestion')  loadGestion()
    if (tab === 'registro') loadRegistro()
  }, [tab, loadHoy, loadSemana, loadClientes, loadHorario, loadStats, loadGestion, loadRegistro])

  useEffect(() => { loadHoy() }, [loadHoy])

  // Realtime: recargar el tab activo cuando cambian datos de otros usuarios
  const reloadRef  = useRef<() => void>(() => {})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    reloadRef.current = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (tab === 'hoy')      loadHoy()
        if (tab === 'semana')   loadSemana()
        if (tab === 'clientes') loadClientes()
        if (tab === 'horario')  loadHorario()
        if (tab === 'registro') loadRegistro()
      }, 800)
    }
  }, [tab, loadHoy, loadSemana, loadClientes, loadHorario, loadRegistro])
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regular_slots' },     () => reloadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' },          () => reloadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recovery_bookings' }, () => reloadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' },          () => reloadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancelled_classes' }, () => reloadRef.current())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])

  const cancelDateOptions = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(new Date(), i); const dow = d.getDay()
    if (dow === 0 || dow === 6) return null
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEEE d 'de' MMM", { locale: es }) }
  }).filter(Boolean) as { value: string; label: string }[]

  const cancelSlotsForDate = cancelDate
    ? cancelAllSlots.filter(s => s.day_of_week === new Date(cancelDate + 'T00:00:00').getDay())
    : []

  const totalAttendees = statsData.reduce((s, x) => s + (x.isCancelled ? 0 : x.count), 0)
  const totalSlots     = statsData.filter(x => !x.isCancelled).length
  const avgFill        = totalSlots ? Math.round((totalAttendees / (totalSlots * MAX_CAPACITY)) * 100) : 0
  const statsByDay     = statsData.reduce<Record<string, { label: string; items: SlotStat[] }>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = { label: s.dayLabel, items: [] }
    acc[s.date].items.push(s); return acc
  }, {})

  const slotsByDay = allSlots.reduce<Record<number, ScheduleSlot[]>>((acc, s) => {
    if (!acc[s.day_of_week]) acc[s.day_of_week] = []
    acc[s.day_of_week].push(s); return acc
  }, {})

  const TAB_LABELS: Record<Tab, { label: string; icon: React.ReactNode }> = {
    hoy: { label: 'Hoy', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
      </svg>
    )},
    semana: { label: 'Semana', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    )},
    clientes: { label: 'Clientes', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    )},
    horario: { label: 'Horario', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
      </svg>
    )},
    stats: { label: 'Stats', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="5" width="3" height="13"/>
      </svg>
    )},
    gestion: { label: 'Gestión', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/>
      </svg>
    )},
    registro: { label: 'Registro', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
      </svg>
    )},
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8 pb-28">
      <p className="page-eyebrow">Panel administrador</p>

      {/* Tabs scrollables con iconos + label, estilo premium */}
      <div className="relative -mx-4 mb-6 mt-3">
        {/* Gradients laterales para indicar más contenido */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10"
          style={{ background: 'linear-gradient(to right, rgba(244,239,230,1), rgba(244,239,230,0))' }}/>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10"
          style={{ background: 'linear-gradient(to left, rgba(244,239,230,1), rgba(244,239,230,0))' }}/>
        <div className="flex gap-1.5 px-4 overflow-x-auto scrollbar-hide">
          {(['hoy', 'semana', 'clientes', 'horario', 'stats', 'gestion', 'registro'] as Tab[]).map(t => {
            const meta = TAB_LABELS[t]
            const active = tab === t
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`group flex-shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-display text-[13px] tracking-tight whitespace-nowrap transition-all duration-300 ease-spring
                  ${active
                    ? 'bg-navy text-paper font-semibold'
                    : 'bg-white/70 text-ink/60 hover:bg-white hover:text-ink/85 font-medium'}`}
                style={active ? { boxShadow: '0 8px 24px rgba(11,31,77,0.32), inset 0 1px 0 rgba(255,255,255,0.12)' } : { boxShadow: '0 1px 3px rgba(11,31,77,0.04)' }}>
                <span className={`transition-transform duration-300 ease-spring ${active ? 'scale-110' : 'scale-100'}`}>
                  {meta.icon}
                </span>
                <span>{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── HOY ──────────────────────────────────────── */}
      {tab === 'hoy' && (
        loadingHoy ? <Spinner/> : isWeekend ? (
          <Empty text="Hoy es fin de semana — sin clases"/>
        ) : todayClasses.length === 0 ? (
          <Empty text="Sin clases programadas hoy"/>
        ) : (
          <div className="space-y-3">
            {todayClasses.map(cv => <ClassCard key={cv.slot.id} cv={cv} onReload={loadHoy} allClients={allClients}/>)}
          </div>
        )
      )}

      {/* ─── SEMANA ───────────────────────────────────── */}
      {tab === 'semana' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <NavBtn onClick={() => setWeekStart(d => addDays(d, -7))}>‹</NavBtn>
            <span className="flex-1 text-center font-mono text-xs text-ink/50">
              {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 4), "d MMM", { locale: es })}
            </span>
            <NavBtn onClick={() => setWeekStart(d => addDays(d, 7))}>›</NavBtn>
          </div>
          {loadingSemana ? <Spinner/> : weekData.length === 0 ? (
            <Empty text="Sin clases programadas"/>
          ) : (
            <div className="space-y-6">
              {weekData.map(day => (
                <div key={day.date}>
                  <h2 className="font-display font-bold text-lg text-navy capitalize mb-3">{day.label}</h2>
                  <div className="space-y-2">
                    {day.classes.map(cv => <ClassCard key={cv.slot.id + cv.date} cv={cv} onReload={loadSemana} allClients={allClients}/>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CLIENTES ─────────────────────────────────── */}
      {tab === 'clientes' && (() => {
        const total      = clients.length
        const alDia      = clients.filter(c => c.payment_status === 'al_dia').length
        const pendientes = clients.filter(c => c.payment_status === 'pendiente').length
        const atrasados  = clients.filter(c => c.payment_status === 'atrasado').length
        const totalRecups = clients.reduce((sum, c) => sum + c.recovery_used, 0)

        const filtered = clients.filter(c => {
          if (filterPay !== 'all' && c.payment_status !== filterPay) return false
          if (filterSched !== 'all' && c.schedule_type !== filterSched) return false
          const q = search.trim().toLowerCase()
          if (q && !c.full_name.toLowerCase().includes(q) && !(c.username ?? '').toLowerCase().includes(q)) return false
          return true
        })

        return (
          <div>
            {/* ── Stats header ── */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="card px-3 py-3 text-center">
                <p className="font-display font-semibold text-2xl text-navy tabular-nums leading-none">{total}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink/45 mt-1">Total</p>
              </div>
              <div className="card px-3 py-3 text-center" style={{ background: 'rgba(155,196,188,0.18)' }}>
                <p className="font-display font-semibold text-2xl text-emerald-800 tabular-nums leading-none">{alDia}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 mt-1">Al día</p>
              </div>
              <div className="card px-3 py-3 text-center" style={{ background: 'rgba(232,200,147,0.22)' }}>
                <p className="font-display font-semibold text-2xl text-amber-800 tabular-nums leading-none">{pendientes}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-amber-700 mt-1">Pendientes</p>
              </div>
              <div className="card px-3 py-3 text-center" style={{ background: 'rgba(220,38,38,0.10)' }}>
                <p className="font-display font-semibold text-2xl text-red-700 tabular-nums leading-none">{atrasados}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-red-600 mt-1">Atrasados</p>
              </div>
            </div>

            <div className="card-tint mb-4 px-4 py-3 flex items-center justify-between" style={{ ['--tint' as string]: '#1E4DB7' }}>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep/70 font-semibold">Recuperaciones / Reservas este mes</p>
                <p className="font-display text-xl font-semibold text-brand-deep tabular-nums mt-1">{totalRecups}</p>
              </div>
              <p className="font-mono text-[10px] text-brand-deep/55 text-right max-w-[40%] leading-relaxed">
                Total consumido por todas las clientas en {format(new Date(), 'MMMM', { locale: es })}
              </p>
            </div>

            {/* ── Toolbar nuevo cliente + exportar ── */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowNewClient(v => !v)}
                className="btn-primary flex-1">
                {showNewClient ? 'Cancelar' : '+ Nuevo cliente'}
              </button>
              <a href="/api/admin/clients-export" download
                className="flex items-center justify-center px-4 rounded-[1.1rem] bg-paper-2 text-brand-deep font-mono text-xs uppercase tracking-widest font-bold hover:bg-paper-3 transition-colors active:scale-95"
                title="Descargar CSV">
                ↓ CSV
              </a>
            </div>

            {showNewClient && (
              <div className="card px-4 py-4 mb-4 space-y-3 animate-fade-in">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Crear cliente</p>
                <p className="font-mono text-[9px] text-ink/30 leading-relaxed">
                  El usuario es el código con el que entrará a la app. No se usa email.
                </p>
                {[
                  { label: 'Nombre completo *', key: 'full_name', type: 'text', placeholder: 'Ana García' },
                  { label: 'Usuario (código de acceso) *', key: 'username', type: 'text', placeholder: 'anagarcia' },
                  { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
                  { label: 'Teléfono (opcional)', key: 'phone', type: 'tel', placeholder: '600 000 000' },
                  { label: 'Cumpleaños (opcional)', key: 'birthday', type: 'date', placeholder: '' },
                ].map(f => (
                  <div key={f.key}>
                    <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">{f.label}</p>
                    <input type={f.type} placeholder={f.placeholder}
                      value={newClient[f.key as keyof typeof newClient]}
                      onChange={e => setNewClient(v => ({ ...v, [f.key]: e.target.value }))}
                      className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                  </div>
                ))}
                <div>
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Plan *</p>
                  <select value={newClient.plan_id} onChange={e => setNewClient(v => ({ ...v, plan_id: e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Tipo de horario *</p>
                  <select value={newClient.schedule_type} onChange={e => setNewClient(v => ({ ...v, schedule_type: e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                    <option value="fijo">Horario fijo</option>
                    <option value="rotativo">Turnos rotativos</option>
                  </select>
                </div>
                {newClientError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{newClientError}</p>}
                <button onClick={createNewClient} disabled={newClientLoading}
                  className="btn-primary">
                  {newClientLoading ? 'Creando…' : 'Crear cliente'}
                </button>
              </div>
            )}

            {/* ── Buscador ── */}
            <input
              type="text"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full font-mono text-sm px-4 py-2.5 rounded-xl bg-paper-2 text-navy border-none outline-none mb-2"
            />

            {/* ── Filtros ── */}
            <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
              {(['all', 'al_dia', 'pendiente', 'atrasado'] as const).map(opt => (
                <button key={opt} onClick={() => setFilterPay(opt)}
                  className={`flex-shrink-0 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all
                    ${filterPay === opt ? 'bg-navy text-paper' : 'bg-ink/5 text-ink/55 hover:bg-ink/10'}`}>
                  {opt === 'all' ? 'Todos' : opt === 'al_dia' ? 'Al día' : opt === 'pendiente' ? 'Pendientes' : 'Atrasados'}
                </button>
              ))}
              <span className="w-px bg-ink/10 mx-1 flex-shrink-0"/>
              {(['all', 'fijo', 'rotativo'] as const).map(opt => (
                <button key={opt} onClick={() => setFilterSched(opt)}
                  className={`flex-shrink-0 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full transition-all
                    ${filterSched === opt ? 'bg-navy text-paper' : 'bg-ink/5 text-ink/55 hover:bg-ink/10'}`}>
                  {opt === 'all' ? 'Cualquiera' : opt === 'fijo' ? 'Fijo' : 'Rotativo'}
                </button>
              ))}
            </div>

            {loadingCli ? <Spinner/> : filtered.length === 0 ? (
              <p className="font-mono text-xs text-ink/40 text-center py-8 italic">
                {clients.length === 0 ? 'Sin clientes todavía' : 'Sin resultados con esos filtros'}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    plans={plans}
                    isExpanded={expandedId === client.id}
                    isEditing={editingId === client.id}
                    isDeleting={deletingId === client.id}
                    onToggleExpand={() => setExpandedId(expandedId === client.id ? null : client.id)}
                    onToggleEdit={() => setEditingId(editingId === client.id ? null : client.id)}
                    onUpdatePayment={updates => updateClientPayment(client.id, updates)}
                    onUpdateProfile={updates => updateClientProfile(client.id, updates)}
                    onPaymentRefresh={() => loadClientes()}
                    onDelete={() => deleteClient(client.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ─── HORARIO ──────────────────────────────────── */}
      {tab === 'horario' && (
        <div>
          <button onClick={() => setShowNewSlot(v => !v)}
            className="w-full mb-4 bg-navy text-paper font-display font-bold py-3 rounded-2xl text-sm">
            {showNewSlot ? 'Cancelar' : '+ Nueva clase'}
          </button>

          {showNewSlot && (
            <div className="card px-4 py-4 mb-4 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Crear clase</p>
              <div>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Día</p>
                <select value={newSlot.day_of_week} onChange={e => setNewSlot(v => ({ ...v, day_of_week: +e.target.value }))}
                  className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                  {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
                </select>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Hora (HH:MM)</p>
                <input type="time" value={newSlot.start_time}
                  onChange={e => setNewSlot(v => ({ ...v, start_time: e.target.value }))}
                  className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Tipo de clase</p>
                <select value={newSlot.class_type_id} onChange={e => setNewSlot(v => ({ ...v, class_type_id: e.target.value }))}
                  className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                  {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Duración (min)</p>
                  <input type="number" min={10} max={180} value={newSlot.duration_minutes}
                    onChange={e => setNewSlot(v => ({ ...v, duration_minutes: +e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Aforo máx.</p>
                  <input type="number" min={1} max={20} value={newSlot.max_capacity}
                    onChange={e => setNewSlot(v => ({ ...v, max_capacity: +e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Mín. fijos</p>
                  <input type="number" min={0} max={20} value={newSlot.min_regulars}
                    onChange={e => setNewSlot(v => ({ ...v, min_regulars: +e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                </div>
              </div>
              <button onClick={createSlot} disabled={slotSaving}
                className="w-full bg-navy text-paper font-display font-bold py-3 rounded-2xl disabled:opacity-40">
                {slotSaving ? 'Guardando…' : 'Crear clase'}
              </button>
            </div>
          )}

          {loadingHorario ? <Spinner/> : (
            <div className="space-y-5">
              {[1,2,3,4,5].map(dow => {
                const daySlots = slotsByDay[dow] ?? []
                if (!daySlots.length) return null
                return (
                  <div key={dow}>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-2">{DAY_NAMES[dow]}</p>
                    <div className="space-y-1.5">
                      {daySlots.map(slot => (
                        <div key={slot.id} className={`card overflow-hidden flex ${!slot.is_active ? 'opacity-40' : ''}`}>
                          <div className="w-1 flex-shrink-0" style={{ backgroundColor: slot.class_types.color }}/>
                          <div className="flex-1 px-3 py-2.5">
                            {editingSlotId === slot.id ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input type="time"
                                    defaultValue={slot.start_time.slice(0,5)}
                                    onChange={e => setEditDraft(v => ({ ...v, start_time: e.target.value }))}
                                    className="flex-1 font-mono text-xs px-2 py-1.5 rounded-lg bg-paper-2 text-navy border-none outline-none"/>
                                  <select
                                    defaultValue={slot.class_type_id}
                                    onChange={e => setEditDraft(v => ({ ...v, class_type_id: e.target.value }))}
                                    className="flex-1 font-mono text-xs px-2 py-1.5 rounded-lg bg-paper-2 text-navy border-none outline-none">
                                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                                  </select>
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-0.5">Duración (min)</p>
                                    <input type="number" min={10} max={180}
                                      defaultValue={slot.duration_minutes}
                                      onChange={e => setEditDraft(v => ({ ...v, duration_minutes: +e.target.value }))}
                                      className="w-full font-mono text-xs px-2 py-1.5 rounded-lg bg-paper-2 text-navy border-none outline-none"/>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-0.5">Aforo máx.</p>
                                    <input type="number" min={1} max={20}
                                      defaultValue={slot.max_capacity}
                                      onChange={e => setEditDraft(v => ({ ...v, max_capacity: +e.target.value }))}
                                      className="w-full font-mono text-xs px-2 py-1.5 rounded-lg bg-paper-2 text-navy border-none outline-none"/>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-mono text-[8px] uppercase text-ink/40 mb-0.5">Mín. fijos</p>
                                    <input type="number" min={0} max={20}
                                      defaultValue={slot.min_regulars}
                                      onChange={e => setEditDraft(v => ({ ...v, min_regulars: +e.target.value }))}
                                      className="w-full font-mono text-xs px-2 py-1.5 rounded-lg bg-paper-2 text-navy border-none outline-none"/>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => saveSlotEdit(slot.id)} disabled={slotSaving}
                                    className="flex-1 bg-navy text-paper font-mono text-xs py-1.5 rounded-lg disabled:opacity-40">
                                    {slotSaving ? '…' : 'Guardar'}
                                  </button>
                                  <button onClick={() => setEditingSlotId(null)}
                                    className="flex-1 bg-paper-2 text-ink font-mono text-xs py-1.5 rounded-lg">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-display font-bold text-navy text-xs">{slot.class_types.name}</p>
                                  <p className="font-mono text-[9px] text-ink/40">
                                    {slot.start_time.slice(0,5)}h · {slot.duration_minutes}min · aforo {slot.max_capacity}
                                  </p>
                                  {slot.min_regulars > 0 && (
                                    <span className={`font-mono text-[8px] ${
                                      (regularCountBySlot[slot.id] ?? 0) < slot.min_regulars
                                        ? 'text-amber-600'
                                        : 'text-green-600'
                                    }`}>
                                      {(regularCountBySlot[slot.id] ?? 0) < slot.min_regulars ? '⊙ En formación · ' : '✓ '}
                                      {regularCountBySlot[slot.id] ?? 0}/{slot.min_regulars} fijos
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => { setEditingSlotId(slot.id); setEditDraft({}) }}
                                    className="font-mono text-[9px] text-blue underline">editar</button>
                                  <button onClick={() => toggleSlotActive(slot)}
                                    className={`font-mono text-[9px] ${slot.is_active ? 'text-red-400' : 'text-green-600'} underline`}>
                                    {slot.is_active ? 'desactivar' : 'activar'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── STATS ────────────────────────────────────── */}
      {tab === 'stats' && (
        loadingStats ? <Spinner/> : statsData.length === 0 ? <Empty text="Sin datos esta semana"/> : (
          <div>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <StatCard value={totalAttendees} label="asistentes"/>
              <StatCard value={totalSlots} label="clases"/>
              <StatCard value={`${avgFill}%`} label="ocupación"/>
            </div>
            <div className="space-y-5">
              {Object.entries(statsByDay).map(([date, { label, items }]) => (
                <div key={date}>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-2 capitalize">{label}</p>
                  <div className="space-y-2">
                    {items.map(s => {
                      const pct = Math.round((s.count / MAX_CAPACITY) * 100)
                      return (
                        <div key={s.slot.id + s.date} className={`card overflow-hidden flex ${s.isCancelled ? 'opacity-40' : ''}`}>
                          <div className="w-1 flex-shrink-0" style={{ backgroundColor: s.slot.class_types.color }}/>
                          <div className="flex-1 px-3 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <p className="font-display font-bold text-navy text-xs">{s.slot.class_types.name}</p>
                                <p className="font-mono text-[9px] text-ink/40">{s.slot.start_time.slice(0,5)}h</p>
                              </div>
                              <div className="text-right">
                                <span className="font-mono text-xs font-bold text-navy">{s.count}/{MAX_CAPACITY}</span>
                                {s.isCancelled && <p className="font-mono text-[8px] text-red-400 uppercase">Cancelada</p>}
                              </div>
                            </div>
                            {!s.isCancelled && (
                              <div className="h-1.5 rounded-full bg-ink/8 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.slot.class_types.color, opacity: 0.7 }}/>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ─── GESTIÓN ──────────────────────────────────── */}
      {tab === 'gestion' && (
        <div className="space-y-8">

          {/* ── Comunicados ── */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-3">Comunicados</p>

            {/* Formulario nuevo anuncio */}
            <div className="card px-4 py-4 space-y-3 mb-4">
              <div className="flex gap-2">
                <div className="w-16">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Emoji</p>
                  <input type="text" value={newAnnounce.emoji} maxLength={2}
                    onChange={e => setNewAnnounce(v => ({ ...v, emoji: e.target.value }))}
                    className="w-full font-mono text-xl text-center px-2 py-2 rounded-xl bg-paper-2 border-none outline-none"/>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Título</p>
                  <input type="text" placeholder="Ej: Cambio de horario"
                    value={newAnnounce.title}
                    onChange={e => setNewAnnounce(v => ({ ...v, title: e.target.value }))}
                    className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                </div>
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Mensaje</p>
                <textarea rows={3} placeholder="Escribe aquí el comunicado..."
                  value={newAnnounce.body}
                  onChange={e => setNewAnnounce(v => ({ ...v, body: e.target.value }))}
                  className="w-full font-mono text-sm px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none resize-none"/>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Caduca (opcional)</p>
                  <input type="date" value={newAnnounce.expires_at}
                    onChange={e => setNewAnnounce(v => ({ ...v, expires_at: e.target.value }))}
                    className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
                </div>
                <label className="flex items-center gap-2 mt-4 cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={newAnnounce.pinned}
                    onChange={e => setNewAnnounce(v => ({ ...v, pinned: e.target.checked }))}
                    className="w-4 h-4 rounded accent-navy"/>
                  <span className="font-mono text-xs text-ink/60">Fijado</span>
                </label>
              </div>
              {announceError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{announceError}</p>}
              <button onClick={createAnnouncement} disabled={announceLoading}
                className="w-full bg-navy text-paper font-display font-bold py-3 rounded-2xl disabled:opacity-40">
                {announceLoading ? 'Publicando…' : 'Publicar comunicado'}
              </button>
            </div>

            {/* Lista de anuncios existentes */}
            {announcements.length > 0 && (
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id}
                    className={`rounded-2xl overflow-hidden transition-opacity ${!a.is_active ? 'opacity-40' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #07153A 0%, #15306B 100%)' }}>
                    <div className="px-4 py-3 flex gap-3 items-start">
                      <span className="text-2xl flex-shrink-0">{a.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-paper text-sm">{a.title}</p>
                        <p className="font-mono text-paper/60 text-[10px] mt-0.5 line-clamp-2">{a.body}</p>
                        {a.pinned && <span className="font-mono text-[9px] text-paper/40 uppercase tracking-wider">Fijado</span>}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button onClick={() => toggleAnnouncement(a.id, !a.is_active)}
                          className={`font-mono text-[9px] px-2 py-1 rounded-lg ${a.is_active ? 'bg-paper/10 text-paper/60' : 'bg-green-500/20 text-green-300'}`}>
                          {a.is_active ? 'Ocultar' : 'Activar'}
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)}
                          className="font-mono text-[9px] px-2 py-1 rounded-lg bg-red-500/20 text-red-300">
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-ink/8"/>

          {/* Cancelar clase */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-3">Cancelar clase</p>
            <div className="space-y-3">
              <select value={cancelDate} onChange={e => { setCancelDate(e.target.value); setCancelSlotId('') }}
                className="card w-full font-mono text-sm px-4 py-3 text-navy outline-none">
                <option value="">Seleccionar día...</option>
                {cancelDateOptions.map(o => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
              </select>
              {cancelDate && cancelSlotsForDate.length > 0 && (
                <select value={cancelSlotId} onChange={e => setCancelSlotId(e.target.value)}
                  className="card w-full font-mono text-sm px-4 py-3 text-navy outline-none">
                  <option value="">Seleccionar clase...</option>
                  {cancelSlotsForDate.map(s => <option key={s.id} value={s.id}>{s.class_types.name} — {s.start_time.slice(0,5)}h</option>)}
                </select>
              )}
              {cancelSlotId && (
                <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Motivo (opcional)" className="card w-full font-mono text-sm px-4 py-3 text-navy outline-none"/>
              )}
              {cancelError   && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{cancelError}</p>}
              {cancelSuccess && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{cancelSuccess}</p>}
              <button onClick={submitCancel} disabled={!cancelDate || !cancelSlotId || cancelLoading}
                className="w-full bg-red-600 text-white font-display font-bold py-4 rounded-2xl disabled:opacity-40">
                {cancelLoading ? '…' : 'Cancelar clase'}
              </button>
            </div>
          </div>

          <div className="h-px bg-ink/8"/>

          {/* Crear invitación (código de registro) */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-3">Código de invitación</p>
            <div className="space-y-3">
              {[
                { label: 'Nombre', key: 'full_name', type: 'text', ph: 'Ana García' },
                { label: 'Teléfono', key: 'phone', type: 'tel', ph: '600 000 000' },
                { label: 'Código (vacío = automático)', key: 'code', type: 'text', ph: 'anagarcia42' },
              ].map(f => (
                <div key={f.key}>
                  <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">{f.label}</p>
                  <input type={f.type} placeholder={f.ph}
                    value={newInvite[f.key as keyof typeof newInvite]}
                    onChange={e => setNewInvite(v => ({ ...v, [f.key]: e.target.value }))}
                    className="card w-full font-mono text-sm px-4 py-3 text-navy outline-none"/>
                </div>
              ))}
              <div>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Plan</p>
                <select value={newInvite.plan_id} onChange={e => setNewInvite(v => ({ ...v, plan_id: e.target.value }))}
                  className="card w-full font-mono text-sm px-4 py-3 text-navy outline-none">
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {inviteError   && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{inviteError}</p>}
              {inviteSuccess && <div className="bg-green-50 rounded-xl px-4 py-3">
                <p className="text-sm text-green-700 font-mono font-bold">{inviteSuccess}</p>
                <p className="text-xs text-green-600 mt-0.5">Comparte este código para registrarse.</p>
              </div>}
              <button onClick={createInvite} disabled={!newInvite.full_name || inviteLoading}
                className="w-full bg-navy text-paper font-display font-bold py-4 rounded-2xl disabled:opacity-40">
                {inviteLoading ? '…' : 'Generar código'}
              </button>
            </div>

            {inviteCodes.filter(c => !c.is_used).length > 0 && (
              <div className="mt-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-2">
                  Pendientes ({inviteCodes.filter(c => !c.is_used).length})
                </p>
                <div className="space-y-2">
                  {inviteCodes.filter(c => !c.is_used).map(c => (
                    <div key={c.id} className="card px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-display font-bold text-navy text-sm">{c.full_name}</p>
                        <p className="font-mono text-[9px] text-ink/40 mt-0.5">{c.plan_id}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue bg-blue/10 px-2.5 py-1 rounded-xl tracking-wider">{c.code}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REGISTRO ─────────────────────────────────── */}
      {tab === 'registro' && (
        loadingReg ? <Spinner/> : (
          <div className="space-y-8">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-3">
                Ausencias · últimos 30 días ({absenceLog.length})
              </p>
              {absenceLog.length === 0 ? (
                <Empty text="Sin ausencias registradas"/>
              ) : (
                <div className="space-y-1.5">
                  {absenceLog.map(a => <HistorialRow key={a.id} item={a} type="absence"/>)}
                </div>
              )}
            </div>
            <div className="h-px bg-ink/8"/>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-3">
                Recuperaciones · últimos 30 días ({recoveryLog.length})
              </p>
              {recoveryLog.length === 0 ? (
                <Empty text="Sin recuperaciones registradas"/>
              ) : (
                <div className="space-y-1.5">
                  {recoveryLog.map(r => <HistorialRow key={r.id} item={r} type="recovery"/>)}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  )
}

// ─── Micro-componentes ────────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/></div>
}
function Empty({ text }: { text: string }) {
  return <div className="text-center py-16 text-ink/30 font-mono text-sm">{text}</div>
}
function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="w-9 h-9 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-navy font-bold shadow-sm active:scale-95 transition-transform">
      {children}
    </button>
  )
}
function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className="font-display font-bold text-2xl text-navy">{value}</p>
      <p className="font-mono text-[9px] text-ink/40 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}
function HistorialRow({ item, type }: { item: { id: string; class_date: string; profiles: { full_name: string; username: string | null }; schedule_slots: { start_time: string; class_types: { name: string; color: string } } | null }; type: 'absence' | 'recovery' }) {
  const ct = item.schedule_slots?.class_types
  return (
    <div className="card overflow-hidden flex">
      {ct && <div className="w-1 flex-shrink-0" style={{ backgroundColor: ct.color }}/>}
      <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <p className="font-display font-bold text-navy text-xs">{item.profiles.full_name}</p>
          <p className="font-mono text-[9px] text-ink/40 mt-0.5">
            {ct ? `${ct.name} · ${item.schedule_slots!.start_time.slice(0,5)}h` : '—'}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full ${type === 'absence' ? 'bg-amber-50 text-amber-700' : 'bg-blue/10 text-blue'}`}>
            {type === 'absence' ? 'Falta' : 'Recup.'}
          </span>
          <p className="font-mono text-[8px] text-ink/30 mt-0.5">
            {new Date(item.class_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── ClientCard ───────────────────────────────────────────────────────────────
function ClientCard({
  client, plans, isExpanded, isEditing, isDeleting, onToggleExpand, onToggleEdit, onUpdatePayment, onUpdateProfile, onPaymentRefresh, onDelete,
}: {
  client: ClientRow
  plans: Plan[]
  isExpanded: boolean
  isEditing: boolean
  isDeleting: boolean
  onToggleExpand: () => void
  onToggleEdit: () => void
  onUpdatePayment: (u: Partial<Pick<ClientRow, 'payment_status' | 'last_payment_date' | 'notes' | 'plan_id' | 'schedule_type'>>) => void
  onUpdateProfile: (u: { full_name?: string; username?: string; phone?: string; password?: string; birthday?: string | null }) => Promise<Response>
  onPaymentRefresh: () => void
  onDelete: () => void
}) {
  const [draft, setDraft]         = useState({ full_name: client.full_name, username: client.username ?? '', phone: client.phone ?? '', birthday: client.birthday ?? '' })
  const [newPw, setNewPw]         = useState('')
  const [profileSaving, setPSav]  = useState(false)
  const [profileError, setPErr]   = useState('')

  // Histórico de pagos (lazy)
  const [payments, setPayments]    = useState<PaymentRow[]>([])
  const [paymentsLoaded, setPLoad] = useState(false)
  const [paymentsLoading, setPLoading] = useState(false)

  // Modal registrar pago
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [payNotes, setPayNotes]   = useState('')
  const [paySaving, setPaySaving] = useState(false)

  // Modal mensaje
  const [showMsgModal, setShowMsgModal] = useState(false)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody,  setMsgBody]  = useState('')
  const [msgSaving, setMsgSaving] = useState(false)

  // Cargar pagos cuando se expande por primera vez
  if (isExpanded && !paymentsLoaded && !paymentsLoading) {
    setPLoading(true)
    fetch(`/api/admin/payments?user_id=${client.id}&limit=10`)
      .then(r => r.json())
      .then(d => { setPayments(d.payments ?? []); setPLoaded(true) })
      .finally(() => setPLoading(false))
  }
  function setPLoaded(v: boolean) { setPLoad(v) }

  async function saveProfile() {
    setPSav(true); setPErr('')
    const updates: Record<string, string | null> = {
      full_name: draft.full_name,
      username:  draft.username,
      phone:     draft.phone,
      birthday:  draft.birthday || null,
    }
    if (newPw) updates.password = newPw
    const res = await onUpdateProfile(updates)
    if (!res.ok) { const j = await res.json(); setPErr(j.error) }
    else setNewPw('')
    setPSav(false)
  }

  async function registerPayment() {
    setPaySaving(true)
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: client.id,
        amount: payAmount ? parseFloat(payAmount) : null,
        method: payMethod || null,
        notes:  payNotes || null,
      }),
    })
    setPaySaving(false)
    if (res.ok) {
      setShowPayModal(false)
      setPayAmount(''); setPayMethod(''); setPayNotes('')
      setPLoaded(false) // forzar recarga
      onPaymentRefresh() // refresca el card padre (status al_dia)
    }
  }

  async function sendMessage() {
    if (!msgTitle.trim()) return
    setMsgSaving(true)
    const res = await fetch('/api/admin/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: client.id, title: msgTitle.trim(), body: msgBody.trim() || null }),
    })
    setMsgSaving(false)
    if (res.ok) {
      setShowMsgModal(false)
      setMsgTitle(''); setMsgBody('')
    }
  }

  // Helpers visuales
  const today = new Date()
  const daysSinceActivity = client.last_activity
    ? Math.floor((today.getTime() - new Date(client.last_activity + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((today.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const isInactive = daysSinceActivity > 30 && client.regular_slots.length === 0

  // Cumpleaños próximo (próximos 30 días)
  let birthdayBadge: { label: string; soon: boolean } | null = null
  if (client.birthday) {
    const [, m, d] = client.birthday.split('-').map(Number)
    const thisYear = new Date(today.getFullYear(), m - 1, d)
    const target = thisYear < today ? new Date(today.getFullYear() + 1, m - 1, d) : thisYear
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) birthdayBadge = { label: '🎂 Hoy cumple', soon: true }
    else if (diff <= 7)  birthdayBadge = { label: `🎂 En ${diff}d`, soon: true }
    else if (diff <= 30) birthdayBadge = { label: `🎂 ${target.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`, soon: false }
  }

  // Cinta lateral según estado de pago
  const stripeColor =
    client.payment_status === 'al_dia'    ? '#9BC4BC' :
    client.payment_status === 'pendiente' ? '#E8C893' :
    /* atrasado */                          '#DC2626'

  return (
    <div className="card overflow-hidden flex">
      {/* Cinta lateral indicadora */}
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: stripeColor }}/>
      <div className="flex-1 px-4 py-4">
        <button onClick={onToggleExpand}
          className="w-full text-left flex items-start justify-between gap-3 active:opacity-70 transition-opacity">
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-navy text-base tracking-tight truncate">{client.full_name}</p>
            <p className="font-mono text-[11px] text-ink/55 mt-0.5">
              <span className="font-semibold text-brand-deep">{client.username ?? '—'}</span>
              <span className="text-ink/35"> · </span>
              {client.plan_name}
              {client.schedule_type === 'rotativo' && <span className="text-ink/35"> · rotativo</span>}
            </p>
            {client.phone && (
              <a href={`tel:${client.phone}`} onClick={e => e.stopPropagation()}
                className="font-mono text-[11px] text-ink/45 block mt-0.5 hover:text-brand-deep">{client.phone}</a>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`badge ${client.payment_status === 'al_dia' ? 'badge-success' : client.payment_status === 'pendiente' ? 'badge-warn' : 'badge-danger'}`}>
              {paymentLabel(client.payment_status)}
            </span>
            <span className="font-mono text-[10px] text-ink/45 tabular-nums">
              {client.recovery_used}/{client.recovery_max} {client.schedule_type === 'rotativo' ? 'res.' : 'rec.'}
            </span>
            {client.last_payment_date && (
              <span className="font-mono text-[9px] text-ink/35">
                Pago {new Date(client.last_payment_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
            <span className="font-mono text-[9px] text-brand/70">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Badges de aviso */}
        {(birthdayBadge || isInactive) && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {birthdayBadge && (
              <span className={`badge ${birthdayBadge.soon ? 'badge-warn' : 'badge-neutral'}`}>{birthdayBadge.label}</span>
            )}
            {isInactive && (
              <span className="badge badge-danger">Sin venir hace {Math.floor(daysSinceActivity / 7)} sem.</span>
            )}
          </div>
        )}

        {/* Acción rápida: registrar pago */}
        {client.payment_status !== 'al_dia' && (
          <button onClick={() => setShowPayModal(true)}
            className="mt-3 w-full font-mono text-[11px] uppercase tracking-widest font-bold text-emerald-800 bg-teal/30 hover:bg-teal/40 py-2 rounded-xl transition-colors active:scale-95">
            ✓ Registrar pago
          </button>
        )}

        {/* Detalle expandible */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-ink/5 space-y-3 animate-fade-in">
            {/* Clases fijas */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
                Clases fijas {client.schedule_type === 'rotativo' && '(no aplica · rotativa)'}
              </p>
              {client.regular_slots.length === 0 ? (
                <p className="font-mono text-[11px] text-ink/35 italic">
                  {client.schedule_type === 'rotativo' ? 'Reserva puntualmente cada semana' : 'Aún no se ha apuntado a ninguna'}
                </p>
              ) : (
                <div className="space-y-1">
                  {client.regular_slots.map((rs, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-paper">
                      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: rs.color }}/>
                      <span className="font-display text-sm text-ink">{rs.class_name}</span>
                      <span className="font-mono text-[10px] text-ink/45 ml-auto">
                        {DAY_NAMES[rs.day_of_week]} · {rs.start_time.slice(0,5)}h
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cupo del mes y asistencia estimada */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded-xl bg-paper">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45">
                  {client.schedule_type === 'rotativo' ? 'Reservas mes' : 'Recup. mes'}
                </p>
                <p className="font-display text-lg font-semibold text-brand-deep tabular-nums leading-none mt-1">
                  {client.recovery_used}<span className="text-brand-deep/35 text-base">/{client.recovery_max}</span>
                </p>
              </div>
              <div className="px-3 py-2 rounded-xl bg-paper">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45">Asistencia mes</p>
                <p className="font-display text-lg font-semibold text-emerald-800 tabular-nums leading-none mt-1">
                  ~{client.attended_estimate}
                  {client.attended_max > 0 && <span className="text-emerald-800/35 text-base">/{client.attended_max}</span>}
                </p>
                <p className="font-mono text-[9px] text-ink/35 mt-1">estimado</p>
              </div>
            </div>

            {/* Datos secundarios */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="px-3 py-2 rounded-xl bg-paper">
                <p className="text-[9px] uppercase tracking-widest text-ink/40">Miembro desde</p>
                <p className="text-ink/75 mt-0.5 capitalize">
                  {client.created_at ? format(new Date(client.created_at), "MMM yyyy", { locale: es }) : '—'}
                </p>
              </div>
              <div className="px-3 py-2 rounded-xl bg-paper">
                <p className="text-[9px] uppercase tracking-widest text-ink/40">Último pago</p>
                <p className="text-ink/75 mt-0.5">
                  {client.last_payment_date ? new Date(client.last_payment_date + 'T00:00:00').toLocaleDateString('es-ES') : '—'}
                </p>
              </div>
              {client.birthday && (
                <div className="px-3 py-2 rounded-xl bg-paper col-span-2">
                  <p className="text-[9px] uppercase tracking-widest text-ink/40">Cumpleaños</p>
                  <p className="text-ink/75 mt-0.5 capitalize">
                    {format(new Date(client.birthday + 'T12:00:00'), "d 'de' MMMM", { locale: es })}
                  </p>
                </div>
              )}
            </div>

            {/* Histórico de pagos */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
                Pagos recientes
              </p>
              {paymentsLoading ? (
                <p className="text-xs text-ink/35 font-mono text-center py-2">Cargando…</p>
              ) : payments.length === 0 ? (
                <p className="text-xs text-ink/35 font-mono italic">Sin pagos registrados</p>
              ) : (
                <div className="space-y-1">
                  {payments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-paper">
                      <div className="min-w-0">
                        <p className="font-display text-sm text-ink tabular-nums">
                          {p.amount != null ? `${p.amount.toFixed(2)}€` : 'Pago registrado'}
                          {p.method && <span className="text-ink/45 font-mono text-[11px] ml-2">· {p.method}</span>}
                        </p>
                        {p.notes && <p className="font-mono text-[10px] text-ink/45 mt-0.5 truncate">{p.notes}</p>}
                      </div>
                      <span className="font-mono text-[10px] text-ink/45 flex-shrink-0">
                        {new Date(p.paid_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowPayModal(true)}
                className="w-full mt-2 font-mono text-[10px] uppercase tracking-widest font-bold text-brand-deep bg-brand/10 hover:bg-brand/15 py-2 rounded-xl transition-colors">
                + Registrar nuevo pago
              </button>
            </div>

            {/* Botón mensaje directo */}
            <button onClick={() => setShowMsgModal(true)}
              className="w-full font-mono text-[11px] uppercase tracking-widest font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 py-2.5 rounded-xl transition-colors border border-amber-100">
              💬 Enviar mensaje
            </button>

            {/* Notas */}
            {client.notes && (
              <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <p className="font-mono text-[9px] uppercase tracking-widest text-amber-800 mb-1">Notas</p>
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={onToggleEdit} className="font-mono text-[11px] uppercase tracking-widest font-bold text-brand-deep underline-offset-2 hover:underline">
                {isEditing ? '↑ Cerrar edición' : 'Editar'}
              </button>
              <button onClick={onDelete} disabled={isDeleting}
                className="font-mono text-[11px] uppercase tracking-widest font-bold text-red-500 disabled:opacity-40 underline-offset-2 hover:underline ml-auto">
                {isDeleting ? '…' : 'Eliminar'}
              </button>
            </div>
          </div>
        )}

        {isExpanded && isEditing && (
          <div className="mt-3 pt-3 border-t border-ink/5 space-y-3">
            {/* Datos personales */}
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink/30">Datos personales</p>
            {[
              { label: 'Nombre completo', key: 'full_name' as const },
              { label: 'Usuario', key: 'username' as const },
              { label: 'Teléfono', key: 'phone' as const },
            ].map(f => (
              <div key={f.key}>
                <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">{f.label}</p>
                <input type="text" value={draft[f.key]}
                  onChange={e => setDraft(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
              </div>
            ))}
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Cumpleaños</p>
              <input type="date" value={draft.birthday}
                onChange={e => setDraft(v => ({ ...v, birthday: e.target.value }))}
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Nueva contraseña (dejar vacío = no cambiar)</p>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
            </div>
            {profileError && <p className="text-xs text-red-600">{profileError}</p>}
            <button onClick={saveProfile} disabled={profileSaving}
              className="w-full bg-ink/10 text-navy font-mono text-xs py-2 rounded-xl disabled:opacity-40">
              {profileSaving ? 'Guardando…' : 'Guardar datos personales'}
            </button>

            {/* Datos de pago */}
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink/30 pt-1">Plan y pagos</p>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Plan</p>
              <select value={client.plan_id} onChange={e => onUpdatePayment({ plan_id: e.target.value })}
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Tipo de horario</p>
              <select value={client.schedule_type} onChange={e => onUpdatePayment({ schedule_type: e.target.value as 'fijo' | 'rotativo' })}
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                <option value="fijo">Horario fijo</option>
                <option value="rotativo">Turnos rotativos</option>
              </select>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Estado de pago</p>
              <select value={client.payment_status} onChange={e => onUpdatePayment({ payment_status: e.target.value as ClientRow['payment_status'] })}
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none">
                <option value="al_dia">Al día</option>
                <option value="pendiente">Pendiente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Fecha último pago</p>
              <input type="date" value={client.last_payment_date ?? ''}
                onChange={e => onUpdatePayment({ last_payment_date: e.target.value || null })}
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"/>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Notas internas</p>
              <textarea
                defaultValue={client.notes ?? ''}
                onBlur={e => onUpdatePayment({ notes: e.target.value || null })}
                rows={2} placeholder="Notas visibles solo para ti..."
                className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none resize-none"/>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: registrar pago ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-end animate-fade-in"
          style={{ background: 'rgba(7,21,58,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowPayModal(false)}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-10 animate-spring-in"
            style={{ boxShadow: '0 -16px 60px rgba(7,21,58,0.35)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full mx-auto mb-5 bg-ink/15"/>
            <p className="page-eyebrow">{client.full_name}</p>
            <h2 className="page-title text-2xl"><em>Registrar</em> pago</h2>

            <div className="space-y-3 mt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-1">Importe (€)</p>
                <input type="number" step="0.01" placeholder="Opcional" inputMode="decimal"
                  value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="input-field"/>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-1">Método</p>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="input-field">
                  <option value="">— Seleccionar —</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="bizum">Bizum</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-1">Notas (opcional)</p>
                <textarea rows={2} value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  placeholder="Ej: cubre mes de mayo · pagó en mano…"
                  className="input-field resize-none"/>
              </div>

              <button onClick={registerPayment} disabled={paySaving} className="btn-primary mt-3">
                {paySaving ? 'Registrando…' : '✓ Registrar pago'}
              </button>
              <button onClick={() => setShowPayModal(false)}
                className="w-full text-center text-[11px] text-ink/40 py-2 font-mono uppercase tracking-widest">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: enviar mensaje ── */}
      {showMsgModal && (
        <div className="fixed inset-0 z-50 flex items-end animate-fade-in"
          style={{ background: 'rgba(7,21,58,0.45)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowMsgModal(false)}>
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl px-6 pt-5 pb-10 animate-spring-in"
            style={{ boxShadow: '0 -16px 60px rgba(7,21,58,0.35)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 rounded-full mx-auto mb-5 bg-ink/15"/>
            <p className="page-eyebrow">Mensaje a {client.full_name}</p>
            <h2 className="page-title text-2xl"><em>Enviar</em> aviso</h2>

            <div className="space-y-3 mt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-1">Título *</p>
                <input type="text" value={msgTitle} onChange={e => setMsgTitle(e.target.value)}
                  placeholder="Ej: Recordatorio de pago"
                  maxLength={120}
                  className="input-field"/>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-1">Mensaje (opcional)</p>
                <textarea rows={3} value={msgBody} onChange={e => setMsgBody(e.target.value)}
                  placeholder="Escribe el detalle…"
                  maxLength={500}
                  className="input-field resize-none"/>
              </div>

              <p className="font-mono text-[10px] text-ink/45 leading-relaxed">
                Aparecerá como notificación in-app en su sección Avisos.
              </p>

              <button onClick={sendMessage} disabled={msgSaving || !msgTitle.trim()} className="btn-primary mt-3">
                {msgSaving ? 'Enviando…' : '💬 Enviar mensaje'}
              </button>
              <button onClick={() => setShowMsgModal(false)}
                className="w-full text-center text-[11px] text-ink/40 py-2 font-mono uppercase tracking-widest">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
