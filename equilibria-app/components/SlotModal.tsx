'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { MAX_CAPACITY } from '@/lib/types'
import type { SlotInfo } from '@/app/horario/page'

interface Props { info: SlotInfo; onClose: () => void; onSuccess: () => void }

export default function SlotModal({ info, onClose, onSuccess }: Props) {
  const { slot, date, capacity, isUserRegular, isUserAbsent, isUserRecovery, isUserWaitlist, isCancelled, waitlistCount } = info
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  const dateStr    = format(date, 'yyyy-MM-dd')
  const dayLabel   = format(date, "EEEE d 'de' MMMM", { locale: es })
  const timeLabel  = slot.start_time.slice(0, 5)
  const spotsLeft  = Math.max(0, MAX_CAPACITY - capacity)
  const isPast     = date < new Date(new Date().setHours(0,0,0,0))

  async function call(url: string, method: string) {
    setLoading(true); setError('')
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, class_date: dateStr }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error')
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl p-6 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-ink/10 rounded-full mx-auto mb-5"/>

        {/* Chip disciplina */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-ink"
            style={{ backgroundColor: slot.class_types.color }}>
            {slot.class_types.name}
          </span>
          {isCancelled && <span className="text-xs font-mono text-red-500 uppercase tracking-wider">Cancelada</span>}
          {isUserRegular && !isUserAbsent && !isCancelled && (
            <span className="text-xs font-mono text-navy uppercase tracking-wider">· Tu clase</span>
          )}
          {isUserRecovery && (
            <span className="text-xs font-mono text-blue uppercase tracking-wider">· Recuperación</span>
          )}
        </div>

        <h2 className="font-display font-bold text-2xl text-navy capitalize">{dayLabel}</h2>
        <p className="font-mono text-sm text-ink/40 mt-0.5">{timeLabel}h · {slot.duration_minutes} min</p>

        {/* Indicador de plazas */}
        {!isCancelled && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_CAPACITY }).map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < capacity ? 'bg-navy' : 'bg-ink/10'}`}/>
              ))}
            </div>
            <span className="font-mono text-xs text-ink/40">
              {spotsLeft > 0 ? `${spotsLeft} libre${spotsLeft !== 1 ? 's' : ''}` : 'Completa'}
            </span>
            {waitlistCount > 0 && (
              <span className="font-mono text-xs text-ink/30">· {waitlistCount} en espera</span>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* Acciones */}
        <div className="mt-5 flex flex-col gap-2">
          {isCancelled ? (
            <div className="text-center text-ink/40 font-mono text-sm py-3">Esta clase ha sido cancelada</div>

          ) : isPast ? (
            <div className="text-center text-ink/30 font-mono text-sm py-3">Esta clase ya ha pasado</div>

          ) : isUserRegular ? (
            <>
              {isUserAbsent ? (
                <button onClick={() => call('/api/absence', 'DELETE')} disabled={loading}
                  className="w-full bg-ink/8 text-ink font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                  {loading ? '…' : '↩ Quitar falta'}
                </button>
              ) : (
                <button onClick={() => call('/api/absence', 'POST')} disabled={loading}
                  className="w-full bg-red-50 text-red-700 font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                  {loading ? '…' : 'Marcar falta'}
                </button>
              )}
              <button onClick={() => call('/api/regular-slot', 'DELETE')} disabled={loading}
                className="w-full bg-paper-2 text-ink/50 font-mono text-xs py-3 rounded-2xl disabled:opacity-50 uppercase tracking-wider">
                Quitar de mis clases fijas
              </button>
            </>

          ) : isUserRecovery ? (
            <button onClick={() => call('/api/recovery', 'DELETE')} disabled={loading}
              className="w-full bg-ink/8 text-ink font-display font-bold py-4 rounded-2xl disabled:opacity-50">
              {loading ? '…' : 'Cancelar recuperación'}
            </button>

          ) : spotsLeft > 0 ? (
            <>
              <button onClick={() => call('/api/recovery', 'POST')} disabled={loading}
                className="w-full bg-blue text-white font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                {loading ? '…' : 'Usar recuperación aquí'}
              </button>
              <button onClick={() => call('/api/regular-slot', 'POST')} disabled={loading}
                className="w-full bg-navy text-paper font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                {loading ? '…' : 'Añadir a mis clases fijas'}
              </button>
            </>

          ) : (
            <>
              {isUserWaitlist ? (
                <button onClick={() => call('/api/waitlist', 'DELETE')} disabled={loading}
                  className="w-full bg-ink/8 text-ink/60 font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                  {loading ? '…' : '✓ En lista de espera — Salir'}
                </button>
              ) : (
                <button onClick={() => call('/api/waitlist', 'POST')} disabled={loading}
                  className="w-full bg-paper-2 text-navy font-display font-bold py-4 rounded-2xl disabled:opacity-50">
                  {loading ? '…' : 'Unirse a lista de espera'}
                </button>
              )}
            </>
          )}

          <button onClick={() => { router.push('/login') }} className="hidden"/>
          <button onClick={onClose} className="text-center text-xs text-ink/30 py-2">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
