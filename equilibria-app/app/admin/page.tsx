'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleSlot } from '@/lib/types'
import { MAX_CAPACITY } from '@/lib/types'

type Tab = 'hoy' | 'semana' | 'clientes' | 'cancelar'

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

type RegularRow  = { slot_id: string; user_id: string; profiles: { full_name: string; username: string | null } }
type RecoveryRow = { slot_id: string; class_date: string; user_id: string; profiles: { full_name: string; username: string | null } }

type ClientRow = {
  id: string
  full_name: string
  username: string | null
  phone: string | null
  plan_name: string
  payment_status: 'al_dia' | 'pendiente' | 'atrasado'
  last_payment_date: string | null
  notes: string | null
  recovery_used: number
  recovery_max: number
}

// ─── Subcomponent: card de clase ─────────────────────────────────────────────
function ClassCard({ cv }: { cv: ClassView }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden flex ${cv.isCancelled ? 'opacity-40' : ''}`}>
      <div className="w-2 flex-shrink-0" style={{ backgroundColor: cv.slot.class_types.color }}/>
      <div className="flex-1 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display font-bold text-navy text-sm">{cv.slot.class_types.name}</p>
            <p className="font-mono text-[10px] text-ink/40">{cv.slot.start_time.slice(0, 5)}h</p>
          </div>
          <div className="flex items-center gap-2">
            {cv.isCancelled && (
              <span className="font-mono text-[9px] text-red-500 uppercase tracking-wider">Cancelada</span>
            )}
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full
              ${cv.attendees.length >= MAX_CAPACITY ? 'bg-navy/10 text-navy' : 'bg-ink/5 text-ink/50'}`}>
              {cv.attendees.length}/{MAX_CAPACITY}
            </span>
          </div>
        </div>
        {cv.attendees.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cv.attendees.map(a => (
              <span key={a.user_id}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full
                  ${a.type === 'recovery' ? 'bg-blue/10 text-blue' : 'bg-paper-2 text-ink/60'}`}>
                {a.full_name.split(' ')[0]}{a.username ? ` (${a.username})` : ''}
              </span>
            ))}
          </div>
        ) : (
          !cv.isCancelled && <p className="text-[10px] font-mono text-ink/30">Sin asistentes confirmados</p>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function paymentBadgeClass(status: string) {
  if (status === 'al_dia')    return 'bg-green-50 text-green-700'
  if (status === 'pendiente') return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}
function paymentLabel(status: string) {
  if (status === 'al_dia')    return 'Al día'
  if (status === 'pendiente') return 'Pendiente'
  return 'Atrasado'
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('hoy')

  // ── Auth check
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      sb.from('profiles').select('is_admin').eq('id', user.id).single()
        .then(({ data }) => { if (!data?.is_admin) router.push('/horario') })
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
    const todayDate = format(new Date(), 'yyyy-MM-dd')

    const { data: rawSlots } = await sb
      .from('schedule_slots').select('*, class_types(*)')
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

    const typedRegular    = ((regularAll    ?? []) as unknown as RegularRow[])
    const typedRecoveries = ((recoveriesTotal ?? []) as unknown as RecoveryRow[])

    const classes: ClassView[] = (rawSlots ?? []).map((slot: ScheduleSlot) => {
      const regulars = typedRegular
        .filter(r => r.slot_id === slot.id && !absentSet.has(`${slot.id}|${r.user_id}`))
        .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

      const recoveries = typedRecoveries
        .filter(r => r.slot_id === slot.id)
        .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'recovery' as const }))

      return { slot, date: todayDate, isCancelled: cancelledIds.has(slot.id), attendees: [...regulars, ...recoveries] }
    }).sort((a: ClassView, b: ClassView) => a.slot.start_time.localeCompare(b.slot.start_time))

    setTodayClasses(classes)
    setLoadingHoy(false)
  }, [])

  // ══════════════════════════════════════════════════
  // TAB: SEMANA
  // ══════════════════════════════════════════════════
  const [weekStart, setWeekStart]     = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weekData, setWeekData]       = useState<DayView[]>([])
  const [loadingSemana, setLoadingSem] = useState(false)

  const loadSemana = useCallback(async () => {
    setLoadingSem(true)
    const sb = createClient()
    const dateFrom = format(weekStart, 'yyyy-MM-dd')
    const dateTo   = format(addDays(weekStart, 4), 'yyyy-MM-dd')

    const [
      { data: rawSlots },
      { data: regularAll },
      { data: absencesAll },
      { data: recoveriesAll },
      { data: cancelledAll },
    ] = await Promise.all([
      sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true),
      sb.from('regular_slots').select('slot_id, user_id, profiles(full_name, username)'),
      sb.from('absences').select('slot_id, class_date, user_id').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('recovery_bookings').select('slot_id, class_date, user_id, profiles(full_name, username)').eq('status', 'confirmed').gte('class_date', dateFrom).lte('class_date', dateTo),
      sb.from('cancelled_classes').select('slot_id, class_date').gte('class_date', dateFrom).lte('class_date', dateTo),
    ])

    const absentSet    = new Set((absencesAll ?? []).map((a: { slot_id: string; class_date: string; user_id: string }) => `${a.slot_id}|${a.class_date}|${a.user_id}`))
    const cancelledSet = new Set((cancelledAll ?? []).map((c: { slot_id: string; class_date: string }) => `${c.slot_id}|${c.class_date}`))

    const days: DayView[] = []
    for (let i = 0; i < 5; i++) {
      const date    = addDays(weekStart, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dow     = i + 1
      const label   = format(date, "EEEE d 'de' MMMM", { locale: es })

      const daySlots = (rawSlots ?? []).filter((s: ScheduleSlot) => s.day_of_week === dow)
      if (!daySlots.length) continue

      const typedReg = ((regularAll  ?? []) as unknown as RegularRow[])
      const typedRec = ((recoveriesAll ?? []) as unknown as RecoveryRow[])

      const classes: ClassView[] = daySlots.map((slot: ScheduleSlot) => {
        const regulars = typedReg
          .filter(r => r.slot_id === slot.id && !absentSet.has(`${slot.id}|${dateStr}|${r.user_id}`))
          .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'regular' as const }))

        const recoveries = typedRec
          .filter(r => r.slot_id === slot.id && r.class_date === dateStr)
          .map(r => ({ user_id: r.user_id, full_name: r.profiles.full_name, username: r.profiles.username, type: 'recovery' as const }))

        return { slot, date: dateStr, isCancelled: cancelledSet.has(`${slot.id}|${dateStr}`), attendees: [...regulars, ...recoveries] }
      }).sort((a: ClassView, b: ClassView) => a.slot.start_time.localeCompare(b.slot.start_time))

      days.push({ date: dateStr, label, classes })
    }

    setWeekData(days)
    setLoadingSem(false)
  }, [weekStart])

  // ══════════════════════════════════════════════════
  // TAB: CLIENTES
  // ══════════════════════════════════════════════════
  const [clients, setClients]             = useState<ClientRow[]>([])
  const [loadingClientes, setLoadingCli]  = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)

  const loadClientes = useCallback(async () => {
    setLoadingCli(true)
    const sb = createClient()
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')

    const [
      { data: profiles },
      { data: recoveryUsage },
    ] = await Promise.all([
      sb.from('profiles').select('*, plans(*)').eq('is_admin', false).order('full_name'),
      sb.from('recovery_bookings').select('user_id').eq('status', 'confirmed').gte('class_date', monthStart),
    ])

    const byUser: Record<string, number> = {}
    recoveryUsage?.forEach((r: { user_id: string }) => { byUser[r.user_id] = (byUser[r.user_id] ?? 0) + 1 })

    setClients((profiles ?? []).map((p: {
      id: string; full_name: string; username: string | null; phone: string | null
      plan_id: string; payment_status: string; last_payment_date: string | null; notes: string | null
      plans: { name: string; max_recoveries_per_month: number } | null
    }) => ({
      id:                  p.id,
      full_name:           p.full_name,
      username:            p.username,
      phone:               p.phone,
      plan_name:           p.plans?.name ?? '—',
      payment_status:      (p.payment_status ?? 'al_dia') as ClientRow['payment_status'],
      last_payment_date:   p.last_payment_date ?? null,
      notes:               p.notes ?? null,
      recovery_used:       byUser[p.id] ?? 0,
      recovery_max:        p.plans?.max_recoveries_per_month ?? 0,
    })))

    setLoadingCli(false)
  }, [])

  async function updateClient(userId: string, updates: Partial<Pick<ClientRow, 'payment_status' | 'last_payment_date' | 'notes'>>) {
    await fetch('/api/admin/update-client', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...updates }),
    })
    setClients(prev => prev.map(c => c.id === userId ? { ...c, ...updates } : c))
  }

  // ══════════════════════════════════════════════════
  // TAB: CANCELAR
  // ══════════════════════════════════════════════════
  const [cancelAllSlots, setCancelAllSlots] = useState<ScheduleSlot[]>([])
  const [cancelDate, setCancelDate]         = useState('')
  const [cancelSlotId, setCancelSlotId]     = useState('')
  const [cancelReason, setCancelReason]     = useState('')
  const [cancelLoading, setCancelLoading]   = useState(false)
  const [cancelError, setCancelError]       = useState('')
  const [cancelSuccess, setCancelSuccess]   = useState('')

  const loadCancelar = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('schedule_slots').select('*, class_types(*)').eq('is_active', true)
    setCancelAllSlots((data ?? []) as ScheduleSlot[])
  }, [])

  async function submitCancel() {
    if (!cancelDate || !cancelSlotId) return
    setCancelLoading(true); setCancelError(''); setCancelSuccess('')
    const res = await fetch('/api/admin/cancel-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: cancelSlotId, class_date: cancelDate, reason: cancelReason || null }),
    })
    const json = await res.json()
    if (!res.ok) { setCancelError(json.error); setCancelLoading(false); return }
    setCancelSuccess('Clase cancelada. Se han devuelto los créditos afectados.')
    setCancelDate(''); setCancelSlotId(''); setCancelReason('')
    setCancelLoading(false)
  }

  // ── Cargar según tab
  useEffect(() => {
    if (tab === 'hoy')      loadHoy()
    if (tab === 'semana')   loadSemana()
    if (tab === 'clientes') loadClientes()
    if (tab === 'cancelar') loadCancelar()
  }, [tab, loadHoy, loadSemana, loadClientes, loadCancelar])

  // Hoy se carga al montar
  useEffect(() => { loadHoy() }, [loadHoy])

  // Fechas para cancelar (próximos 14 días laborables)
  const cancelDateOptions = Array.from({ length: 21 }, (_, i) => {
    const d   = addDays(new Date(), i)
    const dow = d.getDay()
    if (dow === 0 || dow === 6) return null
    return { value: format(d, 'yyyy-MM-dd'), label: format(d, "EEEE d 'de' MMM", { locale: es }) }
  }).filter(Boolean) as { value: string; label: string }[]

  const cancelSlotsForDate = cancelDate
    ? cancelAllSlots.filter(s => s.day_of_week === new Date(cancelDate + 'T00:00:00').getDay())
    : []

  // ── Render
  return (
    <div className="max-w-lg mx-auto px-4 pt-10 pb-28">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Panel</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-4">Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-paper-2 p-1 rounded-2xl">
        {(['hoy', 'semana', 'clientes', 'cancelar'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-xl font-mono text-[9px] uppercase tracking-wider transition-colors
              ${tab === t ? 'bg-white text-navy font-bold shadow-sm' : 'text-ink/40'}`}>
            {t === 'hoy' ? 'Hoy' : t === 'semana' ? 'Semana' : t === 'clientes' ? 'Clientes' : 'Cancelar'}
          </button>
        ))}
      </div>

      {/* ─── HOY ──────────────────────────────────────── */}
      {tab === 'hoy' && (
        loadingHoy ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/></div>
        ) : isWeekend ? (
          <div className="text-center py-16 text-ink/30 font-mono text-sm">Hoy es fin de semana — sin clases</div>
        ) : todayClasses.length === 0 ? (
          <div className="text-center py-16 text-ink/30 font-mono text-sm">Sin clases programadas hoy</div>
        ) : (
          <div className="space-y-3">
            {todayClasses.map(cv => <ClassCard key={cv.slot.id} cv={cv}/>)}
          </div>
        )
      )}

      {/* ─── SEMANA ───────────────────────────────────── */}
      {tab === 'semana' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              className="w-8 h-8 rounded-full bg-paper-2 flex items-center justify-center text-navy font-bold">‹</button>
            <span className="flex-1 text-center font-mono text-xs text-ink/50">
              {format(weekStart, "d MMM", { locale: es })} — {format(addDays(weekStart, 4), "d MMM", { locale: es })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              className="w-8 h-8 rounded-full bg-paper-2 flex items-center justify-center text-navy font-bold">›</button>
          </div>
          {loadingSemana ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/></div>
          ) : weekData.length === 0 ? (
            <div className="text-center py-16 text-ink/30 font-mono text-sm">Sin clases programadas</div>
          ) : (
            <div className="space-y-6">
              {weekData.map(day => (
                <div key={day.date}>
                  <h2 className="font-display font-bold text-lg text-navy capitalize mb-3">{day.label}</h2>
                  <div className="space-y-2">
                    {day.classes.map(cv => <ClassCard key={cv.slot.id + cv.date} cv={cv}/>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── CLIENTES ─────────────────────────────────── */}
      {tab === 'clientes' && (
        loadingClientes ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/></div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-ink/30 font-mono text-sm">Sin clientes registrados</div>
        ) : (
          <div className="space-y-2">
            {/* Resumen deuda */}
            {clients.some(c => c.payment_status !== 'al_dia') && (
              <div className="bg-amber-50 rounded-2xl px-4 py-3 mb-3 flex items-center gap-2">
                <span className="text-amber-600 text-lg">⚠</span>
                <p className="font-mono text-xs text-amber-700">
                  {clients.filter(c => c.payment_status === 'atrasado').length} atrasado(s) ·{' '}
                  {clients.filter(c => c.payment_status === 'pendiente').length} pendiente(s)
                </p>
              </div>
            )}
            {clients.map(client => (
              <div key={client.id} className="bg-white rounded-2xl overflow-hidden">
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-display font-bold text-navy text-sm truncate">{client.full_name}</p>
                      <p className="font-mono text-[10px] text-ink/40 mt-0.5">
                        {client.username ?? '—'} · {client.plan_name}
                      </p>
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="font-mono text-[10px] text-ink/40 block mt-0.5">
                          {client.phone}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${paymentBadgeClass(client.payment_status)}`}>
                        {paymentLabel(client.payment_status)}
                      </span>
                      <span className="font-mono text-[9px] text-ink/30">
                        {client.recovery_used}/{client.recovery_max} recup.
                      </span>
                      {client.last_payment_date && (
                        <span className="font-mono text-[9px] text-ink/30">
                          Pago: {new Date(client.last_payment_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <button onClick={() => setEditingId(editingId === client.id ? null : client.id)}
                    className="mt-2 text-[10px] font-mono text-ink/30 underline underline-offset-2">
                    {editingId === client.id ? 'Cerrar' : 'Editar'}
                  </button>

                  {editingId === client.id && (
                    <div className="mt-3 pt-3 border-t border-ink/5 space-y-3">
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Estado de pago</p>
                        <select
                          value={client.payment_status}
                          onChange={e => updateClient(client.id, { payment_status: e.target.value as ClientRow['payment_status'] })}
                          className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"
                        >
                          <option value="al_dia">Al día</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="atrasado">Atrasado</option>
                        </select>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Fecha último pago</p>
                        <input
                          type="date"
                          value={client.last_payment_date ?? ''}
                          onChange={e => updateClient(client.id, { last_payment_date: e.target.value || null })}
                          className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none"
                        />
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase text-ink/40 mb-1">Notas internas</p>
                        <textarea
                          value={client.notes ?? ''}
                          onChange={e => setClients(prev => prev.map(c => c.id === client.id ? { ...c, notes: e.target.value } : c))}
                          onBlur={e => updateClient(client.id, { notes: e.target.value || null })}
                          rows={2}
                          placeholder="Notas visibles solo para ti..."
                          className="w-full font-mono text-xs px-3 py-2 rounded-xl bg-paper-2 text-navy border-none outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── CANCELAR ─────────────────────────────────── */}
      {tab === 'cancelar' && (
        <div className="space-y-4">
          <p className="text-sm text-ink/40 font-mono leading-relaxed">
            Cancela una clase concreta. Los créditos de recuperación se devolverán automáticamente.
          </p>

          <div>
            <p className="font-mono text-[9px] uppercase text-ink/40 mb-1.5">Día</p>
            <select
              value={cancelDate}
              onChange={e => { setCancelDate(e.target.value); setCancelSlotId('') }}
              className="w-full font-mono text-sm px-4 py-3 rounded-2xl bg-white text-navy border-none outline-none"
            >
              <option value="">Seleccionar día...</option>
              {cancelDateOptions.map(o => (
                <option key={o.value} value={o.value} className="capitalize">{o.label}</option>
              ))}
            </select>
          </div>

          {cancelDate && (
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1.5">Clase</p>
              {cancelSlotsForDate.length === 0 ? (
                <p className="text-ink/30 font-mono text-xs px-4 py-3">Sin clases ese día</p>
              ) : (
                <select
                  value={cancelSlotId}
                  onChange={e => setCancelSlotId(e.target.value)}
                  className="w-full font-mono text-sm px-4 py-3 rounded-2xl bg-white text-navy border-none outline-none"
                >
                  <option value="">Seleccionar clase...</option>
                  {cancelSlotsForDate.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.class_types.name} — {s.start_time.slice(0, 5)}h
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {cancelSlotId && (
            <div>
              <p className="font-mono text-[9px] uppercase text-ink/40 mb-1.5">Motivo (opcional)</p>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ej: instructor enfermo"
                className="w-full font-mono text-sm px-4 py-3 rounded-2xl bg-white text-navy border-none outline-none"
              />
            </div>
          )}

          {cancelError   && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{cancelError}</p>}
          {cancelSuccess && <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">{cancelSuccess}</p>}

          <button
            onClick={submitCancel}
            disabled={!cancelDate || !cancelSlotId || cancelLoading}
            className="w-full bg-red-600 text-white font-display font-bold py-4 rounded-2xl disabled:opacity-40"
          >
            {cancelLoading ? '…' : 'Cancelar clase'}
          </button>
        </div>
      )}
    </div>
  )
}
