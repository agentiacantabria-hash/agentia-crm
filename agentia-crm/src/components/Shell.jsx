import React, { useState } from 'react'
import { I } from './Icons'

export function Sidebar({ page, setPage, role, counts }) {
  const nav = [
    { key:'dashboard', label:'Inicio',    icon: I.Home },
    { key:'leads',     label:'Leads',     icon: I.Leads,    count: counts.leads },
    { key:'clientes',  label:'Clientes',  icon: I.Users,    count: counts.clientes },
    { key:'pipeline',  label:'Pipeline',  icon: I.Pipeline },
    { key:'tareas',    label:'Tareas',    icon: I.Tasks,    count: counts.tareas },
    { key:'proyectos', label:'Proyectos', icon: I.Projects, count: counts.proyectos },
  ]
  const admin = [
    { key:'finanzas', label:'Finanzas', icon: I.Finance,   adminOnly: true },
    { key:'ajustes',  label:'Ajustes',  icon: I.Settings,  adminOnly: true },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo" aria-label="Agentia logo" />
        <div>
          <div className="name">Agentia</div>
          <div className="tag">CRM · v1.0</div>
        </div>
      </div>

      <div className="nav-section-label">Trabajo</div>
      {nav.map(n => (
        <div key={n.key} className={`nav-item ${page === n.key ? 'active' : ''}`} onClick={() => setPage(n.key)}>
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
               onClick={() => !disabled && setPage(n.key)}>
            <n.icon />
            <span>{n.label}</span>
            {disabled && <I.Lock size={13} style={{ marginLeft: 'auto', color: 'var(--text-4)' }} />}
          </div>
        )
      })}

      <div className="sidebar-footer">
        <div className="avatar">{role === 'admin' ? 'LP' : 'AR'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{role === 'admin' ? 'Lucía P.' : 'Andrés R.'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {role === 'admin' ? 'Admin · Agentia' : 'Empleado · Agentia'}
          </div>
        </div>
        <I.MoreH size={16} />
      </div>
    </aside>
  )
}

export function Topbar({ crumb, setDrawerOpen, role, setRole }) {
  return (
    <header className="topbar">
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

      <button className="icon-btn" title="Notificaciones">
        <I.Bell size={16} />
        <span className="dot" />
      </button>
      <button className="btn primary" onClick={() => setDrawerOpen(true)}>
        <I.Plus size={14} /> Nuevo lead
      </button>
    </header>
  )
}
