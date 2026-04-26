import React, { useState, useRef, useEffect } from 'react'
import { I } from './Icons'
import { supabase } from '../lib/supabase'


export function Sidebar({ page, setPage, role, counts, isOpen, onClose, currentUser, onSignOut, onProfileOpen }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ bottom: 80, right: 16 })
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

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
          <div className="avatar">{currentUser?.iniciales || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{currentUser?.nombre || 'Usuario'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {currentUser?.rol || 'Empleado'} · Agentia
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
          <div className="row-menu-item" onPointerDown={() => { setMenuOpen(false); onProfileOpen?.() }}
            style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', fontSize:13, color:'var(--text-1)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Mi perfil
          </div>
          {role === 'admin' && (
            <div className="row-menu-item" onPointerDown={() => handleNav('ajustes')}
              style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', fontSize:13, color:'var(--text-1)'}}>
              <I.Settings size={14}/> Ajustes y equipo
            </div>
          )}
          <div onPointerDown={() => { setMenuOpen(false); onSignOut?.() }}
            style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', cursor:'pointer', fontSize:13, color:'#FF8FA0', borderTop:'1px solid var(--line-1)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar sesión
          </div>
        </div>
      )}
    </>
  )
}

export function SearchModal({ open, onClose, data, setPage, onSelect }) {
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

  const { leads = [], clientes = [], tasks = [], proyectos = [] } = data || {}
  const ql = q.toLowerCase().trim()

  const match = (v) => v?.toLowerCase().includes(ql)
  const results = ql.length < 1 ? [] : [
    ...leads.filter(l => match(l.empresa) || match(l.servicio) || match(l.contacto) || match(l.email) || match(l.notas) || match(l.ciudad) || match(l.sector))
      .slice(0,5).map(l => ({ type:'Lead', label: l.empresa, sub: [l.contacto, l.estado].filter(Boolean).join(' · '), page:'pipeline', color:'var(--brand-2)', item: l })),
    ...clientes.filter(c => match(c.nombre) || match(c.servicio) || match(c.contacto) || match(c.email))
      .slice(0,4).map(c => ({ type:'Cliente', label: c.nombre, sub: [c.contacto, c.servicio].filter(Boolean).join(' · '), page:'clientes', color:'var(--ok)', item: c })),
    ...tasks.filter(t => match(t.title) || match(t.cliente))
      .slice(0,4).map(t => ({ type:'Tarea', label: t.title, sub: t.cliente, page:'tareas', color:'var(--violet)', item: t })),
    ...proyectos.filter(p => match(p.cliente) || match(p.servicio))
      .slice(0,3).map(p => ({ type:'Proyecto', label: p.cliente, sub: p.servicio ? `${p.servicio} · ${p.estado||''}` : p.estado, page:'proyectos', color:'#FFB547', item: p })),
  ]

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:900,backdropFilter:'blur(4px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'18%',left:'50%',transform:'translateX(-50%)',width:'min(560px,92vw)',background:'var(--surface-1)',border:'1px solid var(--line-2)',borderRadius:16,boxShadow:'0 24px 60px rgba(0,0,0,0.7)',zIndex:901,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:'1px solid var(--line-1)'}}>
          <I.Search size={16} style={{color:'var(--text-3)',flexShrink:0}}/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por empresa, contacto, email, notas…"
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
            <div style={{padding:'32px 0',textAlign:'center',color:'var(--text-4)',fontSize:13}}>Escribe para buscar en leads, clientes, tareas y proyectos</div>
          )}
          {results.map((r,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',cursor:'pointer',borderBottom:'1px solid var(--line-1)'}}
              onPointerDown={() => { onSelect ? onSelect(r) : setPage(r.page); onClose() }}
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

export function Topbar({ crumb, setDrawerOpen, role, onMenuClick, notifCount = 0, onSearchOpen, onBellOpen, currentUser }) {
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
        <span>Buscar clientes, leads, tareas, proyectos…</span>
        <kbd>⌘K</kbd>
      </div>

      <button className="icon-btn" title="Notificaciones" style={{position:'relative'}} onClick={onBellOpen}>
        <I.Bell size={16} />
        {notifCount > 0 && <span className="dot" style={{position:'absolute', top:6, right:6}} />}
      </button>
      <button className="btn primary" onClick={() => setDrawerOpen(true)}>
        <I.Plus size={14} /> Nuevo lead
      </button>
    </header>
  )
}

export function BellPanel({ open, onClose, tasks = [], cobros = [] }) {
  if (!open) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const urgentes = tasks.filter(t => {
    if (t.done) return false
    if (t.due_date) return new Date(t.due_date + 'T00:00:00') < today
    return t.when_group === 'vencida'
  })
  const cobrosVencidos = cobros.filter(c => !c.pagado && (c.vencida || (c.vence && new Date(c.vence.length === 10 ? c.vence + 'T00:00:00' : c.vence) < today)))
  const total = urgentes.length + cobrosVencidos.length

  return (
    <>
      <div style={{position:'fixed',inset:0,zIndex:800}} onClick={onClose}/>
      <div style={{
        position:'fixed', top:60, right:16, width:340,
        background:'var(--surface-1)', border:'1px solid var(--line-2)',
        borderRadius:14, boxShadow:'0 16px 50px rgba(0,0,0,0.6)', zIndex:801,
        overflow:'hidden', maxHeight:'80vh', overflowY:'auto',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:8, padding:'14px 16px', borderBottom:'1px solid var(--line-1)', position:'sticky', top:0, background:'var(--surface-1)'}}>
          <I.Bell size={15} style={{color:'var(--brand-2)'}}/>
          <span style={{fontSize:13.5, fontWeight:600}}>Notificaciones</span>
          <span style={{marginLeft:'auto', fontSize:11, color:'var(--text-4)'}}>{total} pendientes</span>
        </div>

        {total === 0 && (
          <div style={{padding:'32px 16px', textAlign:'center', color:'var(--text-4)', fontSize:13}}>
            Sin alertas — todo al día ✓
          </div>
        )}

        {urgentes.length > 0 && (
          <>
            <div style={{fontSize:10.5, fontWeight:600, color:'var(--text-4)', padding:'10px 16px 4px', textTransform:'uppercase', letterSpacing:'0.07em'}}>Tareas vencidas</div>
            {urgentes.slice(0,5).map(t => (
              <div key={t.id} style={{display:'flex', alignItems:'flex-start', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--line-1)'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#FF5A6A', marginTop:5, flexShrink:0}}/>
                <div>
                  <div style={{fontSize:13, color:'var(--text-0)', lineHeight:1.4}}>{t.title}</div>
                  {t.cliente && <div style={{fontSize:11.5, color:'var(--text-3)', marginTop:2}}>{t.cliente}</div>}
                </div>
              </div>
            ))}
          </>
        )}

        {cobrosVencidos.length > 0 && (
          <>
            <div style={{fontSize:10.5, fontWeight:600, color:'var(--text-4)', padding:'10px 16px 4px', textTransform:'uppercase', letterSpacing:'0.07em'}}>Cobros vencidos</div>
            {cobrosVencidos.slice(0,5).map(c => (
              <div key={c.id} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom:'1px solid var(--line-1)'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#FFB547', flexShrink:0}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:'var(--text-0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.cliente}</div>
                  {c.concepto && <div style={{fontSize:11.5, color:'var(--text-3)', marginTop:2}}>{c.concepto}</div>}
                </div>
                <div style={{fontSize:13, fontWeight:600, color:'#FFB547', fontFamily:'var(--font-mono)', flexShrink:0}}>€{(c.monto||0).toLocaleString('es-ES')}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

export function ProfileModal({ currentUser, onClose, onSave }) {
  const [nombre,   setNombre]   = useState(currentUser?.nombre   || '')
  const [newPass,  setNewPass]  = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null) // { type:'ok'|'err', text }

  const handleSave = async (e) => {
    e.preventDefault()
    if (newPass && newPass !== confirm) { setMsg({ type:'err', text:'Las contraseñas no coinciden.' }); return }
    if (newPass && newPass.length < 6)  { setMsg({ type:'err', text:'La contraseña debe tener al menos 6 caracteres.' }); return }
    setSaving(true); setMsg(null)
    try {
      await onSave({ nombre: nombre.trim() || currentUser.nombre })
      if (newPass) {
        const { error } = await supabase.auth.updateUser({ password: newPass })
        if (error) { setMsg({ type:'err', text:'No se pudo cambiar la contraseña.' }); setSaving(false); return }
      }
      setMsg({ type:'ok', text:'Perfil actualizado correctamente.' })
      setNewPass(''); setConfirm('')
    } catch {
      setMsg({ type:'err', text:'Error al guardar. Inténtalo de nuevo.' })
    }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'10px 13px', borderRadius:9, background:'var(--surface-3)', border:'1px solid var(--line-2)', color:'var(--text-0)', fontSize:14, outline:'none', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:600, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:5 }

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:900,backdropFilter:'blur(4px)'}} onClick={onClose}/>
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'min(420px,94vw)',background:'var(--surface-1)',border:'1px solid var(--line-2)',borderRadius:16,boxShadow:'0 24px 60px rgba(0,0,0,0.7)',zIndex:901,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px',borderBottom:'1px solid var(--line-1)'}}>
          <div className="avatar" style={{width:40,height:40,fontSize:14,borderRadius:11,flexShrink:0}}>{currentUser?.iniciales}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700}}>Mi perfil</div>
            <div style={{fontSize:12,color:'var(--text-4)',marginTop:1}}>{currentUser?.email || ''} · <span style={{textTransform:'uppercase',letterSpacing:'0.04em'}}>{currentUser?.rol}</span></div>
          </div>
          <button className="icon-btn" onClick={onClose}><I.Close size={14}/></button>
        </div>

        <form onSubmit={handleSave} style={{padding:'20px'}}>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Nombre visible</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} placeholder="Tu nombre" autoFocus />
          </div>

          <div style={{marginBottom:6}}>
            <label style={lbl}>Iniciales</label>
            <input value={currentUser?.iniciales || ''} disabled style={{...inp, opacity:0.45, cursor:'not-allowed'}} />
            <div style={{fontSize:11,color:'var(--text-4)',marginTop:5,lineHeight:1.5}}>Las iniciales identifican tu trabajo en el CRM. Para cambiarlas contacta con el administrador.</div>
          </div>

          <div style={{height:1,background:'var(--line-1)',margin:'20px 0'}}/>

          <div style={{marginBottom:12,fontSize:12,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Cambiar contraseña</div>
          <div style={{marginBottom:12}}>
            <label style={lbl}>Nueva contraseña</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={inp} placeholder="Dejar vacío para no cambiar" />
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Confirmar contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} style={inp} placeholder="Repite la nueva contraseña" />
          </div>

          {msg && (
            <div style={{padding:'10px 13px',borderRadius:8,marginBottom:14,fontSize:13,
              background: msg.type==='ok' ? 'rgba(62,207,142,0.08)' : 'rgba(255,90,106,0.08)',
              border: `1px solid ${msg.type==='ok' ? 'rgba(62,207,142,0.25)' : 'rgba(255,90,106,0.25)'}`,
              color: msg.type==='ok' ? 'var(--ok)' : 'var(--danger)',
            }}>{msg.text}</div>
          )}

          <div style={{display:'flex',gap:10}}>
            <button type="button" className="btn ghost" style={{flex:1}} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn primary" style={{flex:2}} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
