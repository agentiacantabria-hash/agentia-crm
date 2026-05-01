'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(145deg, #07153A 0%, #0B1F4D 55%, #15306B 100%)' }}/>

      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(162,198,230,0.2) 0%, transparent 68%)' }}/>
      <div className="absolute top-28 -left-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(169,222,132,0.12) 0%, transparent 68%)' }}/>
      <div className="absolute bottom-72 right-12 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(244,189,210,0.18) 0%, transparent 70%)' }}/>

      {/* Headline */}
      <div className="relative z-10 px-7 pb-7 pt-20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 mb-3">Equilibria</p>
        <h1 className="font-display font-extrabold text-5xl text-paper leading-[0.92] tracking-tight">
          Bienvenido<br/>al centro.
        </h1>
        <p className="text-paper/45 text-sm mt-4">Usa el código que te ha dado Equilibria</p>
      </div>

      {/* Form card */}
      <div className="relative z-10 bg-paper rounded-t-[2rem] px-6 pt-8 pb-14"
        style={{ boxShadow: '0 -8px 40px rgba(7,21,58,0.35)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
              Tu código de acceso
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
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
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
            <p className="text-red-600 text-sm bg-red-50 rounded-2xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Creando cuenta…' : 'Activar mi cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/30 mt-8 font-mono">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-navy font-semibold">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}
