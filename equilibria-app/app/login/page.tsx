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
    <div className="min-h-screen bg-navy flex flex-col justify-end">
      <div className="px-6 pb-4 pt-16">
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40 mb-2">Equilibria</p>
        <h1 className="font-display font-bold text-5xl text-paper leading-none mb-1">
          Hola<br />de nuevo.
        </h1>
        <p className="text-paper/40 text-sm mt-3">Entra con el código que te dio Equilibria</p>
      </div>

      <div className="bg-paper rounded-t-3xl px-6 pt-8 pb-12">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-2">
              Tu código
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
              Contraseña
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-ink/30 mt-8">
          ¿No tienes código? Contacta con Equilibria en el 684 80 30 11
        </p>
      </div>
    </div>
  )
}
