'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Plan } from '@/lib/types'
import { maxRecoveriesPerMonth } from '@/lib/plan'

type HistoryItem = {
  id: string
  date: string
  type: 'recovery' | 'absence'
  className: string
  color: string
  time: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [recoveryUsed, setRecoveryUsed] = useState(0)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const [
        { data: profileData },
        { count: used },
        { data: recoveries },
        { data: absences },
      ] = await Promise.all([
        sb.from('profiles').select('*, plans(*)').eq('id', user.id).single(),
        sb.from('recovery_bookings').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'confirmed')
          .gte('class_date', monthStart.toISOString().slice(0, 10)),
        sb.from('recovery_bookings')
          .select('id, class_date, schedule_slots(start_time, class_types(name, color))')
          .eq('user_id', user.id).eq('status', 'confirmed')
          .gte('class_date', sixMonthsAgo.toISOString().slice(0, 10))
          .order('class_date', { ascending: false }).limit(20),
        sb.from('absences')
          .select('id, class_date, schedule_slots(start_time, class_types(name, color))')
          .eq('user_id', user.id)
          .gte('class_date', sixMonthsAgo.toISOString().slice(0, 10))
          .order('class_date', { ascending: false }).limit(20),
      ])

      setProfile(profileData as Profile)
      setPlan((profileData?.plans as unknown as Plan) ?? null)
      setRecoveryUsed(used ?? 0)

      type RawHistRow = {
        id: string
        class_date: string
        schedule_slots: { start_time: string; class_types: { name: string; color: string } | null } | null
      }
      const recItems: HistoryItem[] = ((recoveries ?? []) as unknown as RawHistRow[]).map(r => ({
        id: 'r:' + r.id,
        date: r.class_date,
        type: 'recovery',
        className: r.schedule_slots?.class_types?.name ?? '—',
        color: r.schedule_slots?.class_types?.color ?? '#0B1F4D',
        time: r.schedule_slots?.start_time?.slice(0, 5) ?? '',
      }))
      const absItems: HistoryItem[] = ((absences ?? []) as unknown as RawHistRow[]).map(a => ({
        id: 'a:' + a.id,
        date: a.class_date,
        type: 'absence',
        className: a.schedule_slots?.class_types?.name ?? '—',
        color: a.schedule_slots?.class_types?.color ?? '#0B1F4D',
        time: a.schedule_slots?.start_time?.slice(0, 5) ?? '',
      }))
      setHistory([...recItems, ...absItems]
        .sort((x, y) => y.date.localeCompare(x.date))
        .slice(0, 10))

      setLoading(false)
    })
  }, [router])

  async function handleSignOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 border-navy border-t-transparent animate-spin" />
    </div>
  )

  const creditsMax  = maxRecoveriesPerMonth(profile?.schedule_type, plan)
  const creditsLeft = Math.max(0, creditsMax - recoveryUsed)
  const isRotating  = profile?.schedule_type === 'rotativo'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <p className="page-eyebrow">Perfil</p>

      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 mt-2 mb-7">
        <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: '0 4px 20px rgba(11,31,77,0.28)' }}>
          <span className="font-display font-extrabold text-xl text-paper">{initials}</span>
        </div>
        <div>
          <h1 className="font-display font-extrabold text-2xl text-navy leading-tight">
            {profile?.full_name || 'Tu perfil'}
          </h1>
          <p className="font-mono text-[10px] text-ink/40 uppercase tracking-widest mt-0.5">
            Código · {profile?.username ?? '—'}
          </p>
        </div>
      </div>

      {/* Datos */}
      <div className="card divide-y divide-ink/5 mb-4">
        <div className="px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1">Plan</p>
          <p className="font-display font-bold text-navy">{plan?.name ?? '—'}</p>
          {plan && (
            <p className="font-mono text-[10px] text-ink/40 mt-0.5">
              {plan.classes_per_week}× por semana
            </p>
          )}
        </div>

        <div className="px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-2">
            {isRotating ? 'Reservas este mes' : 'Recuperaciones este mes'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: creditsMax || 4 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: i < creditsLeft ? '#2E5BFF' : 'rgba(11,31,77,0.08)' }}/>
              ))}
            </div>
            <span className="font-mono text-xs text-ink/50">
              {creditsLeft}/{creditsMax} disponibles
            </span>
          </div>
        </div>

        {profile?.phone && (
          <div className="px-4 py-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1">Teléfono</p>
            <p className="text-ink text-sm">{profile.phone}</p>
          </div>
        )}

        <div className="px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-1">Miembro desde</p>
          <p className="text-ink text-sm">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : '—'}
          </p>
        </div>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="card mb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 px-4 pt-4 pb-2">
            Últimas clases
          </p>
          <div className="divide-y divide-ink/5">
            {history.map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-semibold text-sm truncate ${item.type === 'absence' ? 'text-ink/40 line-through' : 'text-ink'}`}>
                    {item.className}
                  </p>
                  <p className="font-mono text-[10px] text-ink/40 mt-0.5 capitalize">
                    {format(new Date(item.date + 'T12:00:00'), "d MMM yyyy", { locale: es })} · {item.time}h
                  </p>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0
                  ${item.type === 'recovery' ? 'bg-blue/10 text-blue' : 'bg-red-50 text-red-500'}`}>
                  {item.type === 'recovery' ? 'Recup.' : 'Falta'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSignOut}
        className="btn-secondary mt-2">
        Cerrar sesión
      </button>
    </div>
  )
}
