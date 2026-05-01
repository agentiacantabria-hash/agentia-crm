'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

type Notif = {
  id: string
  type: 'waitlist_freed' | 'class_cancelled' | 'announcement' | string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

const TYPE_EMOJI: Record<string, string> = {
  waitlist_freed:  '🎉',
  class_cancelled: '⚠️',
  announcement:    '📢',
}

export default function AvisosPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setItems((data ?? []) as Notif[])
    setLoading(false)

    // Marcar todas como leídas tras mostrarlas
    if ((data ?? []).some((n: Notif) => !n.is_read)) {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Realtime: aparecer al instante si llega nueva
  useEffect(() => {
    const sb = createClient()
    let channel: ReturnType<typeof sb.channel> | null = null
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = sb.channel('avisos-page-' + user.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => load())
        .subscribe()
    })
    return () => { if (channel) sb.removeChannel(channel) }
  }, [load])

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-7 h-7 rounded-full border-2 border-navy border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">Avisos</p>
      <h1 className="font-display font-bold text-3xl text-navy mb-6">Notificaciones</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔕</p>
          <p className="font-display font-bold text-xl text-navy mb-2">Todo al día</p>
          <p className="text-ink/40 text-sm">Cuando haya novedades te avisaremos aquí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => {
            const emoji = TYPE_EMOJI[n.type] ?? '🔔'
            const ago = formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })
            const content = (
              <div className={`card flex gap-3 px-4 py-3 transition-opacity ${n.is_read ? 'opacity-60' : ''}`}>
                <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-navy text-sm leading-tight">{n.title}</p>
                  {n.body && <p className="text-ink/70 text-sm mt-1 leading-snug">{n.body}</p>}
                  <p className="font-mono text-[9px] text-ink/30 uppercase tracking-wider mt-2">{ago}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue flex-shrink-0 mt-2" aria-label="sin leer"/>
                )}
              </div>
            )
            return n.link ? (
              <Link key={n.id} href={n.link} className="block active:scale-[0.99] transition-transform">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
