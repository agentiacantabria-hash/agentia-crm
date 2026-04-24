import React, { useState, useEffect } from 'react'
import { Sidebar, Topbar, SearchModal } from './components/Shell'
import { QuickLeadDrawer } from './components/Drawer'
import Dashboard from './components/Dashboard'
import { Clientes, Pipeline } from './components/LeadsClientesPipeline'
import { Tareas, Proyectos } from './components/TareasProyectos'
import { Finanzas, Ajustes } from './components/FinanzasAjustes'
import { supabase } from './lib/supabase'

const PAGES = [
  ['dashboard','Inicio'],
  ['pipeline','Pipeline'],
  ['clientes','Clientes'],
  ['tareas','Tareas'],
  ['proyectos','Proyectos'],
  ['finanzas','Finanzas'],
  ['ajustes','Ajustes'],
]

const crumbMap = {
  dashboard: ['Agentia','Inicio'],
  pipeline:  ['Agentia','Comercial','Pipeline'],
  clientes:  ['Agentia','Comercial','Clientes'],
  tareas:    ['Agentia','Operativo','Tareas'],
  proyectos: ['Agentia','Entrega','Proyectos'],
  finanzas:  ['Agentia','Administración','Finanzas'],
  ajustes:   ['Agentia','Administración','Ajustes'],
}

export default function App() {
  const [page, setPage]   = useState(() => { const p = localStorage.getItem('agentia_page') || 'dashboard'; return p === 'leads' ? 'pipeline' : p })
  const [role, setRole]   = useState(() => localStorage.getItem('agentia_role') || 'admin')
  const [drawer, setDrawer] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
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
        if (!l.error && l.data) {
          const stateMap = {
            'Ganado': 'Cobrado', 'Perdido': 'Denegado',
            'Nuevo': 'Cliente Nuevo', 'Contactado': 'Cliente Potencial',
            'Interesado': 'Cliente Interesado',
            'Propuesta enviada': 'En Revisión', 'En seguimiento': 'En Revisión',
          }
          const migrated = l.data.map(lead => {
            const newEstado = stateMap[lead.estado]
            if (newEstado) supabase.from('leads').update({ estado: newEstado }).eq('id', lead.id)
            return newEstado ? { ...lead, estado: newEstado } : lead
          })
          setLeads(migrated)
        }
        if (!c.error && c.data)  setClientes(c.data)
        if (!t.error && t.data)  setTasks(t.data)
        if (!p.error && p.data)  setProyectos(p.data)
        if (!g.error && g.data)  setGastos(g.data)
        if (!co.error && co.data) {
          const today = new Date(); today.setHours(0,0,0,0)
          setCobros(co.data.map(c => {
            if (c.pagado || !c.vence) return c
            const venceDate = new Date(c.vence); venceDate.setHours(0,0,0,0)
            return { ...c, vencida: venceDate < today }
          }))
        }
      } catch (e) { console.error('[Supabase] excepción al cargar:', e) }
    }
    load()
  }, [])

  // Convierte strings vacíos a null para campos de tipo date en Supabase
  const clean = (obj) => Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
  )

  // ── LEADS ──────────────────────────────────────────────────
  const addLead = async (lead) => {
    const { crearProyecto, origenCustom, yaCobrado: _y, tipo, montoRecurrente, frecuencia, ...leadData } = lead
    try {
      const { data: d, error } = await supabase.from('leads').insert([clean(leadData)]).select().single()
      if (!error && d) {
        setLeads(prev => [d, ...prev])
        autoWinLead({ ...d, crearProyecto, tipo, montoRecurrente, frecuencia })
        return
      }
    } catch (_) {}
    const local = { ...leadData, id: `l${Date.now()}` }
    setLeads(prev => [local, ...prev])
    autoWinLead({ ...local, crearProyecto, tipo, montoRecurrente, frecuencia })
  }

  const autoWinLead = (lead) => {
    if (lead.estado !== 'Cobrado') return
    const monto          = parseFloat(lead.monto) || 0
    const tipo           = lead.tipo || 'Proyecto'
    const montoRec       = parseFloat(lead.montoRecurrente) || 0
    const frecuencia     = lead.frecuencia || 'Mensual'
    const esRecurrente   = tipo === 'Recurrente'

    const yaExiste = clientes.some(c => c.nombre === lead.empresa)
    if (!yaExiste) {
      const mes = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      addCliente({
        nombre: lead.empresa, servicio: lead.servicio || '',
        importe: esRecurrente ? montoRec : monto,
        estado: esRecurrente ? 'Recurrente' : 'Pagado · ajustes',
        tipo,
        ajustes: 0, responsable: lead.responsable || '', since: mes,
      })
    }
    // Cobro inicial (pago único, siempre pagado)
    if (monto > 0) {
      addCobro({ cliente: lead.empresa, concepto: lead.servicio || 'Servicio', monto, vence: null, pagado: true, vencida: false, recurrente: false })
    }
    // Primer cobro recurrente (siguiente período, pendiente)
    if (esRecurrente && montoRec > 0) {
      const next = new Date()
      if (frecuencia === 'Semanal') next.setDate(next.getDate() + 7)
      else if (frecuencia === 'Trimestral') next.setMonth(next.getMonth() + 3)
      else next.setMonth(next.getMonth() + 1)
      addCobro({
        cliente: lead.empresa,
        concepto: `Mantenimiento ${frecuencia.toLowerCase()} · ${lead.servicio || 'Servicio'}`,
        monto: montoRec, vence: next.toISOString().slice(0,10),
        pagado: false, vencida: false, recurrente: true, frecuencia,
      })
    }
    if (lead.crearProyecto) {
      addProyecto({ nombre: lead.empresa, cliente: lead.empresa, estado: 'En curso', responsable: lead.responsable || '' })
    }
  }

  const findCobroAuto = (lead) => {
    const monto = parseFloat(lead.monto) || 0
    return cobros.find(c => c.cliente === lead.empresa && c.monto === monto)
  }

  const updateLead = async (id, updates) => {
    const lead = leads.find(l => l.id === id)
    const { crearProyecto, origenCustom, yaCobrado: _y, tipo, montoRecurrente, frecuencia, ...safeUpdates } = updates
    try {
      await supabase.from('leads').update(clean(safeUpdates)).eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...safeUpdates } : l))

    const nuevoEstado = safeUpdates.estado
    const eraCobrado  = lead?.estado === 'Cobrado'
    const seraCobrado = nuevoEstado === 'Cobrado'

    if (seraCobrado && !eraCobrado) {
      autoWinLead({ ...lead, ...safeUpdates, crearProyecto, tipo, montoRecurrente, frecuencia })
    } else if (eraCobrado && nuevoEstado && !seraCobrado) {
      // Deja de ser Cobrado → eliminar cobro automático
      const c = findCobroAuto(lead)
      if (c) deleteCobro(c.id)
    } else if (eraCobrado && !nuevoEstado && updates.monto !== undefined) {
      // Sigue Cobrado pero cambia el importe → actualizar cobro
      const c = findCobroAuto(lead)
      if (c) updateCobro(c.id, { monto: parseFloat(updates.monto) || 0 })
    }
  }

  const deleteLead = async (id) => {
    const lead = leads.find(l => l.id === id)
    try {
      await supabase.from('leads').delete().eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.filter(l => l.id !== id))

    // Leads cerrados: solo eliminar la fila. Cobros y clientes se preservan.
    if (['Cobrado', 'Denegado'].includes(lead?.estado)) return

    // Leads activos: limpiar cobro automático si lo había
    const c = findCobroAuto(lead)
    if (c) deleteCobro(c.id)
    // Cascade tareas/proyectos si no hay cliente activo con ese nombre
    if (lead && !clientes.some(c => c.nombre === lead.empresa)) {
      tasks.filter(t => t.cliente === lead.empresa).forEach(t => deleteTask(t.id))
      proyectos.filter(p => p.cliente === lead.empresa).forEach(p => deleteProyecto(p.id))
    }
  }

  // ── CLIENTES ───────────────────────────────────────────────
  const addCliente = async (cliente) => {
    try {
      const { data: d, error } = await supabase.from('clientes').insert([clean(cliente)]).select().single()
      if (!error && d) { setClientes(prev => [d, ...prev]); return }
    } catch (_) {}
    setClientes(prev => [{ ...cliente, id: `c${Date.now()}` }, ...prev])
  }

  const updateCliente = async (id, updates) => {
    try {
      const { error } = await supabase.from('clientes').update(clean(updates)).eq('id', id)
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
      // Solo borrar cobros NO pagados — los pagados son historial financiero
      cobros.filter(c => c.cliente === cliente.nombre && !c.pagado).forEach(c => deleteCobro(c.id))
    }
  }

  // ── TAREAS ─────────────────────────────────────────────────
  const addTask = async (tarea) => {
    try {
      const { data: d, error } = await supabase.from('tareas').insert([clean(tarea)]).select().single()
      if (!error && d) { setTasks(prev => [d, ...prev]); return }
    } catch (_) {}
    setTasks(prev => [{ ...tarea, id: `t${Date.now()}`, done: false }, ...prev])
  }

  const updateTask = async (id, updates) => {
    try {
      const { error } = await supabase.from('tareas').update(clean(updates)).eq('id', id)
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
      const { data: d, error } = await supabase.from('proyectos').insert([clean(proyecto)]).select().single()
      if (!error && d) { setProyectos(prev => [d, ...prev]); return }
    } catch (_) {}
    setProyectos(prev => [{ ...proyecto, id: `p${Date.now()}` }, ...prev])
  }

  const updateProyecto = async (id, updates) => {
    try {
      const { error } = await supabase.from('proyectos').update(clean(updates)).eq('id', id)
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
      const { data: d, error } = await supabase.from('gastos').insert([clean(gasto)]).select().single()
      if (!error && d) { setGastos(prev => [d, ...prev]); return }
    } catch (_) {}
    setGastos(prev => [{ ...gasto, id: `g${Date.now()}` }, ...prev])
  }

  const updateGasto = async (id, updates) => {
    try {
      await supabase.from('gastos').update(clean(updates)).eq('id', id)
    } catch (_) {}
    setGastos(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
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
      const { data: d, error } = await supabase.from('cobros').insert([clean(cobro)]).select().single()
      if (!error && d) {
        // Preserve our explicit pagado value — Supabase column may default to false
        setCobros(prev => [{ ...cobro, id: d.id, created_at: d.created_at }, ...prev])
        return
      }
    } catch (_) {}
    setCobros(prev => [{ ...cobro, id: `cb${Date.now()}` }, ...prev])
  }

  const updateCobro = async (id, updates) => {
    const cobro = cobros.find(c => c.id === id)
    try {
      const { error } = await supabase.from('cobros').update(clean(updates)).eq('id', id)
      if (!error) { setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); }
    } catch (_) {
      setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    }
    // Si es un cobro recurrente que acaba de pagarse, generar el siguiente período
    if (updates.pagado === true && cobro && !cobro.pagado && cobro.recurrente) {
      const base = new Date(cobro.vence || Date.now())
      const freq = cobro.frecuencia || 'Mensual'
      if (freq === 'Semanal')      base.setDate(base.getDate() + 7)
      else if (freq === 'Trimestral') base.setMonth(base.getMonth() + 3)
      else                         base.setMonth(base.getMonth() + 1)
      addCobro({
        cliente: cobro.cliente, concepto: cobro.concepto,
        monto: cobro.monto, vence: base.toISOString().slice(0,10),
        pagado: false, vencida: false, recurrente: true, frecuencia: freq,
      })
    }
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
    leads:     leads.filter(l => !['Cobrado','Denegado'].includes(l.estado)).length,
    clientes:  clientes.length,
    tareas:    tasks.filter(t => !t.done).length,
    proyectos: proyectos.filter(p => p.estado !== 'Cerrado').length,
  }

  const _today = new Date(); _today.setHours(0,0,0,0)
  const notifCount =
    tasks.filter(t => !t.done && (
      t.when_group === 'vencida' ||
      (t.due_date && new Date(t.due_date + 'T00:00:00') < _today)
    )).length +
    cobros.filter(c => !c.pagado && (c.vencida || (c.vence && new Date(c.vence) < _today))).length

  const data = {
    leads, clientes, tasks, proyectos, gastos, cobros,
    addLead, updateLead, deleteLead,
    addCliente, updateCliente, deleteCliente,
    addTask, updateTask, deleteTask,
    addProyecto, updateProyecto, deleteProyecto,
    addGasto, updateGasto, deleteGasto,
    addCobro, updateCobro, deleteCobro,
  }

  const pageEl = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard role={role} setPage={setPage} openQuick={() => setDrawer(true)} data={data} />
      case 'pipeline':  return <Pipeline data={data} openQuick={() => setDrawer(true)} />
      case 'clientes':  return <Clientes data={data} />
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
          <Topbar crumb={crumbMap[page]} setDrawerOpen={setDrawer} role={role} setRole={setRole} onMenuClick={() => setSidebarOpen(o => !o)} notifCount={notifCount} onSearchOpen={() => setSearchOpen(true)} />
          <main className="main">{pageEl}</main>
        </div>
      </div>

      <QuickLeadDrawer open={drawer} onClose={() => setDrawer(false)} onSave={addLead} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} data={data} setPage={setPage} />
    </>
  )
}
