'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [code, setCode]         = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const sb = createClient()
    const email = `${code.trim().toLowerCase()}@equilibria.app`
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Código o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/horario')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-end overflow-hidden">
      {/* Background gradient cobalto */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, #07153A 0%, #143A8C 35%, #1E4DB7 70%, #2657C9 100%)' }}/>

      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,200,147,0.25) 0%, transparent 60%)' }}/>
      <div className="absolute top-32 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(155,196,188,0.2) 0%, transparent 65%)' }}/>
      <div className="absolute bottom-72 right-12 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}/>

      {/* Headline + Logo */}
      <div className="relative z-10 px-7 pb-7 pt-16 animate-fade-in">
        <div className="mb-6">
          <Logo size={72} glow />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-paper/55 mb-3 font-semibold">Equilibria</p>
        <h1 className="font-display font-medium text-[3.25rem] text-paper leading-[0.95] tracking-tight">
          Hola<br/><em className="text-paper">de nuevo.</em>
        </h1>
        <p className="text-paper/55 text-sm mt-4 leading-relaxed">
          Entra con el código que te dio Equilibria
        </p>
      </div>

      {/* Form card */}
      <div className="relative z-10 bg-paper rounded-t-[2rem] px-6 pt-8 pb-12 animate-slide-up"
        style={{ boxShadow: '0 -16px 60px rgba(7,21,58,0.4)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
              Tu código
            </label>
            <input
              type="text" required autoCapitalize="none" value={code}
              onChange={e => setCode(e.target.value)}
              className="input-field font-display text-xl tracking-widest"
              placeholder="ej. 03"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
              Contraseña
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 animate-fade-in">
              <p className="font-mono text-sm text-red-700">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-3">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/40 mt-8 font-mono leading-relaxed">
          ¿No tienes código?<br/>
          Contacta con Equilibria en el <span className="text-brand-deep font-semibold">684 80 30 11</span>
        </p>
      </div>
    </div>
  )
}
