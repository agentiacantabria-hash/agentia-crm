'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(145deg, #07153A 0%, #0B1F4D 55%, #15306B 100%)' }}/>

      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(46,91,255,0.22) 0%, transparent 68%)' }}/>
      <div className="absolute top-28 -left-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,222,115,0.13) 0%, transparent 68%)' }}/>
      <div className="absolute bottom-72 right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(185,168,222,0.15) 0%, transparent 70%)' }}/>

      {/* Headline */}
      <div className="relative z-10 px-7 pb-7 pt-20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 mb-3">Equilibria</p>
        <h1 className="font-display font-extrabold text-5xl text-paper leading-[0.92] tracking-tight">
          Hola<br/>de nuevo.
        </h1>
        <p className="text-paper/45 text-sm mt-4">Entra con el código que te dio Equilibria</p>
      </div>

      {/* Form card */}
      <div className="relative z-10 bg-paper rounded-t-[2rem] px-6 pt-8 pb-14"
        style={{ boxShadow: '0 -8px 40px rgba(7,21,58,0.35)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
              Tu código
            </label>
            <input
              type="text" required autoCapitalize="none" value={code}
              onChange={e => setCode(e.target.value)}
              className="input-field text-lg font-display font-bold tracking-widest"
              placeholder="ej. 03"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
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
            <p className="text-red-600 text-sm bg-red-50 rounded-2xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/30 mt-8 font-mono">
          ¿No tienes código? Contacta con Equilibria en el 684 80 30 11
        </p>
      </div>
    </div>
  )
}
