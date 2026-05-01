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
  const dayLabel      = format(date, "EEEE d 'de' MMMM", { locale: es })
  const timeLabel     = slot.start_time.slice(0, 5)
  const slotMax       = slot.max_capacity ?? 7
  const spotsLeft     = Math.max(0, slotMax - capacity)
  const isPast        = date < new Date(new Date().setHours(0,0,0,0))
  const isEnFormacion = slot.min_regulars > 0 && regularCount < slot.min_regulars

  // Paridad de la semana de esta fecha
  const weekIsEven     = getISOWeek(date) % 2 === 0
  const thisWeekParity = weekIsEven ? 'even' : 'odd'
  const otherParity    = weekIsEven ? 'odd' : 'even'

  // ¿Tiene esta clase como fija pero para las semanas alternas (no esta)?
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

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 -8px 40px rgba(11,31,77,0.25)', maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}>

        {/* Colored header */}
        <div className="relative px-6 pt-5 pb-5 overflow-hidden flex-shrink-0"
          style={{ backgroundColor: slot.class_types.color }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.5) 0%, transparent 55%)' }}/>

          <div className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'rgba(11,31,77,0.18)' }}/>

          <div className="relative z-10">
            <div className="flex items-center flex-wrap gap-1.5 mb-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink/50 font-semibold">
                {slot.class_types.name}
              </span>
              {isCancelled && (
                <span className="text-[9px] font-mono font-bold text-red-800 bg-red-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Cancelada
                </span>
              )}
              {isUserRegular && !isUserAbsent && !isCancelled && (
                <span className="text-[9px] font-mono font-bold text-ink/60 bg-white/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tu clase
                </span>
              )}
              {hasSlotOtherWeek && (
                <span className="text-[9px] font-mono font-bold text-ink/60 bg-white/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Alterna
                </span>
              )}
              {isUserRecovery && (
                <span className="text-[9px] font-mono font-bold text-blue bg-white/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recuperación
                </span>
              )}
              {isEnFormacion && (
                <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  En formación · {regularCount}/{slot.min_regulars}
                </span>
              )}
            </div>
            <h2 className="font-display font-extrabold text-xl text-ink capitalize leading-tight">{dayLabel}</h2>
            <p className="font-mono text-xs text-ink/50 mt-0.5">{timeLabel}h · {slot.duration_minutes} min</p>
          </div>
        </div>

        {/* White body */}
        <div className="bg-white px-6 pt-5 pb-10 overflow-y-auto flex-1">
          {/* Capacity */}
          {!isCancelled && (
            <div className="flex items-center gap-2.5 mb-5 pb-5 border-b border-ink/5">
              <div className="flex gap-1">
                {Array.from({ length: slotMax }).map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-full transition-colors"
                    style={{ backgroundColor: i < Math.max(0, capacity)
                      ? slot.class_types.color
                      : `${slot.class_types.color}35` }}/>
                ))}
              </div>
              <span className="font-mono text-xs text-ink/50">
                {spotsLeft > 0 ? `${spotsLeft} libre${spotsLeft !== 1 ? 's' : ''}` : 'Completa'}
              </span>
              {waitlistCount > 0 && (
                <span className="font-mono text-xs text-ink/30">· {waitlistCount} en espera</span>
              )}
            </div>
          )}

          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{error}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            {isRotating ? (
              isCancelled ? (
                <div className="text-center text-ink/40 font-mono text-sm py-4 bg-paper rounded-2xl">
                  Esta clase ha sido cancelada
                </div>
              ) : isPast ? (
                <div className="text-center text-ink/30 font-mono text-sm py-4 bg-paper rounded-2xl">
                  Esta clase ya ha pasado
                </div>
              ) : isUserRecovery ? (
                <button onClick={() => call('/api/recovery', 'DELETE')} disabled={loading} className="btn-secondary">
                  {loading ? '…' : 'Cancelar reserva'}
                </button>
              ) : spotsLeft > 0 ? (
                <button onClick={() => call('/api/recovery', 'POST')} disabled={loading}
                  className="w-full bg-blue text-white font-display font-bold py-4 rounded-2xl text-base transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ boxShadow: '0 4px 16px rgba(46,91,255,0.3)' }}>
                  {loading ? '…' : 'Reservar esta clase'}
                </button>
              ) : (
                isUserWaitlist ? (
                  <button onClick={() => call('/api/waitlist', 'DELETE')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : '✓ En lista de espera — Salir'}
                  </button>
                ) : (
                  <button onClick={() => call('/api/waitlist', 'POST')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : 'Unirse a lista de espera'}
                  </button>
                )
              )
            ) : isCancelled ? (
              <div className="text-center text-ink/40 font-mono text-sm py-4 bg-paper rounded-2xl">
                Esta clase ha sido cancelada
              </div>

            ) : isPast ? (
              <div className="text-center text-ink/30 font-mono text-sm py-4 bg-paper rounded-2xl">
                Esta clase ya ha pasado
              </div>

            ) : isUserRegular ? (
              <>
                {isUserAbsent ? (
                  <button onClick={() => call('/api/absence', 'DELETE')} disabled={loading} className="btn-secondary">
                    {loading ? '…' : '↩ Quitar falta'}
                  </button>
                ) : (
                  <button onClick={() => call('/api/absence', 'POST')} disabled={loading}
                    className="w-full bg-red-50 text-red-700 font-display font-bold py-4 rounded-2xl text-base transition-all active:scale-[0.98] disabled:opacity-40">
                    {loading ? '…' : 'Marcar falta'}
                  </button>
                )}
                <button onClick={() => call('/api/regular-slot', 'DELETE')} disabled={loading}
                  className="w-full bg-paper-2 text-ink/40 font-mono text-[11px] py-3 rounded-2xl disabled:opacity-40 uppercase tracking-wider">
                  Quitar de mis clases fijas
                </button>
              </>

            ) : isUserRecovery ? (
              <button onClick={() => call('/api/recovery', 'DELETE')} disabled={loading} className="btn-secondary">
                {loading ? '…' : 'Cancelar recuperación'}
              </button>

            ) : hasSlotOtherWeek ? (
              // Tiene la clase como fija pero es semana alterna → no activa esta semana
              <>
                <div className="text-center text-sm text-ink/50 font-mono py-3 bg-paper rounded-2xl leading-relaxed">
                  Tienes esta clase las semanas alternas
                </div>
                {spotsLeft > 0 && (
                  <button onClick={() => call('/api/recovery', 'POST')} disabled={loading}
                    className="w-full bg-blue text-white font-display font-bold py-4 rounded-2xl text-base transition-all active:scale-[0.98] disabled:opacity-40"
                    style={{ boxShadow: '0 4px 16px rgba(46,91,255,0.3)' }}>
                    {loading ? '…' : 'Usar recuperación aquí'}
                  </button>
                )}
                {showParityPicker ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 text-center py-1">
                      ¿Cambiar frecuencia de esta clase?
                    </p>
                    <button onClick={() => call('/api/regular-slot', 'PATCH', { week_parity: 'all' })} disabled={loading}
                      className="btn-primary">
                      {loading ? '…' : 'Todas las semanas'}
                    </button>
                    <button onClick={() => call('/api/regular-slot', 'PATCH', { week_parity: thisWeekParity })} disabled={loading}
                      className="btn-secondary">
                      {loading ? '…' : 'Solo esta semana (cambiar alternancia)'}
                    </button>
                    <button onClick={() => setShowParity(false)}
                      className="text-center text-xs text-ink/30 py-1 font-mono">
                      ← Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowParity(true)} className="btn-secondary">
                    Añadir también a mis clases fijas
                  </button>
                )}
                <button onClick={() => call('/api/regular-slot', 'DELETE')} disabled={loading}
                  className="w-full bg-paper-2 text-ink/40 font-mono text-[11px] py-3 rounded-2xl disabled:opacity-40 uppercase tracking-wider">
                  Quitar de mis clases fijas
                </button>
              </>

            ) : spotsLeft > 0 ? (
              <>
                <button onClick={() => call('/api/recovery', 'POST')} disabled={loading}
                  className="w-full bg-blue text-white font-display font-bold py-4 rounded-2xl text-base transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ boxShadow: '0 4px 16px rgba(46,91,255,0.3)' }}>
                  {loading ? '…' : 'Usar recuperación aquí'}
                </button>

                {showParityPicker ? (
                  <div className="flex flex-col gap-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 text-center py-1">
                      ¿Cada cuánto vas a esta clase?
                    </p>
                    {isEnFormacion && (
                      <p className="text-center text-[10px] font-mono text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                        Al apuntarte ayudas a activar esta clase ({regularCount + 1}/{slot.min_regulars})
                      </p>
                    )}
                    <button onClick={() => call('/api/regular-slot', 'POST', { week_parity: 'all' })} disabled={loading}
                      className="btn-primary">
                      {loading ? '…' : 'Todas las semanas'}
                    </button>
                    <button onClick={() => call('/api/regular-slot', 'POST', { week_parity: thisWeekParity })} disabled={loading}
                      className="btn-secondary">
                      {loading ? '…' : 'Semanas alternas — esta semana sí'}
                    </button>
                    <button onClick={() => call('/api/regular-slot', 'POST', { week_parity: otherParity })} disabled={loading}
                      className="btn-secondary">
                      {loading ? '…' : 'Semanas alternas — esta semana no'}
                    </button>
                    <button onClick={() => setShowParity(false)}
                      className="text-center text-xs text-ink/30 py-1 font-mono">
                      ← Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowParity(true)}
                    className="btn-primary">
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
                  {loading ? '…' : 'Unirse a lista de espera'}
                </button>
              )
            )}

            <button onClick={onClose} className="text-center text-xs text-ink/30 py-2 font-mono">
              Cerrar
            </button>
          </div>

          {/* Lista de asistentes — solo admin */}
          {isAdmin && (
            <div className="mt-5 pt-5 border-t border-ink/5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-3">
                Asistentes
              </p>
              {loadingAttendees ? (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 rounded-full border-2 border-ink/20 border-t-ink/60 animate-spin"/>
                </div>
              ) : attendees.length === 0 ? (
                <p className="text-xs text-ink/30 font-mono text-center py-2">Sin asistentes</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {attendees.map(a => (
                    <div key={a.user_id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-paper">
                      <span className={`text-sm font-display font-semibold ${a.type === 'absent' ? 'text-ink/25 line-through' : 'text-ink'}`}>
                        {a.full_name}
                      </span>
                      {a.type === 'recovery' && (
                        <span className="text-[8px] font-mono font-bold text-blue bg-blue/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Recup.
                        </span>
                      )}
                      {a.type === 'absent' && (
                        <span className="text-[8px] font-mono font-bold text-red-400 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Falta
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {waitlistPeople.length > 0 && (
                <>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/30 mb-2 mt-4">
                    Lista de espera
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {waitlistPeople.map(a => (
                      <div key={a.user_id} className="flex items-center px-3 py-2 rounded-xl bg-paper">
                        <span className="text-sm font-display font-semibold text-ink/50">{a.full_name}</span>
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
