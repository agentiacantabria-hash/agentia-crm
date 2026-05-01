'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, startOfMonth, getISOWeek } from 'date-fns'
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

type RegularRow  = { slot_id: string; user_id: string; week_parity: string; profiles: { full_name: string; username: string | null } }
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

  return (
    <div className={`card overflow-hidden flex ${cv.isCancelled ? 'opacity-40' : ''}`}>
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: cv.slot.class_types.color }}/>
      <div className="flex-1 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display font-bold text-navy text-sm">{cv.slot.class_types.name}</p>
            <p className="font-mono text-[10px] text-ink/40">{cv.slot.start_time.slice(0, 5)}h</p>
          </div>
          <div className="flex items-center gap-2">
            {cv.isCancelled && <span className="font-mono text-[9px] text-red-500 uppercase tracking-wider">Cancelada</span>}
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full
              ${cv.attendees.length >= cv.slot.max_capacity ? 'bg-navy/10 text-navy' : 'bg-ink/5 text-ink/50'}`}>
              {cv.attendees.length}/{cv.slot.max_capacity}
            </span>
            {!cv.isCancelled && allClients && (
              <button onClick={() => setShowAdd(v => !v)}
                className="w-6 h-6 rounded-full bg-navy/10 text-navy font-bold text-sm flex items-center justify-center leading-none">
                {showAdd ? '−' : '+'}
              </button>
            )}
          </div>
        </div>

        {cv.attendees.length > 0 ? (
          <div className="flex flex-col gap-1">
            {cv.attendees.map(a => (
              <div key={a.user_id} className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0
                  ${a.type === 'recovery' ? 'bg-blue/10 text-blue' : 'bg-paper-2 text-ink/60'}`}>
                  {a.full_name.split(' ')[0]}{a.username ? ` (${a.username})` : ''}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.type === 'regular' && !cv.isCancelled && (
                    <button onClick={() => markAbsent(a.user_id)} disabled={markingId === a.user_id}
                      className="text-[9px] font-mono text-amber-500 disabled:opacity-40">
                      {markingId === a.user_id ? '…' : '✗ falta'}
                    </button>
                  )}
                  {!cv.isCancelled && (
                    <button onClick={() => removeAttendee(a)} disabled={removingId === a.user_id}
                      className="text-[9px] font-mono text-red-400 disabled:opacity-40">
                      {removingId === a.user_id ? '…' : a.type === 'regular' ? '✗ quitar fija' : '✗ quitar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          !cv.isCancelled && <p className="text-[10px] font-mono text-ink/30">Sin asistentes confirmados</p>
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
    const weekIsEven = getISOWeek(new Date()) % 2 === 0

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
      sb.from('regular_slots').select('slot_id, user_id, week_parity, profiles(full_name, username)').in('slot_id', slotIds),
      sb.from('absences').select('slot_id, user_id').eq('class_date', todayDate).in('slot_id', slotIds),
      sb.from('recovery_bookings').select('slot_id, user_id, profiles(full_name, username)').eq('class_date', todayDate).eq('status', 'confirmed').in('slot_id', slotIds),
      sb.from('cancelled_classes').select('slot_id').eq('class_date', todayDate).in('slot_id', slotIds),
    ])

    const cancelledIds = new Set((cancelledToday ?? []).map((c: { slot_id: string }) => c.slot_id))
    const absentSet    = new Set((absencesToday ?? []).map((a: { slot_id: string; user_id: string }) => `${a.slot_id}|${a.user_id}`))
    const typedReg     = ((regularAll   ?? []) as unknown as RegularRow[])
    const typedRec     = ((recoveriesTotal ?? []) as unknown as RecoveryRow[])

    const classes: ClassView[] = (rawSlots ?? []).map((slot: ScheduleSlot) => {
      const regulars = typedReg.filter(r => {
        if (r.slot_id !== slot.id || absentSet.has(`${slot.id}|${r.user_id}`)) return false
        return r.week_parity === 'all' || (r.week_parity === 'even') === weekIsEven
      }).map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

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
    const weekIsEven = getISOWeek(weekStart) % 2 === 0

    const [
      { data: rawSlots }, { data: regularAll }, { data: absencesAll },
      { data: recoveriesAll }, { data: cancelledAll },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, user_id, week_parity, profiles(full_name, username)'),
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
        const regulars = typedReg.filter(r => {
          if (r.slot_id !== slot.id || absentSet.has(`${slot.id}|${dateStr}|${r.user_id}`)) return false
          return r.week_parity === 'all' || (r.week_parity === 'even') === weekIsEven
        }).map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

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
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient]        = useState({ username: '', password: '', full_name: '', phone: '', plan_id: '2x', schedule_type: 'fijo' })
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
    ] = await Promise.all([
      sb.from('profiles').select('*, plans(*)').eq('is_admin', false).order('full_name', { ascending: true }),
      sb.from('recovery_bookings').select('user_id').eq('status', 'confirmed').gte('class_date', monthStart),
    ])

    const byUser: Record<string, number> = {}
    recoveryUsage?.forEach((r: { user_id: string }) => { byUser[r.user_id] = (byUser[r.user_id] ?? 0) + 1 })

    setClients((profiles ?? []).map((p: {
      id: string; full_name: string; username: string | null; phone: string | null
      plan_id: string; payment_status: string; last_payment_date: string | null; notes: string | null
      schedule_type: string | null
      plans: { name: string; max_recoveries_per_month: number } | null
    }) => ({
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
      recovery_max:       p.plans?.max_recoveries_per_month ?? 0,
      schedule_type:      (p.schedule_type ?? 'fijo') as ClientRow['schedule_type'],
    })))
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

  async function updateClientProfile(userId: string, updates: { full_name?: string; username?: string; phone?: string; password?: string }) {
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
    setNewClient({ username: '', password: '', full_name: '', phone: '', plan_id: '2x', schedule_type: 'fijo' })
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
    const weekIsEven = getISOWeek(ws) % 2 === 0

    const [
      { data: rawSlots }, { data: regularAll }, { data: absencesAll },
      { data: recoveriesAll }, { data: cancelledAll },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, user_id, week_parity'),
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
        const regularCount = (regularAll ?? []).filter((r: { slot_id: string; user_id: string; week_parity: string }) => {
          if (r.slot_id !== slot.id || absentIds.has(r.user_id)) return false
          return r.week_parity === 'all' || (r.week_parity === 'even') === weekIsEven
        }).length
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

  const TAB_LABELS: Record<Tab, string> = {
    hoy: 'Hoy', semana: 'Semana', clientes: 'Clientes', horario: 'Horario', stats: 'Stats', gestion: 'Gestión', registro: 'Registro',
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-28">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Panel</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-4">Admin</h1>

      {/* Tabs — scrollable */}
      <div className="flex gap-0.5 mb-6 bg-paper-2 p-1 rounded-2xl overflow-x-auto">
        {(['hoy', 'semana', 'clientes', 'horario', 'stats', 'gestion', 'registro'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl font-mono text-[8px] uppercase tracking-wider transition-colors whitespace-nowrap
              ${tab === t ? 'bg-white text-navy font-bold shadow-sm' : 'text-ink/40'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
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
      {tab === 'clientes' && (
        <div>
          {/* Botón nuevo cliente */}
          <button onClick={() => setShowNewClient(v => !v)}
            className="w-full mb-4 bg-navy text-paper font-display font-bold py-3 rounded-2xl text-sm">
            {showNewClient ? 'Cancelar' : '+ Nuevo cliente'}
          </button>

          {/* Formulario nuevo cliente */}
          {showNewClient && (
            <div className="card px-4 py-4 mb-4 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40">Crear cliente</p>
              <p className="font-mono text-[9px] text-ink/30 leading-relaxed">
                El usuario es el código con el que entrará a la app. No se usa email.
              </p>
              {[
                { label: 'Nombre completo *', key: 'full_name', type: 'text', placeholder: 'Ana García' },
                { label: 'Usuario (código de acceso) *', key: 'username', type: 'text', placeholder: 'anagarcia' },
                { label: 'Contraseña *', key: 'password', type: 'password', placeholder: 'Mínimo 6 caracteres' },
                { label: 'Teléfono (opcional)', key: 'phone', type: 'tel', placeholder: '600 000 000' },
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
                className="w-full bg-navy text-paper font-display font-bold py-3 rounded-2xl disabled:opacity-40">
                {newClientLoading ? 'Creando…' : 'Crear cliente'}
              </button>
            </div>
          )}

          {loadingCli ? <Spinner/> : clients.length === 0 ? <Empty text="Sin clientes"/> : (
            <div className="space-y-2">
              {clients.some(c => c.payment_status !== 'al_dia') && (
                <div className="bg-amber-50 rounded-2xl px-4 py-3 mb-3 flex items-center gap-2">
                  <span className="text-amber-600">⚠</span>
                  <p className="font-mono text-xs text-amber-700">
                    {clients.filter(c => c.payment_status === 'atrasado').length} atrasado(s) ·{' '}
                    {clients.filter(c => c.payment_status === 'pendiente').length} pendiente(s)
                  </p>
                </div>
              )}
              {clients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  plans={plans}
                  isEditing={editingId === client.id}
                  isDeleting={deletingId === client.id}
                  onToggleEdit={() => setEditingId(editingId === client.id ? null : client.id)}
                  onUpdatePayment={updates => updateClientPayment(client.id, updates)}
                  onUpdateProfile={updates => updateClientProfile(client.id, updates)}
                  onDelete={() => deleteClient(client.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

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
  client, plans, isEditing, isDeleting, onToggleEdit, onUpdatePayment, onUpdateProfile, onDelete,
}: {
  client: ClientRow
  plans: Plan[]
  isEditing: boolean
  isDeleting: boolean
  onToggleEdit: () => void
  onUpdatePayment: (u: Partial<Pick<ClientRow, 'payment_status' | 'last_payment_date' | 'notes' | 'plan_id' | 'schedule_type'>>) => void
  onUpdateProfile: (u: { full_name?: string; username?: string; phone?: string; password?: string }) => Promise<Response>
  onDelete: () => void
}) {
  const [draft, setDraft]         = useState({ full_name: client.full_name, username: client.username ?? '', phone: client.phone ?? '' })
  const [newPw, setNewPw]         = useState('')
  const [profileSaving, setPSav]  = useState(false)
  const [profileError, setPErr]   = useState('')

  async function saveProfile() {
    setPSav(true); setPErr('')
    const updates: Record<string, string> = {
      full_name: draft.full_name,
      username:  draft.username,
      phone:     draft.phone,
    }
    if (newPw) updates.password = newPw
    const res = await onUpdateProfile(updates)
    if (!res.ok) { const j = await res.json(); setPErr(j.error) }
    else setNewPw('')
    setPSav(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-display font-bold text-navy text-sm truncate">{client.full_name}</p>
            <p className="font-mono text-[10px] text-ink/40 mt-0.5">
              {client.username ?? '—'} · {client.plan_name}
            </p>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="font-mono text-[10px] text-ink/40 block mt-0.5">{client.phone}</a>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${paymentBadgeClass(client.payment_status)}`}>
              {paymentLabel(client.payment_status)}
            </span>
            {client.schedule_type === 'rotativo' && (
              <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Rotativo</span>
            )}
            <span className="font-mono text-[9px] text-ink/30">{client.recovery_used}/{client.recovery_max} recup.</span>
            {client.last_payment_date && (
              <span className="font-mono text-[9px] text-ink/30">
                Pago: {new Date(client.last_payment_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button onClick={onToggleEdit} className="text-[10px] font-mono text-ink/30 underline underline-offset-2">
            {isEditing ? 'Cerrar' : 'Editar'}
          </button>
          <button onClick={onDelete} disabled={isDeleting}
            className="text-[10px] font-mono text-red-400 underline underline-offset-2 disabled:opacity-40">
            {isDeleting ? '…' : 'Eliminar'}
          </button>
        </div>

        {isEditing && (
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
    </div>
  )
}
