/**
 * Broadcast manual para que el horario se sincronice en tiempo real
 * entre alumnas. El postgres_changes de Supabase respeta las RLS,
 * por lo que una alumna NO recibe eventos de modificaciones hechas
 * por otra. Para arreglarlo publicamos un evento de tipo `broadcast`
 * en un canal compartido sin RLS.
 *
 * El broadcast es "fire and forget": llamamos al endpoint REST de
 * Realtime con la service role key. No requiere socket abierto en
 * el server. Si falla, no rompe la operación principal.
 */
export const SCHEDULE_REALTIME_TOPIC = 'schedule-events'

function sanitizedServiceKey(): string | null {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  const clean = Array.from(raw).filter(c => {
    const code = c.codePointAt(0) ?? 0
    return code >= 32 && code <= 126
  }).join('')
  return clean && !clean.includes('XXXX') ? clean : null
}

export interface ScheduleChangePayload {
  slotId?: string
  classDate?: string | null
}

export async function broadcastScheduleChange(payload: ScheduleChangePayload = {}): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = sanitizedServiceKey()
  if (!url || !key) return
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{
          topic: SCHEDULE_REALTIME_TOPIC,
          event: 'change',
          payload: { ...payload, ts: Date.now() },
        }],
      }),
    })
  } catch {
    // Silencioso a propósito — el broadcast es best-effort
  }
}
