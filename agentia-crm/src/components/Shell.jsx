import React, { useState, useRef, useEffect } from 'react'
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
    { key:'leads',     label:'Leads',     icon: I.Leads,    count: counts.leads },
    { key:'clientes',  label:'Clientes',  icon: I.Users,    count: counts.clientes },
    { key:'pipeline',  label:'Pipeline',  icon: I.Pipeline },
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
            <I.Settings size={14}/> Ajustes
          </div>
          <div className="row-menu-item" onPointerDown={() => handleNav('ajustes')}
            style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', fontSize:13, color:'var(--text-1)'}}>
            <I.Users size={14}/> Editar perfil
          </div>
        </div>
      )}
    </>
  )
}

export function Topbar({ crumb, setDrawerOpen, role, setRole, onMenuClick, notifCount = 0 }) {
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

      <div className="topbar-search">
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
