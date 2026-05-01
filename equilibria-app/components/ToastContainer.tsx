'use client'
import { useEffect, useState } from 'react'
import type { ToastDetail, ToastKind } from '@/lib/toast'

type ToastItem = ToastDetail & { id: number }

let nextId = 1

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  error:   '!',
  info:    'i',
}

const STYLES: Record<ToastKind, { bg: string; tint: string; iconBg: string; iconText: string }> = {
  success: { bg: 'bg-white',     tint: 'border-teal/40 ring-teal/15',     iconBg: 'bg-teal/30',  iconText: 'text-emerald-800' },
  error:   { bg: 'bg-white',     tint: 'border-red-200 ring-red-100',     iconBg: 'bg-red-100',  iconText: 'text-red-700'    },
  info:    { bg: 'bg-white',     tint: 'border-brand/30 ring-brand/15',   iconBg: 'bg-brand/15', iconText: 'text-brand-deep' },
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const e = event as CustomEvent<ToastDetail>
      const item: ToastItem = {
        id: nextId++,
        kind: e.detail.kind ?? 'info',
        message: e.detail.message,
        durationMs: e.detail.durationMs ?? 2600,
      }
      setItems(prev => [...prev, item])
      const t = window.setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== item.id))
      }, item.durationMs)
      return () => window.clearTimeout(t)
    }
    window.addEventListener('eq-toast', handler as EventListener)
    return () => window.removeEventListener('eq-toast', handler as EventListener)
  }, [])

  if (!items.length) return null

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
    >
      {items.map(item => {
        const kind = (item.kind ?? 'info') as ToastKind
        const s = STYLES[kind]
        return (
          <div key={item.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-card-hover ring-4 animate-spring-in min-w-[260px] max-w-[340px] ${s.bg} ${s.tint}`}>
            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-display font-bold ${s.iconBg} ${s.iconText}`}>
              {ICONS[kind]}
            </span>
            <p className="font-display text-sm text-ink leading-snug flex-1">
              {item.message}
            </p>
          </div>
        )
      })}
    </div>
  )
}
