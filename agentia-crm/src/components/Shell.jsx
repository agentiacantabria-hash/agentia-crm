import React, { useState, useRef, useEffect, useCallback } from 'react'
import { I } from './Icons'

function getSidebarUser(role) {
  try {
    const users = JSON.parse(localStorage.getItem('agentia_usuarios') || '[]')
    const u = users.find(u => u.rol === (role === 'admin' ? 'Admin' : 'Empleado') && u.estado === 'activo')
    return u || { n: role === 'admin' ? 'Administrador' : 'Empleado', ini: role === 'admin' ? 'AD' : 'EM' }
  } catch { return { n: 'Usuario', ini: 'U' } }
}

export function Sidebar({ page, setPage, role, counts, isOpen, onClose }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ bottom: 80, right: 16 })
  const btnRef  = useRef(null)
  const menuRef = useRef(null)
  const user = getSidebarUser(role)

  useEffect(() => {
    function handleClose(e) {
      if (btnRef.current  && btnRef.current.contains(e.target))  return
      if (menuRef.current && menuRef.current.contains(e.target)) return
      setMenuOpen(false)
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClose)
      document.addEventListener('touchstart', handleClose, { passive: true })
      return () => {
        document.removeEventListener('mousedown', handleClose)
        document.removeEventListener('touchstart', handleClose)
      }
    }
  }, [menuOpen])

  const nav = [
    { key:'dashboard', label:'Inicio',    icon: I.Home },
    { key:'pipeline',  label:'Pipeline',  icon: I.Pipeline, count: counts.leads },
    { key:'clientes',  label:'Clientes',  icon: I.Users,    count: counts.clientes },
    { key:'tareas',    label:'Tareas',    icon: I.Tasks,    count: counts.tareas },
    { key:'proyectos', label:'Proyectos', icon: I.Projects, count: counts.proyectos },
  ]
  const admin = [
    { key:'finanzas', label:'Finanzas', icon: I.Finance,  adminOnly: true },
    { key:'ajustes',  label:'Ajustes',  icon: I.Settings, adminOnly: true },
  ]

  const handleNav = (key) => { setPage(key); onClose?.(); setMenuOpen(false) }

  const handleMenuToggle = () => {
    if (!menuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      })
    }
    setMenuOpen(o => !o)
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo" aria-label="Agentia logo" />
          <div>
            <div className="name">Agentia</div>
            <div className="tag">CRM · v1.0</div>
          </div>
        </div>

        <div className="nav-section-label">Trabajo</div>
        {nav.map(n => (
          <div key={n.key} className={`nav-item ${page === n.key ? 'active' : ''}`} onClick={() => handleNav(n.key)}>
            <n.icon />
            <span>{n.label}</span>
            {n.count != null && <span className="count">{n.count}</span>}
          </div>
        ))}

        <div className="nav-section-label">Administración</div>
        {admin.map(n => {
          const disabled = n.adminOnly && role !== 'admin'
          return (
            <div key={n.key}
                 className={`nav-item ${page === n.key ? 'active' : ''}`}
                 style={disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                 onClick={() => !disabled && handleNav(n.key)}>
              <n.icon />
              <span>{n.label}</span>
              {disabled && <I.Lock size={13} style={{ marginLeft: 'auto', color: 'var(--text-4)' }} />}
            </div>
          )
        })}

        <div className="sidebar-footer">
          <div className="avatar">{user.ini || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.n}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {role === 'admin' ? 'Admin' : 'Empleado'} · Agentia
            </div>
          </div>
          <button ref={btnRef} className="icon-btn" style={{width:28, height:28}} onClick={handleMenuToggle}>
            <I.MoreH size={16} />
          </button>
        </div>
      </aside>

      {menuOpen && (
        <div ref={menuRef} style={{
          position:'fixed',
          bottom: menuPos.bottom,
          left: menuPos.left,
          background:'var(--surface-2)',
          border:'1px solid var(--line-2)',
          borderRadius:10, padding:'6px 0', minWidth:180,
          boxShadow:'0 8px 30px rgba(0,0,0,0.5)',
          zIndex:400,
        }}>
          <div className="row-menu-item" onPointerDown={() => handleNav('ajustes')}
            style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', fontSize:13, color:'var(--text-1)'}}>
            <I.Settings size={14}/> Ajustes y equipo
          </div>
        </div>
      )}
    </>
  )
}

export function SearchModal({ open, onClose, data, setPage }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : null } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const { leads = [], clientes = [], tasks = [] } = data || {}
  const ql = q.toLowerCase().trim()

  const results = ql.length < 1 ? [] : [
    ...leads.filter(l => l.empresa?.toLowerCase().includes(ql) || l.servicio?.toLowerCase().includes(ql))
      .slice(0,4).map(l => ({ type:'Lead', label: l.empresa, sub: l.estado, page:'pipeline', color:'var(--brand-2)' })),
    ...clientes.filter(c => c.nombre?.toLowerCase().includes(ql) || c.servicio?.toLowerCase().includes(ql))
      .slice(0,4).map(c => ({ type:'Cliente', label: c.nombre, sub: c.servicio, page:'clientes', color:'var(--ok)' })),
    ...tasks.filter(t => t.title?.toLowerCase().includes(ql) || t.cliente?.toLowerCase().includes(ql))
      .slice(0,4).map(t => ({ type:'Tarea', label: t.title, sub: t.cliente, page:'tareas', color:'var(--violet)' })),
  ]

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:900,backdropFilter:'blur(4px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'18%',left:'50%',transform:'translateX(-50%)',width:'min(560px,92vw)',background:'var(--surface-1)',border:'1px solid var(--line-2)',borderRadius:16,boxShadow:'0 24px 60px rgba(0,0,0,0.7)',zIndex:901,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:'1px solid var(--line-1)'}}>
          <I.Search size={16} style={{color:'var(--text-3)',flexShrink:0}}/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar leads, clientes, tareas…"
            style={{flex:1,background:'none',border:'none',outline:'none',fontSize:15,color:'var(--text-0)'}}
            onKeyDown={e => { if (e.key === 'Escape') onClose() }}
          />
          <kbd style={{fontSize:11,color:'var(--text-4)',border:'1px solid var(--line-2)',borderRadius:5,padding:'2px 6px'}}>Esc</kbd>
        </div>
        <div style={{maxHeight:360,overflowY:'auto'}}>
          {results.length === 0 && ql.length > 0 && (
            <div style={{padding:'32px 0',textAlign:'center',color:'var(--text-4)',fontSize:13}}>Sin resultados para "{q}"</div>
          )}
          {results.length === 0 && ql.length === 0 && (
            <div style={{padding:'32px 0',textAlign:'center',color:'var(--text-4)',fontSize:13}}>Escribe para buscar en leads, clientes y tareas</div>
          )}
          {results.map((r,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',cursor:'pointer',borderBottom:'1px solid var(--line-1)'}}
              onPointerDown={() => { setPage(r.page); onClose() }}
              onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background=''}
            >
              <span style={{fontSize:11,fontWeight:600,color:r.color,background:`${r.color}18`,padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>{r.type}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,color:'var(--text-0)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</div>
                {r.sub && <div style={{fontSize:12,color:'var(--text-3)',marginTop:1}}>{r.sub}</div>}
              </div>
              <I.ChevronR size={13} style={{color:'var(--text-4)',flexShrink:0}}/>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Topbar({ crumb, setDrawerOpen, role, setRole, onMenuClick, notifCount = 0, onSearchOpen }) {
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onSearchOpen?.() } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSearchOpen])

  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuClick} aria-label="Abrir menú">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/>
        </svg>
      </button>
      <div className="crumb">{crumb.map((c, i) => (
        <span key={i}>{i === crumb.length - 1
          ? <b>{c}</b>
          : <>{c} <span style={{ opacity: 0.4, margin: '0 6px' }}>/</span></>}
        </span>
      ))}</div>

      <div className="topbar-search" style={{cursor:'pointer'}} onClick={onSearchOpen}>
        <I.Search size={14} />
        <span>Buscar clientes, leads, tareas…</span>
        <kbd>⌘K</kbd>
      </div>

      <div className="segmented" title="Cambiar rol (demo)">
        <button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admin</button>
        <button className={role === 'empleado' ? 'active' : ''} onClick={() => setRole('empleado')}>Empleado</button>
      </div>

      <button className="icon-btn" title="Notificaciones" style={{position:'relative'}}>
        <I.Bell size={16} />
        {notifCount > 0 && <span className="dot" style={{position:'absolute', top:6, right:6}} />}
      </button>
      <button className="btn primary" onClick={() => setDrawerOpen(true)}>
        <I.Plus size={14} /> Nuevo lead
      </button>
    </header>
  )
}
