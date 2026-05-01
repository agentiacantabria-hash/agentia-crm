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

const TYPE_META: Record<string, { emoji: string; tint: string; label: string }> = {
  waitlist_freed:  { emoji: '🎉', tint: '#9BC4BC', label: 'Plaza libre' },
  class_cancelled: { emoji: '⚠️', tint: '#E8C893', label: 'Cancelación' },
  announcement:    { emoji: '📢', tint: '#1E4DB7', label: 'Aviso' },
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

    if ((data ?? []).some((n: Notif) => !n.is_read)) {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    }
  }, [router])

  useEffect(() => { load() }, [load])

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
      <div className="w-8 h-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin"/>
    </div>
  )

  const unreadCount = items.filter(n => !n.is_read).length

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <p className="page-eyebrow">Avisos</p>
      <h1 className="page-title">
        {unreadCount > 0 ? <>Tienes <em>novedades</em></> : <em>Notificaciones</em>}
      </h1>
      {unreadCount > 0 && (
        <p className="font-mono text-xs text-brand-deep/60 mt-2 tracking-wide">
          {unreadCount} sin leer
        </p>
      )}

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(155,196,188,0.2) 0%, transparent 70%)' }}>
              <span className="text-4xl">🔕</span>
            </div>
            <p className="font-display text-xl text-navy mb-1">Todo al día</p>
            <p className="text-ink/45 text-sm max-w-xs mx-auto">Cuando haya novedades te avisaremos aquí en tiempo real</p>
          </div>
        ) : (
          <div className="space-y-2.5 animate-slide-up">
            {items.map(n => {
              const meta = TYPE_META[n.type] ?? { emoji: '🔔', tint: '#1E4DB7', label: 'Aviso' }
              const ago = formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })
              const content = (
                <div className={`card-tint relative overflow-hidden flex gap-3 px-5 py-4 transition-all ${n.is_read ? 'opacity-65' : ''}`}
                  style={{ ['--tint' as string]: meta.tint }}>
                  {!n.is_read && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand animate-pulse-soft" aria-label="sin leer"/>
                  )}
                  <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{meta.emoji}</span>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 font-semibold mb-1">
                      {meta.label}
                    </p>
                    <p className="font-display font-semibold text-navy text-base leading-snug tracking-tight">
                      {n.title}
                    </p>
                    {n.body && <p className="text-ink/65 text-sm mt-1 leading-relaxed">{n.body}</p>}
                    <p className="font-mono text-[10px] text-ink/35 uppercase tracking-wider mt-2.5">{ago}</p>
                  </div>
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
    </div>
  )
}
