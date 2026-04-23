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

  // Load from Supabase — falls back to mock data if not configured
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
      } catch (_) {
        // Supabase not configured — running on mock data
      }
    }
    load()
  }, [])

  // Mutations
  const addLead = async (lead) => {
    try {
      const { data, error } = await supabase.from('leads').insert([lead]).select().single()
      if (!error && data) { setLeads(prev => [data, ...prev]); return }
    } catch (_) {}
    // Offline fallback
    setLeads(prev => [{ ...lead, id: `l${Date.now()}` }, ...prev])
  }

  const updateTask = async (id, updates) => {
    try {
      const { error } = await supabase.from('tareas').update(updates).eq('id', id)
      if (!error) { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); return }
    } catch (_) {}
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const counts = {
    leads:     leads.filter(l => !['Ganado','Perdido'].includes(l.estado)).length,
    clientes:  clientes.length,
    tareas:    tasks.filter(t => !t.done).length,
    proyectos: proyectos.filter(p => p.estado !== 'Cerrado').length,
  }

  const data = { leads, clientes, tasks, proyectos, gastos, updateTask }

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
