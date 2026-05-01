'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function RegistroPage() {
  const [code, setCode]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6)  { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toLowerCase(), password }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al registrarse'); setLoading(false); return }

    router.push('/horario')
    router.refresh()
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-end overflow-hidden">
      {/* Background gradient cobalto */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, #07153A 0%, #143A8C 35%, #1E4DB7 70%, #2657C9 100%)' }}/>

      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(155,196,188,0.25) 0%, transparent 60%)' }}/>
      <div className="absolute top-32 -left-20 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,200,147,0.18) 0%, transparent 68%)' }}/>
      <div className="absolute bottom-72 right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,180,188,0.2) 0%, transparent 70%)' }}/>

      <div className="relative z-10 px-7 pb-7 pt-16 animate-fade-in">
        <div className="mb-6">
          <Logo size={72} glow />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-paper/55 mb-3 font-semibold">Equilibria</p>
        <h1 className="font-display font-medium text-[3.25rem] text-paper leading-[0.95] tracking-tight">
          Bienvenida<br/><em>al centro.</em>
        </h1>
        <p className="text-paper/55 text-sm mt-4 leading-relaxed">
          Usa el código que te ha dado Equilibria
        </p>
      </div>

      <div className="relative z-10 bg-paper rounded-t-[2rem] px-6 pt-8 pb-12 animate-slide-up"
        style={{ boxShadow: '0 -16px 60px rgba(7,21,58,0.4)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
              Tu código de acceso
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
              Crea tu contraseña
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/45 mb-2 font-semibold">
              Repite la contraseña
            </label>
            <input
              type="password" required value={confirm}
              onChange={e => setConfirm(e.target.value)}
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
            {loading ? 'Creando cuenta…' : 'Activar mi cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/40 mt-8 font-mono">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-brand-deep font-bold underline-offset-2 hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}
