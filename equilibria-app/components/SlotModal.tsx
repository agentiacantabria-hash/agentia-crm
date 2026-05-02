'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SlotInfo } from '@/app/horario/page'
import { toast } from '@/lib/toast'
import { createClient } from '@/lib/supabase/client'

const SUCCESS_MESSAGES: Record<string, string> = {
  'POST /api/regular-slot':    'Te has apuntado a esta clase fija',
  'DELETE /api/regular-slot':  'Has quitado la clase fija',
  'POST /api/recovery':        'Reserva confirmada',
  'DELETE /api/recovery':      'Reserva cancelada',
  'POST /api/absence':         'Falta registrada',
  'DELETE /api/absence':       'Has quitado la falta',
  'POST /api/waitlist':        'Apuntada a lista de espera',
  'DELETE /api/waitlist':      'Has salido de la lista de espera',
}

type Attendee = { user_id: string; full_name: string; type: 'regular' | 'recovery' | 'absent' | 'waitlist' }
type SimpleClient = { id: string; full_name: string; username: string | null }

interface Props { info: SlotInfo; isAdmin?: boolean; onClose: () => void; onSuccess: () => void }

export default function SlotModal({ info, isAdmin, onClose, onSuccess }: Props) {
  const { slot, date, capacity, regularCount, isUserRegular, isUserAbsent, isUserRecovery, isUserWaitlist, isCancelled, waitlistCount, isRotating } = info
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [attendees, setAttendees]       = useState<Attendee[]>([])
  const [waitlistPeople, setWaitlistPeople] = useState<Attendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  // Admin: gestión de asistentes
  const [allClients, setAllClients]     = useState<SimpleClient[]>([])
  const [adminBusyUser, setAdminBusyUser] = useState<string | null>(null)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [addUserId, setAddUserId]       = useState('')
  const [addType, setAddType]           = useState<'recovery' | 'regular'>('recovery')
  const [addLoading, setAddLoading]     = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    setLoadingAttendees(true)
    fetch(`/api/admin/attendees?slot_id=${slot.id}&class_date=${format(date, 'yyyy-MM-dd')}`)
      .then(r => r.json())
      .then(d => { setAttendees(d.attendees ?? []); setWaitlistPeople(d.waitlist ?? []) })
      .finally(() => setLoadingAttendees(false))
  }, [isAdmin, slot.id, date])

  // Cargar clientes una vez (para añadir asistentes)
  useEffect(() => {
    if (!isAdmin) return
    const sb = createClient()
    sb.from('profiles').select('id, full_name, username').eq('is_admin', false).order('full_name')
      .then(({ data }) => setAllClients((data ?? []) as SimpleClient[]))
  }, [isAdmin])

  async function refreshAttendees() {
    const r = await fetch(`/api/admin/attendees?slot_id=${slot.id}&class_date=${format(date, 'yyyy-MM-dd')}`)
    const d = await r.json()
    setAttendees(d.attendees ?? [])
    setWaitlistPeople(d.waitlist ?? [])
  }

  async function adminMarkAbsent(a: Attendee) {
    setAdminBusyUser(a.user_id); setError('')
    const res = await fetch('/api/admin/mark-absence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: a.user_id, slot_id: slot.id, class_date: dateStr }),
    })
    setAdminBusyUser(null)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Error'); return }
    toast.success('Falta marcada')
    refreshAttendees()
    onSuccess()
  }

  async function adminRemove(a: Attendee, force = false) {
    setAdminBusyUser(a.user_id); setError('')
    const res = await fetch('/api/admin/manage-attendance', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: a.type === 'regular' ? 'regular' : 'recovery', user_id: a.user_id, slot_id: slot.id, class_date: dateStr, force }),
    })
    setAdminBusyUser(null)
    if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Error'); return }
    toast.success(a.type === 'regular' ? 'Has quitado la clase fija' : 'Reserva cancelada')
    refreshAttendees()
    onSuccess()
  }

  async function adminAddAttendee(force = false) {
    if (!addUserId) return
    setAddLoading(true); setError('')
    const res = await fetch('/api/admin/manage-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: addType, user_id: addUserId, slot_id: slot.id,
        class_date: addType === 'recovery' ? dateStr : null,
        force,
      }),
    })
    setAddLoading(false)
    if (!res.ok) {
      const j = await res.json()
      // Si es conflict de aforo/cupo/plan, ofrecer forzar
      if (res.status === 409 && j.code && (j.code === 'capacity_conflict' || j.code === 'cupo_conflict' || j.code === 'plan_conflict')) {
        if (typeof window !== 'undefined' && window.confirm(`${j.error}\n\n¿Forzarlo de todas formas?`)) {
          return adminAddAttendee(true)
        }
      }
      setError(j.error ?? 'Error')
      return
    }
    toast.success(addType === 'regular' ? 'Apuntada como fija' : 'Reserva añadida')
    setAddUserId(''); setShowAddPicker(false)
    refreshAttendees()
    onSuccess()
  }

  const dateStr       = format(date, 'yyyy-MM-dd')
  const dayName       = format(date, "EEEE", { locale: es })
  const dayDate       = format(date, "d 'de' MMMM", { locale: es })
  const timeLabel     = slot.start_time.slice(0, 5)
  const slotMax       = slot.max_capacity ?? 7
  const capNum        = Math.max(0, capacity)
  const spotsLeft     = Math.max(0, slotMax - capNum)
  const isPast        = date < new Date(new Date().setHours(0,0,0,0))
  const isEnFormacion = slot.min_regulars > 0 && regularCount < slot.min_regulars
  const isFull        = capNum >= slotMax
  const color         = slot.class_types.color

  async function call(url: string, method: string, extra?: Record<string, unknown>) {
    setLoading(true); setError('')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, class_date: dateStr, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      const msg = SUCCESS_MESSAGES[`${method} ${url}`]
      if (msg) toast.success(msg)
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  function confirmAndCall(message: string, url: string, method: string, extra?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && !window.confirm(message)) return
    call(url, method, extra)
  }

  const fillPct = Math.min(100, (capNum / slotMax) * 100)

  const [closing, setClosing] = useState(false)
  function handleClose() {
    setClosing(true)
    window.setTimeout(onClose, 240)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
      style={{ background: 'rgba(7, 21, 58, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={handleClose}
    >
      <div className={`w-full max-w-lg mx-auto rounded-t-[2rem] overflow-hidden flex flex-col ${closing ? 'animate-slide-down' : 'animate-spring-in'}`}
        style={{ boxShadow: '0 -16px 60px rgba(7, 21, 58, 0.35)', maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header con color de disciplina */}
        <div className="relative px-7 pt-4 pb-6 overflow-hidden flex-shrink-0"
          style={{ background: `linear-gradient(160deg, ${color} 0%, ${color}E0 60%, ${color}CC 100%)` }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(60% 50% at 90% 0%, rgba(255,255,255,0.5) 0%, transparent 65%), radial-gradient(40% 30% at 0% 100%, rgba(11,31,77,0.1) 0%, transparent 70%)' }}/>

          <div className="w-12 h-1 rounded-full mx-auto mb-5"
            style={{ backgroundColor: 'rgba(11,31,77,0.18)' }}/>

          <div className="relative z-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55 font-bold mb-2">
              {slot.class_types.name}
            </p>
            <h2 className="font-display font-semibold text-2xl text-ink leading-tight tracking-tight">
              <span className="capitalize italic font-normal">{dayName}</span>
              <span className="text-ink/45 font-normal"> · </span>
              <span className="capitalize">{dayDate}</span>
            </h2>
            <p className="font-mono text-sm text-ink/65 mt-2 tracking-wide">
              {timeLabel}h
              <span className="mx-1.5 text-ink/30">·</span>
              {slot.duration_minutes} min
            </p>

            {/* Badges */}
            <div className="flex items-center flex-wrap gap-1.5 mt-3">
              {isCancelled && (
                <span className="badge bg-red-100/80 text-red-800">Cancelada</span>
              )}
              {isUserRegular && !isUserAbsent && !isCancelled && (
                <span className="badge bg-white/55 text-ink/75">★ Tu clase</span>
              )}
              {isUserRecovery && (
                <span className="badge bg-white/55 text-brand-deep">{isRotating ? 'Reservada' : 'Recuperación'}</span>
              )}
              {isEnFormacion && (
                <span className="badge bg-amber-100/80 text-amber-800">
                  En formación · {regularCount}/{slot.min_regulars}
                </span>
              )}
              {isUserWaitlist && !isUserRecovery && (
                <span className="badge bg-white/40 text-ink/60">En espera</span>
              )}
            </div>
          </div>
        </div>

        {/* Body blanco */}
        <div className="bg-white px-6 pt-5 pb-10 overflow-y-auto flex-1">
          {/* Aforo */}
          {!isCancelled && (
            <div className="mb-5 pb-5 border-b border-ink/5">
              <div className="flex items-baseline justify-between mb-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 font-semibold">Aforo</p>
                <p className="font-mono text-xs tabular-nums">
                  <span className="font-bold text-ink/85">{capNum}</span>
                  <span className="text-ink/35">/{slotMax}</span>
                  {waitlistCount > 0 && (
                    <span className="text-ink/35 ml-2">· {waitlistCount} en espera</span>
                  )}
                </p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}25` }}>
                <div className="h-full transition-all duration-500"
                  style={{ width: `${fillPct}%`, background: `linear-gradient(90deg, ${color}, ${color}DD)` }}/>
              </div>
              {!isFull ? (
                <p className="font-mono text-[11px] text-ink/45 mt-2 tracking-wide">
                  {spotsLeft} {spotsLeft === 1 ? 'plaza libre' : 'plazas libres'}
                </p>
              ) : (
                <p className="font-mono text-[11px] text-ink/45 mt-2 tracking-wide">Clase completa</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 animate-fade-in">
              <p className="font-mono text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-col gap-2.5">
            {isRotating ? (
              isCancelled ? (
                <InfoBlock>Esta clase ha sido cancelada</InfoBlock>
              ) : isPast ? (
                <InfoBlock>Esta clase ya ha pasado</InfoBlock>
              ) : isUserRecovery ? (
                <button onClick={() => call('/api/recovery', 'DELETE')} disabled={loading} className="btn-secondary">
                  {loading ? '…' : 'Cancelar reserva'}
                </button>
              ) : spotsLeft > 0 ? (
                <button onClick={() => call('/api/recovery', 'POST')} disabled={loading} className="btn-primary">
                  {loading ? '…' : 'Reservar esta clase'}
                </button>
              ) : (
                isUserWaitlist ? (
                  <button onClick={() => call('/api/waitlist', 'DELETE')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : '✓ En lista de espera — Salir'}
                  </button>
                ) : (
                  <button onClick={() => call('/api/waitlist', 'POST')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : 'Apuntarme a lista de espera'}
                  </button>
                )
              )
            ) : isCancelled ? (
              <InfoBlock>Esta clase ha sido cancelada</InfoBlock>

            ) : isPast ? (
              <InfoBlock>Esta clase ya ha pasado</InfoBlock>

            ) : isUserRegular ? (
              <>
                {isUserAbsent ? (
                  <button onClick={() => call('/api/absence', 'DELETE')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : '↩ Quitar falta'}
                  </button>
                ) : (
                  <button onClick={() => call('/api/absence', 'POST')} disabled={loading}
                    className="w-full bg-red-50 text-red-700 font-display font-semibold py-4 rounded-[1.1rem] text-base transition-all active:scale-[0.98] disabled:opacity-40 hover:bg-red-100">
                    {loading ? '…' : 'No voy a poder ir — Marcar falta'}
                  </button>
                )}
                <button onClick={() => confirmAndCall(
                  '¿Seguro que quieres quitar esta clase de tu horario fijo? Tendrás que volver a apuntarte si cambias de idea.',
                  '/api/regular-slot', 'DELETE'
                )} disabled={loading}
                  className="w-full bg-paper-2 text-ink/55 font-mono text-[11px] py-3 rounded-2xl disabled:opacity-40 uppercase tracking-widest hover:bg-paper-3 transition-colors">
                  Quitar de mis clases fijas
                </button>
              </>

            ) : isUserRecovery ? (
              <button onClick={() => call('/api/recovery', 'DELETE')} disabled={loading} className="btn-secondary">
                {loading ? '…' : 'Cancelar recuperación'}
              </button>

            ) : spotsLeft > 0 ? (
              <>
                <button onClick={() => call('/api/recovery', 'POST')} disabled={loading} className="btn-primary">
                  {loading ? '…' : 'Usar recuperación aquí'}
                </button>
                <button onClick={() => call('/api/regular-slot', 'POST', { week_parity: 'all' })} disabled={loading} className="btn-secondary">
                  {loading ? '…' : 'Añadir a mis clases fijas'}
                </button>
                {isEnFormacion && (
                  <p className="text-center text-[11px] font-mono text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                    Al apuntarte fijo ayudas a activar esta clase ({regularCount + 1}/{slot.min_regulars})
                  </p>
                )}
              </>

            ) : (
              isUserWaitlist ? (
                <button onClick={() => call('/api/waitlist', 'DELETE')} disabled={loading} className="btn-secondary">
                  {loading ? '…' : '✓ En lista de espera — Salir'}
                </button>
              ) : (
                <button onClick={() => call('/api/waitlist', 'POST')} disabled={loading} className="btn-secondary">
                  {loading ? '…' : 'Apuntarme a lista de espera'}
                </button>
              )
            )}

            <button onClick={handleClose} className="text-center text-[11px] text-ink/35 py-3 font-mono uppercase tracking-widest hover:text-ink/55 transition-colors">
              Cerrar
            </button>
          </div>

          {/* Lista de asistentes — solo admin */}
          {isAdmin && (
            <div className="mt-6 pt-5 border-t border-ink/5">
              <div className="flex items-center gap-2 mb-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 font-semibold">
                  Asistentes
                </p>
                <span className="flex-1 h-px bg-gradient-to-r from-ink/10 to-transparent"/>
                <span className="font-mono text-[10px] text-ink/45 tabular-nums">{attendees.filter(a => a.type !== 'absent').length}/{slotMax}</span>
              </div>
              {loadingAttendees ? (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin"/>
                </div>
              ) : attendees.length === 0 ? (
                <p className="text-xs text-ink/35 font-mono text-center py-3 italic">Sin asistentes confirmados</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {attendees.map(a => (
                    <div key={a.user_id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-paper">
                      <div className="flex items-center gap-2 min-w-0">
                        {a.type === 'recovery' && <span className="badge badge-brand">Recup.</span>}
                        {a.type === 'absent'   && <span className="badge badge-danger">Falta</span>}
                        {a.type === 'regular'  && <span className="badge badge-neutral">Fija</span>}
                        <span className={`text-sm font-display truncate ${a.type === 'absent' ? 'text-ink/35 line-through' : 'text-ink'}`}>
                          {a.full_name}
                        </span>
                      </div>
                      {!isCancelled && !isPast && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {a.type === 'regular' && (
                            <button onClick={() => adminMarkAbsent(a)} disabled={adminBusyUser === a.user_id}
                              className="font-mono text-[10px] uppercase tracking-wider text-amber-700 hover:text-amber-900 disabled:opacity-40 px-1.5 py-1">
                              {adminBusyUser === a.user_id ? '…' : 'Falta'}
                            </button>
                          )}
                          {a.type !== 'absent' && (
                            <button
                              onClick={() => {
                                const msg = a.type === 'regular'
                                  ? `¿Quitar a ${a.full_name} de esta clase fija? Le retirarás la inscripción permanente.`
                                  : `¿Cancelar la reserva de ${a.full_name}?`
                                if (typeof window !== 'undefined' && !window.confirm(msg)) return
                                adminRemove(a)
                              }}
                              disabled={adminBusyUser === a.user_id}
                              className="font-mono text-[10px] uppercase tracking-wider text-red-500 hover:text-red-700 disabled:opacity-40 px-1.5 py-1">
                              {adminBusyUser === a.user_id ? '…' : 'Quitar'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Botón añadir / picker */}
              {!isCancelled && !isPast && (
                <div className="mt-3">
                  {!showAddPicker ? (
                    <button onClick={() => setShowAddPicker(true)}
                      className="w-full font-mono text-[11px] uppercase tracking-widest font-bold text-brand-deep bg-brand/10 hover:bg-brand/15 py-2.5 rounded-xl transition-colors">
                      + Añadir asistente
                    </button>
                  ) : (
                    <div className="space-y-2 px-1 pt-2">
                      <select value={addUserId} onChange={e => setAddUserId(e.target.value)}
                        className="w-full font-mono text-sm px-3 py-2.5 rounded-xl bg-paper-2 text-navy border-none outline-none">
                        <option value="">Seleccionar cliente…</option>
                        {allClients
                          .filter(c => !attendees.some(a => a.user_id === c.id))
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}{c.username ? ` (${c.username})` : ''}
                            </option>
                          ))}
                      </select>
                      <div className="flex gap-2">
                        <select value={addType} onChange={e => setAddType(e.target.value as 'recovery' | 'regular')}
                          className="flex-1 font-mono text-sm px-3 py-2.5 rounded-xl bg-paper-2 text-navy border-none outline-none">
                          <option value="recovery">Solo este día</option>
                          <option value="regular">Fija (todas las semanas)</option>
                        </select>
                        <button onClick={() => adminAddAttendee()}
                          disabled={!addUserId || addLoading}
                          className="px-4 py-2.5 bg-brand text-paper font-mono text-sm font-bold rounded-xl disabled:opacity-40 active:scale-95 transition-transform">
                          {addLoading ? '…' : 'Añadir'}
                        </button>
                      </div>
                      <button onClick={() => { setShowAddPicker(false); setAddUserId('') }}
                        className="w-full text-center font-mono text-[10px] text-ink/40 py-1 uppercase tracking-widest">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {waitlistPeople.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mt-5 mb-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 font-semibold">
                      Lista de espera
                    </p>
                    <span className="flex-1 h-px bg-gradient-to-r from-ink/10 to-transparent"/>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {waitlistPeople.map(a => (
                      <div key={a.user_id} className="flex items-center px-4 py-2.5 rounded-xl bg-paper/60">
                        <span className="text-sm font-display text-ink/65">{a.full_name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-mono text-sm text-ink/50 py-4 px-4 bg-paper rounded-2xl tracking-wide">
      {children}
    </div>
  )
}
