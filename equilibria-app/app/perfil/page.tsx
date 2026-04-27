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

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Perfil</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-8">{profile?.full_name || 'Tu perfil'}</h1>

      <div className="bg-white rounded-2xl divide-y divide-ink/5 mb-4">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-0.5">Tu código</p>
            <p className="font-display font-bold text-navy text-lg">{profile?.username ?? '—'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center">
            <span className="font-display font-bold text-navy text-sm">{profile?.username ?? '?'}</span>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-0.5">Plan</p>
          <p className="text-ink font-display font-bold">{plan?.name ?? '—'}</p>
          {plan && (
            <p className="font-mono text-[10px] text-ink/40 mt-0.5">
              {plan.classes_per_week}× por semana · {creditsLeft}/{creditsMax} recuperaciones este mes
            </p>
          )}
        </div>

        {profile?.phone && (
          <div className="px-4 py-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-0.5">Teléfono</p>
            <p className="text-ink text-sm">{profile.phone}</p>
          </div>
        )}

        <div className="px-4 py-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mb-0.5">Miembro desde</p>
          <p className="text-ink text-sm">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-ES') : '—'}
          </p>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full mt-2 bg-ink/5 text-ink/60 font-display font-bold py-4 rounded-2xl text-base"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
