'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Plan } from '@/lib/types'

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [recoveryUsed, setRecoveryUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

      const [
        { data: profileData },
        { count: used },
      ] = await Promise.all([
        sb.from('profiles').select('*, plans(*)').eq('id', user.id).single(),
        sb.from('recovery_bookings').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'confirmed')
          .gte('class_date', monthStart.toISOString().slice(0, 10)),
      ])

      setProfile(profileData as Profile)
      setPlan((profileData?.plans as unknown as Plan) ?? null)
      setRecoveryUsed(used ?? 0)
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

  const creditsMax  = plan?.max_recoveries_per_month ?? 0
  const creditsLeft = Math.max(0, creditsMax - recoveryUsed)

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
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-2">Recuperaciones este mes</p>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: creditsMax || 4 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full transition-colors"
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

      <button onClick={handleSignOut}
        className="btn-secondary mt-2">
        Cerrar sesión
      </button>
    </div>
  )
}
