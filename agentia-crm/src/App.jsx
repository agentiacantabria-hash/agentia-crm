import React, { useState, useEffect } from 'react'
import { Sidebar, Topbar } from './components/Shell'
import { QuickLeadDrawer } from './components/Drawer'
import Dashboard from './components/Dashboard'
import { Leads, Clientes, Pipeline } from './components/LeadsClientesPipeline'
import { Tareas, Proyectos } from './components/TareasProyectos'
import { Finanzas, Ajustes } from './components/FinanzasAjustes'
import { supabase } from './lib/supabase'
import {
  LEADS as MOCK_LEADS,
  CLIENTES as MOCK_CLIENTES,
  TASKS as MOCK_TASKS,
  PROYECTOS as MOCK_PROYECTOS,
  GASTOS as MOCK_GASTOS,
} from './components/data'

const PAGES = [
  ['dashboard','Inicio'],
  ['leads','Leads'],
  ['clientes','Clientes'],
  ['pipeline','Pipeline'],
  ['tareas','Tareas'],
  ['proyectos','Proyectos'],
  ['finanzas','Finanzas'],
  ['ajustes','Ajustes'],
]

const crumbMap = {
  dashboard: ['Agentia','Inicio'],
  leads:     ['Agentia','Comercial','Leads'],
  clientes:  ['Agentia','Comercial','Clientes'],
  pipeline:  ['Agentia','Comercial','Pipeline'],
  tareas:    ['Agentia','Operativo','Tareas'],
  proyectos: ['Agentia','Entrega','Proyectos'],
  finanzas:  ['Agentia','Administración','Finanzas'],
  ajustes:   ['Agentia','Administración','Ajustes'],
}

export default function App() {
  const [page, setPage]   = useState(() => localStorage.getItem('agentia_page') || 'dashboard')
  const [role, setRole]   = useState(() => localStorage.getItem('agentia_role') || 'admin')
  const [drawer, setDrawer] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hue, setHue]     = useState(225)

  const [leads,     setLeads]     = useState(MOCK_LEADS)
  const [clientes,  setClientes]  = useState(MOCK_CLIENTES)
  const [tasks,     setTasks]     = useState(MOCK_TASKS)
  const [proyectos, setProyectos] = useState(MOCK_PROYECTOS)
  const [gastos,    setGastos]    = useState(MOCK_GASTOS)

  useEffect(() => { localStorage.setItem('agentia_page', page) }, [page])
  useEffect(() => { localStorage.setItem('agentia_role', role) }, [role])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--brand',      `oklch(0.58 0.18 ${hue})`)
    root.setProperty('--brand-2',    `oklch(0.68 0.16 ${hue})`)
    root.setProperty('--brand-3',    `oklch(0.78 0.13 ${hue})`)
    root.setProperty('--brand-deep', `oklch(0.48 0.20 ${hue})`)
    root.setProperty('--brand-glow', `oklch(0.58 0.18 ${hue} / 0.35)`)
  }, [hue])

  useEffect(() => {
    async function load() {
      try {
        const [l, c, t, p, g] = await Promise.all([
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
          supabase.from('clientes').select('*').order('created_at', { ascending: false }),
          supabase.from('tareas').select('*').order('created_at', { ascending: false }),
          supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
          supabase.from('gastos').select('*').order('created_at', { ascending: false }),
        ])
        if (!l.error && l.data?.length)  setLeads(l.data)
        if (!c.error && c.data?.length)  setClientes(c.data)
        if (!t.error && t.data?.length)  setTasks(t.data)
        if (!p.error && p.data?.length)  setProyectos(p.data)
        if (!g.error && g.data?.length)  setGastos(g.data)
      } catch (_) {}
    }
    load()
  }, [])

  // ── LEADS ──────────────────────────────────────────────────
  const addLead = async (lead) => {
    try {
      const { data: d, error } = await supabase.from('leads').insert([lead]).select().single()
      if (!error && d) { setLeads(prev => [d, ...prev]); return }
    } catch (_) {}
    setLeads(prev => [{ ...lead, id: `l${Date.now()}` }, ...prev])
  }

  const updateLead = async (id, updates) => {
    try {
      const { error } = await supabase.from('leads').update(updates).eq('id', id)
      if (!error) { setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l)); return }
    } catch (_) {}
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  const deleteLead = async (id) => {
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (!error) { setLeads(prev => prev.filter(l => l.id !== id)); return }
    } catch (_) {}
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  // ── CLIENTES ───────────────────────────────────────────────
  const addCliente = async (cliente) => {
    try {
      const { data: d, error } = await supabase.from('clientes').insert([cliente]).select().single()
      if (!error && d) { setClientes(prev => [d, ...prev]); return }
    } catch (_) {}
    setClientes(prev => [{ ...cliente, id: `c${Date.now()}` }, ...prev])
  }

  const updateCliente = async (id, updates) => {
    try {
      const { error } = await supabase.from('clientes').update(updates).eq('id', id)
      if (!error) { setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); return }
    } catch (_) {}
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const deleteCliente = async (id) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (!error) { setClientes(prev => prev.filter(c => c.id !== id)); return }
    } catch (_) {}
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  // ── TAREAS ─────────────────────────────────────────────────
  const addTask = async (tarea) => {
    try {
      const { data: d, error } = await supabase.from('tareas').insert([tarea]).select().single()
      if (!error && d) { setTasks(prev => [d, ...prev]); return }
    } catch (_) {}
    setTasks(prev => [{ ...tarea, id: `t${Date.now()}`, done: false }, ...prev])
  }

  const updateTask = async (id, updates) => {
    try {
      const { error } = await supabase.from('tareas').update(updates).eq('id', id)
      if (!error) { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); return }
    } catch (_) {}
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase.from('tareas').delete().eq('id', id)
      if (!error) { setTasks(prev => prev.filter(t => t.id !== id)); return }
    } catch (_) {}
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  // ── PROYECTOS ──────────────────────────────────────────────
  const addProyecto = async (proyecto) => {
    try {
      const { data: d, error } = await supabase.from('proyectos').insert([proyecto]).select().single()
      if (!error && d) { setProyectos(prev => [d, ...prev]); return }
    } catch (_) {}
    setProyectos(prev => [{ ...proyecto, id: `p${Date.now()}` }, ...prev])
  }

  const updateProyecto = async (id, updates) => {
    try {
      const { error } = await supabase.from('proyectos').update(updates).eq('id', id)
      if (!error) { setProyectos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p)); return }
    } catch (_) {}
    setProyectos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const deleteProyecto = async (id) => {
    try {
      const { error } = await supabase.from('proyectos').delete().eq('id', id)
      if (!error) { setProyectos(prev => prev.filter(p => p.id !== id)); return }
    } catch (_) {}
    setProyectos(prev => prev.filter(p => p.id !== id))
  }

  // ── GASTOS ─────────────────────────────────────────────────
  const addGasto = async (gasto) => {
    try {
      const { data: d, error } = await supabase.from('gastos').insert([gasto]).select().single()
      if (!error && d) { setGastos(prev => [d, ...prev]); return }
    } catch (_) {}
    setGastos(prev => [{ ...gasto, id: `g${Date.now()}` }, ...prev])
  }

  const deleteGasto = async (id) => {
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id)
      if (!error) { setGastos(prev => prev.filter(g => g.id !== id)); return }
    } catch (_) {}
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  // ──────────────────────────────────────────────────────────
  const counts = {
    leads:     leads.filter(l => !['Ganado','Perdido'].includes(l.estado)).length,
    clientes:  clientes.length,
    tareas:    tasks.filter(t => !t.done).length,
    proyectos: proyectos.filter(p => p.estado !== 'Cerrado').length,
  }

  const data = {
    leads, clientes, tasks, proyectos, gastos,
    addLead, updateLead, deleteLead,
    addCliente, updateCliente, deleteCliente,
    addTask, updateTask, deleteTask,
    addProyecto, updateProyecto, deleteProyecto,
    addGasto, deleteGasto,
  }

  const pageEl = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard role={role} setPage={setPage} openQuick={() => setDrawer(true)} data={data} />
      case 'leads':     return <Leads data={data} openQuick={() => setDrawer(true)} />
      case 'clientes':  return <Clientes data={data} />
      case 'pipeline':  return <Pipeline data={data} />
      case 'tareas':    return <Tareas data={data} />
      case 'proyectos': return <Proyectos data={data} />
      case 'finanzas':  return <Finanzas role={role} data={data} />
      case 'ajustes':   return <Ajustes role={role} />
      default:          return null
    }
  })()

  return (
    <>
      <div className="app" data-screen-label={PAGES.find(p => p[0] === page)?.[1]}>
        <Sidebar page={page} setPage={setPage} role={role} counts={counts} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="content">
          <Topbar crumb={crumbMap[page]} setDrawerOpen={setDrawer} role={role} setRole={setRole} onMenuClick={() => setSidebarOpen(o => !o)} />
          <main className="main">{pageEl}</main>
        </div>
      </div>

      <QuickLeadDrawer open={drawer} onClose={() => setDrawer(false)} onSave={addLead} />
    </>
  )
}
