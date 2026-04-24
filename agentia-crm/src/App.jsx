import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sidebar, Topbar, SearchModal, BellPanel } from './components/Shell'
import { QuickLeadDrawer } from './components/Drawer'
import Dashboard from './components/Dashboard'
import { Clientes, Pipeline } from './components/LeadsClientesPipeline'
import { Tareas, Proyectos } from './components/TareasProyectos'
import { Finanzas, Ajustes } from './components/FinanzasAjustes'
import { supabase } from './lib/supabase'
import { STAGE, STAGES_CLOSED } from './components/data'

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
  const [bellOpen, setBellOpen] = useState(false)
  const [openItem, setOpenItem] = useState(null)
  const [hue, setHue]     = useState(225)

  const [leads,     setLeads]     = useState([])
  const [clientes,  setClientes]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [proyectos, setProyectos] = useState([])
  const [gastos,    setGastos]    = useState([])
  const [cobros,    setCobros]    = useState([])

  // Refs para siempre tener el valor actual en callbacks sin stale closures
  const clientesRef  = useRef(clientes)
  const cobrosRef    = useRef(cobros)
  const tasksRef     = useRef(tasks)
  const proyectosRef = useRef(proyectos)
  useEffect(() => { clientesRef.current  = clientes  }, [clientes])
  useEffect(() => { cobrosRef.current    = cobros    }, [cobros])
  useEffect(() => { tasksRef.current     = tasks     }, [tasks])
  useEffect(() => { proyectosRef.current = proyectos }, [proyectos])

  // Toast notifications
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((msg, type = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

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
          const toMigrate = l.data.filter(lead => stateMap[lead.estado])
          if (toMigrate.length > 0) {
            await Promise.all(toMigrate.map(lead =>
              supabase.from('leads').update({ estado: stateMap[lead.estado] }).eq('id', lead.id)
            ))
          }
          setLeads(l.data.map(lead => {
            const newEstado = stateMap[lead.estado]
            return newEstado ? { ...lead, estado: newEstado } : lead
          }))
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
    const { crearProyecto, origenCustom, yaCobrado: _y, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto, ...leadData } = lead
    try {
      const { data: d, error } = await supabase.from('leads').insert([clean(leadData)]).select().single()
      if (!error && d) {
        setLeads(prev => [d, ...prev])
        autoWinLead({ ...d, crearProyecto, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto })
        showToast(`Lead «${leadData.empresa}» creado`)
        return
      }
      if (error) {
        console.error('[Supabase] addLead error:', error.message, error.details)
        showToast(`Error Supabase: ${error.message}`, 'error')
      }
    } catch (e) {
      console.error('[Supabase] addLead excepción:', e)
    }
    const local = { ...leadData, id: `l${Date.now()}` }
    setLeads(prev => [local, ...prev])
    autoWinLead({ ...local, crearProyecto, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto })
    showToast(`Lead «${leadData.empresa}» creado (guardado local — revisar Supabase)`, 'error')
  }

  const autoWinLead = (lead) => {
    if (lead.estado !== STAGE.COBRADO) return
    const monto          = parseFloat(lead.monto) || 0
    const tipo           = lead.tipo || 'Proyecto'
    const montoRec       = parseFloat(lead.montoRecurrente) || 0
    const frecuencia     = lead.frecuencia || 'Mensual'
    const esRecurrente   = tipo === 'Recurrente'
    const dividido       = !esRecurrente && lead.pagoDividido
    const señalPct       = lead.señalPct || 50
    const servicio       = lead.servicio || 'Servicio'
    const señalCobrada   = parseFloat(lead.señal_cobrada) || 0
    const tieneSeñal     = señalCobrada > 0 && !esRecurrente

    const yaExiste = clientesRef.current.some(c => c.nombre === lead.empresa)
    if (!yaExiste) {
      const mes = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      addCliente({
        nombre: lead.empresa, servicio,
        importe: esRecurrente ? montoRec : monto,
        estado: esRecurrente ? 'Recurrente' : (tieneSeñal || dividido ? 'En curso' : 'Pagado · ajustes'),
        tipo,
        ajustes: 0, responsable: lead.responsable || '', since: mes,
      })
    }

    if (tieneSeñal) {
      const restoMonto = monto - señalCobrada
      if (restoMonto > 0) {
        const venceResto = lead.vence_resto || (() => {
          const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0,10)
        })()
        addCobro({
          cliente: lead.empresa, concepto: `Resto · ${servicio}`,
          monto: restoMonto, vence: venceResto,
          pagado: false, vencida: false, recurrente: false,
        })
        addTask({
          title: `Cobrar resto · ${lead.empresa}`,
          cliente: lead.empresa,
          when_group: 'semana',
          due_date: venceResto,
          prio: 'alta',
          resp: lead.responsable || '',
          done: false,
          tag: 'Finanzas',
        })
      }
    } else if (dividido && monto > 0) {
      const señalMonto = Math.round(monto * señalPct / 100)
      const restoMonto = monto - señalMonto
      addCobro({ cliente: lead.empresa, concepto: `Señal (${señalPct}%) · ${servicio}`, monto: señalMonto, vence: null, pagado: true, vencida: false, recurrente: false })
      addCobro({ cliente: lead.empresa, concepto: `Resto (${100 - señalPct}%) · ${servicio}`, monto: restoMonto, vence: null, pagado: false, vencida: false, recurrente: false })
    } else if (!esRecurrente && monto > 0) {
      addCobro({ cliente: lead.empresa, concepto: servicio, monto, vence: null, pagado: true, vencida: false, recurrente: false })
    }

    if (esRecurrente && montoRec > 0) {
      const next = new Date()
      if (frecuencia === 'Semanal') next.setDate(next.getDate() + 7)
      else if (frecuencia === 'Trimestral') next.setMonth(next.getMonth() + 3)
      else next.setMonth(next.getMonth() + 1)
      addCobro({
        cliente: lead.empresa,
        concepto: `Mantenimiento ${frecuencia.toLowerCase()} · ${servicio}`,
        monto: montoRec, vence: next.toISOString().slice(0,10),
        pagado: false, vencida: false, recurrente: true, frecuencia,
      })
    }
    if (lead.crearProyecto) {
      addProyecto({ cliente: lead.empresa, servicio, estado: 'En curso', progreso: 0, ajustes: 0, pago: tieneSeñal || dividido ? 'Señal cobrada' : 'Pagado', resp: lead.responsable || '' })
    }
  }

  const findCobroAuto = (lead) => {
    const monto    = parseFloat(lead.monto) || 0
    const servicio = lead.servicio || ''
    const list     = cobrosRef.current
    // Primary: match by concepto exacto + monto (cobros creados por autoWinLead)
    const byConcepto = list.find(c =>
      c.cliente === lead.empresa && c.concepto === servicio && c.monto === monto && !c.recurrente
    )
    if (byConcepto) return byConcepto
    // Fallback: monto + cliente (compatibilidad con cobros antiguos)
    return list.find(c => c.cliente === lead.empresa && c.monto === monto && !c.recurrente)
  }

  const updateLead = async (id, updates) => {
    const lead = leads.find(l => l.id === id)
    const { crearProyecto, origenCustom, yaCobrado: _y, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto, ...safeUpdates } = updates
    try {
      await supabase.from('leads').update(clean(safeUpdates)).eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...safeUpdates } : l))

    // Cascade: si cambia el nombre de empresa, actualizar cobros, tareas, proyectos y clientes
    if (safeUpdates.empresa && lead?.empresa && safeUpdates.empresa !== lead.empresa) {
      const oldName = lead.empresa
      const newName = safeUpdates.empresa
      cobrosRef.current.filter(c => c.cliente === oldName).forEach(c => updateCobro(c.id, { cliente: newName }))
      tasksRef.current.filter(t => t.cliente === oldName).forEach(t => updateTask(t.id, { cliente: newName }))
      proyectosRef.current.filter(p => p.cliente === oldName).forEach(p => updateProyecto(p.id, { cliente: newName }))
      clientesRef.current.filter(c => c.nombre === oldName).forEach(c => updateCliente(c.id, { nombre: newName }))
    }

    const nuevoEstado  = safeUpdates.estado
    const eraCobrado   = lead?.estado === STAGE.COBRADO
    const eraSeñal     = lead?.estado === STAGE.SEÑAL
    const seraCobrado  = nuevoEstado === STAGE.COBRADO
    const seraDenegado = nuevoEstado === STAGE.DENEGADO

    if (seraCobrado && !eraCobrado) {
      autoWinLead({ ...lead, ...safeUpdates, crearProyecto, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto })
    } else if (eraCobrado && nuevoEstado && !seraCobrado) {
      // Deja de ser Cobrado → eliminar cobro automático
      const c = findCobroAuto(lead)
      if (c) deleteCobro(c.id)
    } else if (eraCobrado && !nuevoEstado && updates.monto !== undefined) {
      // Sigue Cobrado pero cambia el importe → actualizar cobro
      const c = findCobroAuto(lead)
      if (c) updateCobro(c.id, { monto: parseFloat(updates.monto) || 0 })
    }

    // Señal pagada → atrás: borrar cobro de señal + cobro del resto + cliente auto-creado
    if (eraSeñal && nuevoEstado && !seraCobrado && !seraDenegado) {
      const señalVal = parseFloat(lead.señal_cobrada) || 0
      // Borrar cobro de la señal
      if (señalVal > 0) {
        const señalCobro = cobrosRef.current.find(c =>
          c.cliente === lead.empresa &&
          (c.concepto || '').startsWith('Señal ·') &&
          c.monto === señalVal
        )
        if (señalCobro) deleteCobro(señalCobro.id)
      }
      // Borrar cobro del resto (pendiente creado al confirmar señal)
      const restoCobro = cobrosRef.current.find(c =>
        c.cliente === lead.empresa &&
        (c.concepto || '').startsWith('Resto ·') &&
        !c.pagado
      )
      if (restoCobro) deleteCobro(restoCobro.id)
      // Borrar cliente auto-creado (si existe con ese nombre)
      const clienteAuto = clientesRef.current.find(c => c.nombre === lead.empresa)
      if (clienteAuto) deleteCliente(clienteAuto.id)
    }
    // Señal pagada → Denegado: mantener cobro señal + crear tarea de revisión
    if (eraSeñal && seraDenegado) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      addTask({
        title: `Revisar devolución señal · ${lead.empresa}`,
        cliente: lead.empresa,
        when_group: 'mañana',
        due_date: tomorrow.toISOString().slice(0,10),
        prio: 'alta',
        resp: lead.responsable || '',
        done: false,
        tag: 'Finanzas',
      })
    }
  }

  const deleteLead = async (id) => {
    const lead = leads.find(l => l.id === id)
    try {
      await supabase.from('leads').delete().eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.filter(l => l.id !== id))

    // Leads cerrados: solo eliminar la fila. Cobros y clientes se preservan.
    if (STAGES_CLOSED.includes(lead?.estado)) return

    // Leads activos: limpiar cobro automático si lo había
    const c = findCobroAuto(lead)
    if (c) deleteCobro(c.id)
    // Cascade tareas/proyectos si no hay cliente activo con ese nombre
    if (lead && !clientesRef.current.some(c => c.nombre === lead.empresa)) {
      tasksRef.current.filter(t => t.cliente === lead.empresa).forEach(t => deleteTask(t.id))
      proyectosRef.current.filter(p => p.cliente === lead.empresa).forEach(p => deleteProyecto(p.id))
    }
  }

  // ── CLIENTES ───────────────────────────────────────────────
  const addCliente = async (cliente) => {
    try {
      const { data: d, error } = await supabase.from('clientes').insert([clean(cliente)]).select().single()
      if (!error && d) { setClientes(prev => [d, ...prev]); showToast(`Cliente «${cliente.nombre}» creado`); return }
    } catch (_) {}
    setClientes(prev => [{ ...cliente, id: `c${Date.now()}` }, ...prev])
    showToast(`Cliente «${cliente.nombre}» creado`)
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
      if (!error && d) { setTasks(prev => [d, ...prev]); showToast('Tarea creada'); return }
    } catch (_) {}
    setTasks(prev => [{ ...tarea, id: `t${Date.now()}`, done: false }, ...prev])
    showToast('Tarea creada')
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
    // Si ajustes baja a 0 y el proyecto estaba en revisión por ajustes, avanzar estado
    const proyecto = proyectosRef.current.find(p => p.id === id)
    let extra = {}
    if (updates.ajustes === 0 && proyecto?.ajustes > 0 && proyecto?.estado === 'Pagado · ajustes') {
      extra = { estado: 'Cerrado', progreso: 100 }
    }
    const merged = { ...updates, ...extra }
    try {
      const { error } = await supabase.from('proyectos').update(clean(merged)).eq('id', id)
      if (!error) { setProyectos(prev => prev.map(p => p.id === id ? { ...p, ...merged } : p)); return }
    } catch (_) {}
    setProyectos(prev => prev.map(p => p.id === id ? { ...p, ...merged } : p))
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
    const cobro = cobrosRef.current.find(c => c.id === id)
    try {
      const { error } = await supabase.from('cobros').update(clean(updates)).eq('id', id)
      if (!error) { setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); }
    } catch (_) {
      setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    }
    // Auto-update proyecto: si todos los cobros del cliente quedan pagados, marcar progreso 100%
    if (updates.pagado === true && cobro && !cobro.pagado) {
      const allCobros = cobrosRef.current
      const clienteCobros = allCobros.filter(c => c.cliente === cobro.cliente && c.id !== id)
      const todoPagado = clienteCobros.every(c => c.pagado)
      if (todoPagado) {
        const proyecto = proyectosRef.current.find(p => p.cliente === cobro.cliente && p.estado !== 'Cerrado')
        if (proyecto) updateProyecto(proyecto.id, { progreso: 100, pago: 'Pagado' })
      }
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
    leads:     leads.filter(l => !STAGES_CLOSED.includes(l.estado)).length,
    clientes:  clientes.length,
    tareas:    tasks.filter(t => !t.done).length,
    proyectos: proyectos.filter(p => p.estado !== 'Cerrado').length,
  }

  const _today = new Date(); _today.setHours(0,0,0,0)
  const notifCount =
    tasks.filter(t => {
      if (t.done) return false
      if (t.due_date) return new Date(t.due_date + 'T00:00:00') < _today
      return t.when_group === 'vencida'
    }).length +
    cobros.filter(c => !c.pagado && (c.vencida || (c.vence && new Date(c.vence + 'T00:00:00') < _today))).length

  const data = {
    leads, clientes, tasks, proyectos, gastos, cobros,
    addLead, updateLead, deleteLead,
    addCliente, updateCliente, deleteCliente,
    addTask, updateTask, deleteTask,
    addProyecto, updateProyecto, deleteProyecto,
    addGasto, updateGasto, deleteGasto,
    addCobro, updateCobro, deleteCobro,
    showToast,
  }

  const clearOpenItem = () => setOpenItem(null)

  const pageEl = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard role={role} setPage={setPage} openQuick={() => setDrawer(true)} data={data} />
      case 'pipeline':  return <Pipeline data={data} openQuick={() => setDrawer(true)} openItem={openItem} onItemOpened={clearOpenItem} />
      case 'clientes':  return <Clientes data={data} openItem={openItem} onItemOpened={clearOpenItem} />
      case 'tareas':    return <Tareas data={data} openItem={openItem} onItemOpened={clearOpenItem} />
      case 'proyectos': return <Proyectos data={data} />
      case 'finanzas':  return <Finanzas role={role} data={data} />
      case 'ajustes':   return <Ajustes role={role} data={data} />
      default:          return null
    }
  })()

  return (
    <>
      <div className="app" data-screen-label={PAGES.find(p => p[0] === page)?.[1]}>
        <Sidebar page={page} setPage={setPage} role={role} counts={counts} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="content">
          <Topbar crumb={crumbMap[page]} setDrawerOpen={setDrawer} role={role} setRole={setRole} onMenuClick={() => setSidebarOpen(o => !o)} notifCount={notifCount} onSearchOpen={() => setSearchOpen(true)} onBellOpen={() => setBellOpen(o => !o)} />
          <main className="main">{pageEl}</main>
        </div>
      </div>

      <QuickLeadDrawer open={drawer} onClose={() => setDrawer(false)} onSave={addLead} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} data={data} setPage={setPage}
        onSelect={r => { setPage(r.page); setOpenItem(r); setSearchOpen(false) }} />
      <BellPanel open={bellOpen} onClose={() => setBellOpen(false)} tasks={tasks} cobros={cobros} />

      {/* Toast notifications */}
      <div style={{position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:8, zIndex:9999, pointerEvents:'none'}}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? 'rgba(255,90,106,0.15)' : 'rgba(15,28,50,0.97)',
            border: `1px solid ${t.type === 'error' ? 'rgba(255,90,106,0.4)' : 'rgba(62,207,142,0.35)'}`,
            color: t.type === 'error' ? '#FF8FA0' : 'var(--text-1)',
            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'toastIn 0.2s ease',
          }}>
            <span style={{color: t.type === 'error' ? '#FF5A6A' : '#3ECF8E', fontSize:15}}>{t.type === 'error' ? '✕' : '✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}
