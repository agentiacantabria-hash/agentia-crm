'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
)
const ListIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
)
const UserIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const ShieldIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

export default function NavBar() {
  const path = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setLoggedIn(true)
      sb.from('profiles').select('is_admin').eq('id', user.id).single()
        .then(({ data }) => { if (data?.is_admin) setIsAdmin(true) })
    })
  }, [])

  const links = [
    { href: '/horario',    label: 'Horario',    Icon: CalendarIcon },
    { href: '/mis-clases', label: 'Mis clases', Icon: ListIcon },
    { href: loggedIn ? '/perfil' : '/login', label: loggedIn ? 'Perfil' : 'Entrar', Icon: UserIcon },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', Icon: ShieldIcon }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{ background: 'rgba(244,239,230,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(11,31,77,0.07)' }}>
      <div className="flex px-2 py-1">
        {links.map(({ href, label, Icon }) => {
          const active = path === href || (href !== '/login' && href !== '/' && path.startsWith(href))
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl text-[9px] font-mono uppercase tracking-wider transition-all relative
                ${active ? 'text-navy' : 'text-ink/30'}`}
            >
              {active && (
                <span className="absolute inset-0 rounded-2xl bg-navy/8"/>
              )}
              <span className="relative z-10">
                <Icon active={active} />
              </span>
              <span className="relative z-10 font-semibold">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
