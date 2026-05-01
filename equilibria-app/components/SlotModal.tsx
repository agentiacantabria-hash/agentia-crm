'use client'
import { useState, useEffect } from 'react'
import { format, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import type { SlotInfo } from '@/app/horario/page'

type Attendee = { user_id: string; full_name: string; type: 'regular' | 'recovery' | 'absent' | 'waitlist' }

interface Props { info: SlotInfo; isAdmin?: boolean; onClose: () => void; onSuccess: () => void }

export default function SlotModal({ info, isAdmin, onClose, onSuccess }: Props) {
  const { slot, date, capacity, regularCount, isUserRegular, userRegularParity, isUserAbsent, isUserRecovery, isUserWaitlist, isCancelled, waitlistCount, isRotating } = info
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [showParityPicker, setShowParity] = useState(false)
  const [attendees, setAttendees]       = useState<Attendee[]>([])
  const [waitlistPeople, setWaitlistPeople] = useState<Attendee[]>([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    setLoadingAttendees(true)
    fetch(`/api/admin/attendees?slot_id=${slot.id}&class_date=${format(date, 'yyyy-MM-dd')}`)
      .then(r => r.json())
      .then(d => { setAttendees(d.attendees ?? []); setWaitlistPeople(d.waitlist ?? []) })
      .finally(() => setLoadingAttendees(false))
  }, [isAdmin, slot.id, date])

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

  const weekIsEven     = getISOWeek(date) % 2 === 0
  const thisWeekParity = weekIsEven ? 'even' : 'odd'
  const otherParity    = weekIsEven ? 'odd' : 'even'

  const hasSlotOtherWeek = userRegularParity !== null && !isUserRegular

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
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setShowParity(false)
    } finally {
      setLoading(false)
    }
  }

  function confirmAndCall(message: string, url: string, method: string, extra?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && !window.confirm(message)) return
    call(url, method, extra)
  }

  // Status semántico para la cinta de aforo
  const fillPct = Math.min(100, (capNum / slotMax) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end animate-fade-in"
      style={{ background: 'rgba(7, 21, 58, 0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="w-full max-w-lg mx-auto rounded-t-[2rem] overflow-hidden flex flex-col animate-spring-in"
        style={{ boxShadow: '0 -16px 60px rgba(7, 21, 58, 0.35)', maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header con color de disciplina */}
        <div className="relative px-7 pt-4 pb-6 overflow-hidden flex-shrink-0"
          style={{ background: `linear-gradient(160deg, ${color} 0%, ${color}E0 60%, ${color}CC 100%)` }}>
          {/* Glow decorativo */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(60% 50% at 90% 0%, rgba(255,255,255,0.5) 0%, transparent 65%), radial-gradient(40% 30% at 0% 100%, rgba(11,31,77,0.1) 0%, transparent 70%)' }}/>

          {/* Drag handle */}
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
              {hasSlotOtherWeek && (
                <span className="badge bg-white/40 text-ink/65">Alterna</span>
              )}
              {isUserRecovery && (
                <span className="badge bg-white/55 text-brand-deep">Recuperación</span>
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

            ) : hasSlotOtherWeek ? (
              <>
                <InfoBlock>Tienes esta clase las semanas alternas</InfoBlock>
                {spotsLeft > 0 && (
                  <button onClick={() => call('/api/recovery', 'POST')} disabled={loading} className="btn-primary">
                    {loading ? '…' : 'Usar recuperación aquí'}
                  </button>
                )}
                {showParityPicker ? (
                  <ParityPicker
                    title="¿Cambiar la frecuencia de esta clase?"
                    loading={loading}
                    onCancel={() => setShowParity(false)}
                    options={[
                      { label: 'Todas las semanas',                        onClick: () => call('/api/regular-slot', 'PATCH', { week_parity: 'all' }), variant: 'primary' },
                      { label: 'Solo esta semana (cambiar alternancia)',   onClick: () => call('/api/regular-slot', 'PATCH', { week_parity: thisWeekParity }) },
                    ]}
                  />
                ) : (
                  <button onClick={() => setShowParity(true)} className="btn-secondary">
                    Añadir también a mis clases fijas
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

            ) : spotsLeft > 0 ? (
              <>
                <button onClick={() => call('/api/recovery', 'POST')} disabled={loading} className="btn-primary">
                  {loading ? '…' : 'Usar recuperación aquí'}
                </button>

                {showParityPicker ? (
                  <ParityPicker
                    title="¿Cada cuánto vas a esta clase?"
                    loading={loading}
                    onCancel={() => setShowParity(false)}
                    helper={isEnFormacion ? `Al apuntarte ayudas a activar esta clase (${regularCount + 1}/${slot.min_regulars})` : null}
                    options={[
                      { label: 'Todas las semanas',                onClick: () => call('/api/regular-slot', 'POST', { week_parity: 'all' }), variant: 'primary' },
                      { label: 'Alternas — esta semana sí',        onClick: () => call('/api/regular-slot', 'POST', { week_parity: thisWeekParity }) },
                      { label: 'Alternas — esta semana no',        onClick: () => call('/api/regular-slot', 'POST', { week_parity: otherParity }) },
                    ]}
                  />
                ) : (
                  <button onClick={() => setShowParity(true)} className="btn-secondary">
                    Añadir a mis clases fijas
                  </button>
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

            <button onClick={onClose} className="text-center text-[11px] text-ink/35 py-3 font-mono uppercase tracking-widest hover:text-ink/55 transition-colors">
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
              </div>
              {loadingAttendees ? (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin"/>
                </div>
              ) : attendees.length === 0 ? (
                <p className="text-xs text-ink/35 font-mono text-center py-3">Sin asistentes</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {attendees.map(a => (
                    <div key={a.user_id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-paper">
                      <span className={`text-sm font-display ${a.type === 'absent' ? 'text-ink/30 line-through' : 'text-ink'}`}>
                        {a.full_name}
                      </span>
                      {a.type === 'recovery' && <span className="badge badge-brand">Recup.</span>}
                      {a.type === 'absent'   && <span className="badge badge-danger">Falta</span>}
                    </div>
                  ))}
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
                        <span className="text-sm font-display text-ink/55">{a.full_name}</span>
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

// ─────────────────────────────────────────────────────────────────
// Subcomponentes locales
// ─────────────────────────────────────────────────────────────────
function InfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-mono text-sm text-ink/50 py-4 px-4 bg-paper rounded-2xl tracking-wide">
      {children}
    </div>
  )
}

type ParityOption = { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }

function ParityPicker({
  title, loading, options, onCancel, helper,
}: {
  title: string
  loading: boolean
  options: ParityOption[]
  onCancel: () => void
  helper?: string | null
}) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 text-center py-1 font-semibold">
        {title}
      </p>
      {helper && (
        <p className="text-center text-[11px] font-mono text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
          {helper}
        </p>
      )}
      {options.map((opt, i) => (
        <button key={i} onClick={opt.onClick} disabled={loading}
          className={opt.variant === 'primary' ? 'btn-primary' : 'btn-secondary'}>
          {loading ? '…' : opt.label}
        </button>
      ))}
      <button onClick={onCancel}
        className="text-center font-mono text-[11px] text-ink/35 py-2 uppercase tracking-widest hover:text-ink/55 transition-colors">
        ← Cancelar
      </button>
    </div>
  )
}
