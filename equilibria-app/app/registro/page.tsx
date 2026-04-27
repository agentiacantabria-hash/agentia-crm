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
    <div className="min-h-screen bg-navy flex flex-col justify-end">
      <div className="px-6 pb-4 pt-16">
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 mb-2">Equilibria</p>
        <h1 className="font-display font-bold text-5xl text-paper leading-none mb-1">
          Bienvenido<br />al centro.
        </h1>
        <p className="text-paper/40 text-sm mt-3">Usa el código que te ha dado Equilibria</p>
      </div>

      <div className="bg-paper rounded-t-3xl px-6 pt-8 pb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
              Tu código de acceso
            </label>
            <input
              type="text" required autoCapitalize="none" value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-paper-2 rounded-2xl px-4 py-4 text-ink text-lg font-display font-bold outline-none focus:ring-2 focus:ring-navy tracking-widest"
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
              className="w-full bg-paper-2 rounded-2xl px-4 py-4 text-ink text-base outline-none focus:ring-2 focus:ring-navy"
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
              className="w-full bg-paper-2 rounded-2xl px-4 py-4 text-ink text-base outline-none focus:ring-2 focus:ring-navy"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-2xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-navy text-paper font-display font-bold py-4 rounded-2xl text-base mt-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? 'Creando cuenta…' : 'Activar mi cuenta'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/30 mt-8">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-navy font-semibold">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}
