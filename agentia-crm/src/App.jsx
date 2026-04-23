import React, { useState, useEffect } from 'react'
import { Sidebar, Topbar } from './components/Shell'
import { QuickLeadDrawer } from './components/Drawer'
import Dashboard from './components/Dashboard'
import { Leads, Clientes, Pipeline } from './components/LeadsClientesPipeline'
import { Tareas, Proyectos } from './components/TareasProyectos'
import { Finanzas, Ajustes } from './components/FinanzasAjustes'
import { supabase } from './lib/supabase'

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

  const [leads,     setLeads]     = useState([])
  const [clientes,  setClientes]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [proyectos, setProyectos] = useState([])
  const [gastos,    setGastos]    = useState([])
  const [cobros,    setCobros]    = useState([])

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
        const [l, c, t, p, g, co] = await Promise.all([
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
          supabase.from('clientes').select('*').order('created_at', { ascending: false }),
          supabase.from('tareas').select('*').order('created_at', { ascending: false }),
          supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
          supabase.from('gastos').select('*').order('created_at', { ascending: false }),
          supabase.from('cobros').select('*').order('created_at', { ascending: false }),
        ])
        if (!l.error && l.data)  setLeads(l.data)
        if (!c.error && c.data)  setClientes(c.data)
        if (!t.error && t.data)  setTasks(t.data)
        if (!p.error && p.data)  setProyectos(p.data)
        if (!g.error && g.data)  setGastos(g.data)
        if (!co.error && co.data) setCobros(co.data)
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
    const lead = leads.find(l => l.id === id)
    try {
      await supabase.from('leads').update(updates).eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))

    // Lead ganado → crear cliente automáticamente si no existe
    if (updates.estado === 'Ganado' && lead) {
      const yaExiste = clientes.some(c => c.nombre === lead.empresa)
      if (!yaExiste) {
        const mes = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
        addCliente({
          nombre: lead.empresa, servicio: lead.servicio || '',
          importe: lead.monto || 0, estado: 'En curso',
          pagado: false, ajustes: 0, responsable: lead.responsable || '', since: mes,
        })
      }
    }
  }

  const deleteLead = async (id) => {
    const lead = leads.find(l => l.id === id)
    try {
      await supabase.from('leads').delete().eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.filter(l => l.id !== id))

    // Cascade: borrar tareas y proyectos del lead solo si no hay cliente activo con ese nombre
    if (lead && !clientes.some(c => c.nombre === lead.empresa)) {
      tasks.filter(t => t.cliente === lead.empresa).forEach(t => deleteTask(t.id))
      proyectos.filter(p => p.cliente === lead.empresa).forEach(p => deleteProyecto(p.id))
    }
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
    const cliente = clientes.find(c => c.id === id)
    try {
      await supabase.from('clientes').delete().eq('id', id)
    } catch (_) {}
    setClientes(prev => prev.filter(c => c.id !== id))

    // Cascade: borrar tareas, proyectos y cobros de este cliente
    if (cliente) {
      tasks.filter(t => t.cliente === cliente.nombre).forEach(t => deleteTask(t.id))
      proyectos.filter(p => p.cliente === cliente.nombre).forEach(p => deleteProyecto(p.id))
      cobros.filter(c => c.cliente === cliente.nombre).forEach(c => deleteCobro(c.id))
    }
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

  // ── COBROS ─────────────────────────────────────────────────
  const addCobro = async (cobro) => {
    try {
      const { data: d, error } = await supabase.from('cobros').insert([cobro]).select().single()
      if (!error && d) { setCobros(prev => [d, ...prev]); return }
    } catch (_) {}
    setCobros(prev => [{ ...cobro, id: `cb${Date.now()}` }, ...prev])
  }

  const updateCobro = async (id, updates) => {
    try {
      const { error } = await supabase.from('cobros').update(updates).eq('id', id)
      if (!error) { setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); return }
    } catch (_) {}
    setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const deleteCobro = async (id) => {
    try {
      const { error } = await supabase.from('cobros').delete().eq('id', id)
      if (!error) { setCobros(prev => prev.filter(c => c.id !== id)); return }
    } catch (_) {}
    setCobros(prev => prev.filter(c => c.id !== id))
  }

  // ──────────────────────────────────────────────────────────
  const counts = {
    leads:     leads.filter(l => !['Ganado','Perdido'].includes(l.estado)).length,
    clientes:  clientes.length,
    tareas:    tasks.filter(t => !t.done).length,
    proyectos: proyectos.filter(p => p.estado !== 'Cerrado').length,
  }

  const data = {
    leads, clientes, tasks, proyectos, gastos, cobros,
    addLead, updateLead, deleteLead,
    addCliente, updateCliente, deleteCliente,
    addTask, updateTask, deleteTask,
    addProyecto, updateProyecto, deleteProyecto,
    addGasto, deleteGasto,
    addCobro, updateCobro, deleteCobro,
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
