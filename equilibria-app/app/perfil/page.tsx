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
        color: r.schedule_slots?.class_types?.color ?? '#1E4DB7',
        time: r.schedule_slots?.start_time?.slice(0, 5) ?? '',
      }))
      const absItems: HistoryItem[] = ((absences ?? []) as unknown as RawHistRow[]).map(a => ({
        id: 'a:' + a.id,
        date: a.class_date,
        type: 'absence',
        className: a.schedule_slots?.class_types?.name ?? '—',
        color: a.schedule_slots?.class_types?.color ?? '#1E4DB7',
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
      <div className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
    </div>
  )

  const creditsMax  = maxRecoveriesPerMonth(profile?.schedule_type, plan)
  const creditsLeft = Math.max(0, creditsMax - recoveryUsed)
  const isRotating  = profile?.schedule_type === 'rotativo'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <p className="page-eyebrow">Perfil</p>

      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 mt-1 mb-7 animate-fade-in">
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #2657C9 0%, #1E4DB7 50%, #143A8C 100%)',
            boxShadow: '0 12px 32px rgba(30,77,183,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(232,200,147,0.4) 0%, transparent 70%)' }}/>
          <span className="font-display font-semibold text-3xl text-paper relative">{initials}</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-3xl text-navy leading-tight tracking-tight truncate">
            {profile?.full_name || 'Tu perfil'}
          </h1>
          <p className="font-mono text-[10px] text-ink/45 uppercase tracking-widest mt-1">
            {profile?.username ? <>Código · <span className="text-brand-deep font-semibold">{profile.username}</span></> : '—'}
          </p>
        </div>
      </div>

      {/* Card de cupo */}
      <div className="card-tint mb-3 px-5 py-5" style={{ ['--tint' as string]: '#1E4DB7' }}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-brand-deep/70 font-semibold">
          {isRotating ? 'Reservas este mes' : 'Recuperaciones este mes'}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <p className="font-display text-4xl font-semibold text-brand-deep tabular-nums leading-none">
            {creditsLeft}
            <span className="text-brand-deep/30 text-3xl">/{creditsMax}</span>
          </p>
          <div className="flex flex-wrap gap-1 flex-1">
            {Array.from({ length: creditsMax || 4 }).map((_, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full transition-all flex-shrink-0"
                style={{ backgroundColor: i < creditsLeft ? '#1E4DB7' : 'rgba(30,77,183,0.15)' }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="card mb-4 divide-y divide-ink/5">
        <div className="px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Plan</p>
          <p className="font-display text-xl text-navy tracking-tight">{plan?.name ?? '—'}</p>
          {plan && (
            <p className="font-mono text-[11px] text-ink/45 mt-1 tracking-wide">
              {plan.classes_per_week}× por semana
            </p>
          )}
        </div>

        {profile?.phone && (
          <div className="px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Teléfono</p>
            <p className="font-mono text-sm text-ink">{profile.phone}</p>
          </div>
        )}

        <div className="px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Miembro desde</p>
          <p className="font-mono text-sm text-ink capitalize">
            {profile?.created_at ? format(new Date(profile.created_at), "MMMM yyyy", { locale: es }) : '—'}
          </p>
        </div>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <div className="card mb-6">
          <div className="px-5 pt-4 pb-3 flex items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45 font-semibold">Últimas clases</p>
            <span className="flex-1 h-px bg-gradient-to-r from-ink/10 to-transparent"/>
          </div>
          <div className="divide-y divide-ink/5">
            {history.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-1 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-medium text-base truncate ${item.type === 'absence' ? 'text-ink/40 line-through' : 'text-ink'}`}>
                    {item.className}
                  </p>
                  <p className="font-mono text-[10px] text-ink/40 mt-0.5 tracking-wide capitalize">
                    {format(new Date(item.date + 'T12:00:00'), "d MMM yyyy", { locale: es })} · {item.time}h
                  </p>
                </div>
                <span className={`badge ${item.type === 'recovery' ? 'badge-brand' : 'badge-danger'}`}>
                  {item.type === 'recovery' ? (isRotating ? 'Reserva' : 'Recup.') : 'Falta'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleSignOut} className="btn-secondary mt-2">
        Cerrar sesión
      </button>
    </div>
  )
}
