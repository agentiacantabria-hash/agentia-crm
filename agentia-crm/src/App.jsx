import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sidebar, Topbar, SearchModal, BellPanel, ProfileModal } from './components/Shell'
import { QuickLeadDrawer } from './components/Drawer'
import Dashboard from './components/Dashboard'
import { Clientes, Pipeline } from './components/LeadsClientesPipeline'
import { Tareas, Proyectos } from './components/TareasProyectos'
import { Finanzas, Ajustes } from './components/FinanzasAjustes'
import Equipo from './components/Equipo'
import Login from './components/Login'
import { supabase } from './lib/supabase'
import { STAGE, STAGES_CLOSED } from './components/data'

const PAGES = [
  ['dashboard','Inicio'],
  ['pipeline','Pipeline'],
  ['clientes','Clientes'],
  ['tareas','Tareas'],
  ['proyectos','Proyectos'],
  ['equipo','Equipo'],
  ['finanzas','Finanzas'],
  ['ajustes','Ajustes'],
]

const crumbMap = {
  dashboard: ['Agentia','Inicio'],
  pipeline:  ['Agentia','Comercial','Pipeline'],
  clientes:  ['Agentia','Comercial','Clientes'],
  tareas:    ['Agentia','Operativo','Tareas'],
  proyectos: ['Agentia','Entrega','Proyectos'],
  equipo:    ['Agentia','Administración','Equipo'],
  finanzas:  ['Agentia','Administración','Finanzas'],
  ajustes:   ['Agentia','Administración','Ajustes'],
}

export default function App() {
  // ── Auth ───────────────────────────────────────────────────
  const [authReady,   setAuthReady]   = useState(false)  // false = still checking
  const [currentUser, setCurrentUser] = useState(null)   // CRM user profile
  const [noProfile,   setNoProfile]   = useState(false)  // logged in but not in usuarios table

  useEffect(() => {
    let mounted = true
    const loadProfile = async (authUid) => {
      const { data } = await supabase.from('usuarios').select('*').eq('auth_uid', authUid).single()
      if (!mounted) return
      if (data) { setCurrentUser(data); setNoProfile(false) }
      else       { setNoProfile(true);  setCurrentUser(null) }
      setAuthReady(true)
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) loadProfile(session.user.id)
      else setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      if (session) loadProfile(session.user.id)
      else { setCurrentUser(null); setNoProfile(false); setAuthReady(true) }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setNoProfile(false)
  }

  const role = currentUser?.rol === 'Admin' ? 'admin' : currentUser?.rol === 'Manager' ? 'manager' : 'empleado'

  const [page, setPage]   = useState(() => { const p = localStorage.getItem('agentia_page') || 'dashboard'; return p === 'leads' ? 'pipeline' : p })
  const [drawer, setDrawer] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [openItem, setOpenItem] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [hue, setHue]     = useState(225)

  const [leads,       setLeads]       = useState([])
  const [clientes,    setClientes]    = useState([])
  const [tasks,       setTasks]       = useState([])
  const [proyectos,   setProyectos]   = useState([])
  const [gastos,      setGastos]      = useState([])
  const [cobros,      setCobros]      = useState([])
  const [teamMembers,    setTeamMembers]    = useState([])
  const [actividades,    setActividades]    = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [usuarios,       setUsuarios]       = useState([])
  const [plantillas,     setPlantillas]     = useState([])

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
  // Redirigir empleados fuera de secciones admin si acceden por caché
  useEffect(() => {
    if (currentUser && role !== 'admin' && ['finanzas','ajustes'].includes(page)) setPage('dashboard')
    if (currentUser && role === 'empleado' && page === 'equipo') setPage('dashboard')
  }, [currentUser, role, page])

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--brand',      `oklch(0.58 0.18 ${hue})`)
    root.setProperty('--brand-2',    `oklch(0.68 0.16 ${hue})`)
    root.setProperty('--brand-3',    `oklch(0.78 0.13 ${hue})`)
    root.setProperty('--brand-deep', `oklch(0.48 0.20 ${hue})`)
    root.setProperty('--brand-glow', `oklch(0.58 0.18 ${hue} / 0.35)`)
  }, [hue])

  useEffect(() => {
    if (!currentUser) return
    async function load() {
      const isAdmin   = currentUser.rol === 'Admin'
      const isManager = currentUser.rol === 'Manager'
      const ini       = currentUser.iniciales
      try {
        let lQ  = supabase.from('leads').select('*').order('created_at', { ascending: false })
        let cQ  = supabase.from('clientes').select('*').order('created_at', { ascending: false })
        let tQ  = supabase.from('tareas').select('*').order('created_at', { ascending: false })
        let pQ  = supabase.from('proyectos').select('*').order('created_at', { ascending: false })
        const gQ  = isAdmin ? supabase.from('gastos').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null })
        const coQ = isAdmin ? supabase.from('cobros').select('*').order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null })
        const tmQ = (isAdmin || isManager) ? supabase.from('usuarios').select('iniciales,nombre').eq('estado','activo').order('nombre') : Promise.resolve({ data: null, error: null })

        if (!isAdmin && !isManager && ini) {
          lQ  = lQ.eq('responsable', ini)
          cQ  = cQ.eq('responsable', ini)
          tQ  = tQ.eq('resp', ini)
          pQ  = pQ.eq('resp', ini)
        }

        const [l, c, t, p, g, co, tm] = await Promise.all([lQ, cQ, tQ, pQ, gQ, coQ, tmQ])
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
        if (tm.data) {
          setTeamMembers(tm.data.map(u => u.iniciales).filter(Boolean))
          setUsuarios(tm.data.filter(u => u.iniciales))
        }
        if (!co.error && co.data) {
          const today = new Date(); today.setHours(0,0,0,0)
          setCobros(co.data.map(c => {
            if (c.pagado || !c.vence) return c
            const venceDate = new Date(c.vence + 'T00:00:00')
            return { ...c, vencida: venceDate < today }
          }))
        }
      } catch (e) { console.error('[Supabase] excepción al cargar:', e) }
      // Cargar actividades por separado — un fallo aquí no afecta al resto
      try {
        const { data: actData } = await supabase.from('actividad').select('*').order('created_at', { ascending: false })
        if (actData) setActividades(actData)
      } catch (_) {}
      // Cargar notificaciones
      try {
        const { data: notifData } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(60)
        if (notifData) setNotificaciones(notifData)
      } catch (_) {}
      // Cargar plantillas de tareas
      try {
        const { data: pData } = await supabase.from('plantillas_tareas').select('*').order('nombre')
        if (pData) setPlantillas(pData)
      } catch (_) {}
    }
    load()
  }, [currentUser])

  // ── Real-time sync ─────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return
    const isAdmin = currentUser.rol === 'Admin'
    const today   = new Date(); today.setHours(0,0,0,0)

    const stateMap = {
      'Ganado':'Cobrado','Perdido':'Denegado','Nuevo':'Cliente Nuevo',
      'Contactado':'Cliente Potencial','Interesado':'Cliente Interesado',
      'Propuesta enviada':'En Revisión','En seguimiento':'En Revisión',
    }
    const normLead  = (l) => { const s = stateMap[l.estado]; return s ? { ...l, estado: s } : l }
    const normCobro = (c) => {
      if (c.pagado || !c.vence) return c
      const d = new Date(c.vence + 'T00:00:00')
      return { ...c, vencida: d < today }
    }

    const ins  = (set) => ({ new: r }) => set(p => p.some(x => x.id === r.id) ? p : [r, ...p])
    const upd  = (set, norm = x => x) => ({ new: r }) => set(p => p.map(x => x.id === r.id ? norm(r) : x))
    const del  = (set) => ({ old: r }) => set(p => p.filter(x => x.id !== r.id))

    const ch = supabase.channel('crm-sync')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'leads'     }, ({ new: r }) => setLeads(p => p.some(x => x.id === r.id) ? p : [normLead(r), ...p]))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'leads'     }, ({ new: r }) => setLeads(p => p.map(x => x.id === r.id ? normLead(r) : x)))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'leads'     }, del(setLeads))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'clientes'  }, ins(setClientes))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'clientes'  }, upd(setClientes))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'clientes'  }, del(setClientes))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'tareas'    }, ins(setTasks))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'tareas'    }, upd(setTasks))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'tareas'    }, del(setTasks))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'proyectos' }, ins(setProyectos))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'proyectos' }, upd(setProyectos))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'proyectos' }, del(setProyectos))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'actividad'      }, ins(setActividades))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'actividad'      }, upd(setActividades))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'actividad'      }, del(setActividades))
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notificaciones' }, ins(setNotificaciones))
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'notificaciones' }, upd(setNotificaciones))

    if (isAdmin) {
      ch
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'cobros' }, ({ new: r }) => setCobros(p => p.some(x => x.id === r.id) ? p : [normCobro(r), ...p]))
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'cobros' }, ({ new: r }) => setCobros(p => p.map(x => x.id === r.id ? normCobro(r) : x)))
        .on('postgres_changes', { event:'DELETE', schema:'public', table:'cobros' }, del(setCobros))
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'gastos' }, ins(setGastos))
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'gastos' }, upd(setGastos))
        .on('postgres_changes', { event:'DELETE', schema:'public', table:'gastos' }, del(setGastos))
    }

    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUser])

  // ── Notificaciones ─────────────────────────────────────────
  const createNotif = async (para, tipo, titulo, subtitulo = null) => {
    if (!para || para === currentUser?.iniciales) return
    await supabase.from('notificaciones').insert([{ para, tipo, titulo, subtitulo }])
  }
  const markNotifsRead = async () => {
    const unread = notificaciones.filter(n => !n.leida).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notificaciones').update({ leida: true }).in('id', unread)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  // ── Reasignación masiva ────────────────────────────────────
  const reasignarMasivo = async ({ de, a, incluirLeads, incluirTareas, incluirProyectos, incluirClientes }) => {
    let count = 0
    if (incluirLeads) {
      const targets = leads.filter(l => l.responsable === de && !STAGES_CLOSED.includes(l.estado))
      if (targets.length) {
        await supabase.from('leads').update({ responsable: a }).eq('responsable', de).not('estado', 'in', `(${STAGES_CLOSED.join(',')})`)
        setLeads(prev => prev.map(l => l.responsable === de && !STAGES_CLOSED.includes(l.estado) ? { ...l, responsable: a } : l))
        count += targets.length
      }
    }
    if (incluirTareas) {
      const targets = tasksRef.current.filter(t => t.resp === de && !t.done)
      if (targets.length) {
        await supabase.from('tareas').update({ resp: a }).eq('resp', de).eq('done', false)
        setTasks(prev => prev.map(t => t.resp === de && !t.done ? { ...t, resp: a } : t))
        count += targets.length
      }
    }
    if (incluirProyectos) {
      const targets = proyectosRef.current.filter(p => p.resp === de && p.estado !== 'Cerrado')
      if (targets.length) {
        await supabase.from('proyectos').update({ resp: a }).eq('resp', de).neq('estado', 'Cerrado')
        setProyectos(prev => prev.map(p => p.resp === de && p.estado !== 'Cerrado' ? { ...p, resp: a } : p))
        count += targets.length
      }
    }
    if (incluirClientes) {
      // Sin clientes, el empleado destino no verá los clientes reasignados (RLS filtra por responsable)
      const targets = clientesRef.current.filter(c => c.responsable === de && c.estado !== 'Cerrado')
      if (targets.length) {
        await supabase.from('clientes').update({ responsable: a }).eq('responsable', de).neq('estado', 'Cerrado')
        setClientes(prev => prev.map(c => c.responsable === de && c.estado !== 'Cerrado' ? { ...c, responsable: a } : c))
        count += targets.length
      }
    }
    if (count > 0) {
      createNotif(a, 'reasignacion_masiva', `${count} elementos reasignados a ti`, `Transferido de ${de}`)
      showToast(`${count} elemento${count > 1 ? 's' : ''} reasignado${count > 1 ? 's' : ''} de ${de} → ${a}`)
    } else {
      showToast('No había elementos que reasignar', 'ok')
    }
  }

  // ── Actualizar perfil propio ────────────────────────────────
  const updateProfile = async (updates) => {
    const { data } = await supabase.from('usuarios').update(updates).eq('id', currentUser.id).select().single()
    if (data) setCurrentUser(data)
  }

  // Convierte strings vacíos a null para campos de tipo date en Supabase
  const clean = (obj) => Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === '' ? null : v])
  )

  // ── LEADS ──────────────────────────────────────────────────
  const addLead = async (lead) => {
    const { crearProyecto, origenCustom, yaCobrado: _y, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto, ...leadData } = lead
    const { data: d, error } = await supabase.from('leads').insert([clean(leadData)]).select().single()
    if (error || !d) {
      console.error('[Supabase] addLead error:', error?.message)
      showToast(`Error al guardar lead: ${error?.message || 'Sin respuesta de Supabase'}`, 'error')
      return
    }
    setLeads(prev => [d, ...prev])
    autoWinLead({ ...d, crearProyecto, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto })
    showToast(`Lead «${leadData.empresa}» creado`)
    if (d.responsable) createNotif(d.responsable, 'lead_asignado', `Lead asignado: ${d.empresa}`, d.servicio || null)
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
    const tieneSeñal     = señalCobrada > 0

    const yaExiste = clientesRef.current.some(c => c.nombre === lead.empresa)
    if (!yaExiste) {
      const mes = new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      addCliente({
        nombre: lead.empresa, servicio,
        contacto: lead.contacto || '',
        telefono: lead.telefono || '',
        email: lead.email || '',
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
        // El cobro Resto ya fue creado en handleSeñalConfirm — marcarlo como pagado al cerrar el lead
        const existingResto = cobrosRef.current.find(c =>
          c.cliente === lead.empresa && (c.concepto || '').startsWith('Resto ·') && !c.pagado
        )
        if (existingResto) {
          const restoUpdates = { pagado: true, vencida: false }
          if (lead.vence_resto) restoUpdates.vence = lead.vence_resto
          updateCobro(existingResto.id, restoUpdates)
        } else if (!esRecurrente) {
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
    if (safeUpdates.estado && lead?.estado !== safeUpdates.estado) {
      try { localStorage.setItem(`agentia_stagetime_${id}`, new Date().toISOString()) } catch {}
    }
    try {
      await supabase.from('leads').update(clean(safeUpdates)).eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...safeUpdates } : l))
    if (safeUpdates.responsable && safeUpdates.responsable !== lead?.responsable) {
      createNotif(safeUpdates.responsable, 'lead_reasignado', `Lead reasignado: ${lead?.empresa}`, safeUpdates.estado || lead?.estado)
      // Cascade: si el cliente asociado tiene el mismo responsable que el lead anterior, actualizarlo
      const clienteVinculado = clientesRef.current.find(c => c.nombre === lead?.empresa)
      if (clienteVinculado && clienteVinculado.responsable === lead?.responsable)
        updateCliente(clienteVinculado.id, { responsable: safeUpdates.responsable })
    }
    if (safeUpdates.estado && safeUpdates.estado !== lead?.estado && lead?.responsable)
      createNotif(lead.responsable, 'lead_estado', `${lead?.empresa} → ${safeUpdates.estado}`, lead?.servicio || null)

    // Cascade: si cambia el nombre de empresa, actualizar cobros, tareas, proyectos y clientes
    if (safeUpdates.empresa && lead?.empresa && safeUpdates.empresa !== lead.empresa) {
      const oldName = lead.empresa
      const newName = safeUpdates.empresa
      cobrosRef.current.filter(c => c.cliente === oldName).forEach(c => updateCobro(c.id, { cliente: newName }))
      tasksRef.current.filter(t => t.cliente === oldName).forEach(t => updateTask(t.id, { cliente: newName }))
      proyectosRef.current.filter(p => p.cliente === oldName).forEach(p => updateProyecto(p.id, { cliente: newName }))
      clientesRef.current.filter(c => c.nombre === oldName).forEach(c => updateCliente(c.id, { nombre: newName }, { skipCascade: true }))
    }

    const nuevoEstado  = safeUpdates.estado
    const eraCobrado   = lead?.estado === STAGE.COBRADO
    const eraSeñal     = lead?.estado === STAGE.SEÑAL
    const seraCobrado  = nuevoEstado === STAGE.COBRADO
    const seraDenegado = nuevoEstado === STAGE.DENEGADO

    if (seraCobrado && !eraCobrado) {
      autoWinLead({ ...lead, ...safeUpdates, crearProyecto, tipo, montoRecurrente, frecuencia, pagoDividido, señalPct, vence_resto })
    } else if (eraCobrado && nuevoEstado && !seraCobrado) {
      // Deja de ser Cobrado → eliminar cobro automático y cliente auto-creado
      const c = findCobroAuto(lead)
      if (c) deleteCobro(c.id)
      const clienteAuto = clientesRef.current.find(cl => cl.nombre === lead.empresa)
      if (clienteAuto) {
        // Solo borrar si no hay otros cobros pagados — protege clientes pre-existentes con historial
        const otherPaid = cobrosRef.current.some(co => co.cliente === lead.empresa && co.pagado && co.id !== c?.id)
        if (!otherPaid) deleteCliente(clienteAuto.id)
      }
    } else if (eraCobrado && !nuevoEstado && updates.monto !== undefined) {
      // Sigue Cobrado pero cambia el importe → actualizar cobro
      const c = findCobroAuto(lead)
      if (c) updateCobro(c.id, { monto: parseFloat(updates.monto) || 0 })
    }

    // Señal pagada → atrás: borrar cobro de señal + cobro del resto + cliente auto-creado
    if (eraSeñal && nuevoEstado && !seraCobrado && !seraDenegado) {
      const señalVal = parseFloat(lead.señal_cobrada) || 0
      const señalCobro = señalVal > 0 ? cobrosRef.current.find(c =>
        c.cliente === lead.empresa &&
        (c.concepto || '').startsWith('Señal ·') &&
        c.monto === señalVal
      ) : null
      const restoCobro = cobrosRef.current.find(c =>
        c.cliente === lead.empresa &&
        (c.concepto || '').startsWith('Resto ·') &&
        !c.pagado
      )
      // Comprobar otros pagados ANTES de borrar la señal (que es un cobro pagado)
      const otherPaid = cobrosRef.current.some(co =>
        co.cliente === lead.empresa && co.pagado && co.id !== señalCobro?.id
      )
      if (señalCobro) deleteCobro(señalCobro.id)
      if (restoCobro) deleteCobro(restoCobro.id)
      const clienteAuto = clientesRef.current.find(c => c.nombre === lead.empresa)
      if (clienteAuto && !otherPaid) deleteCliente(clienteAuto.id)
    }
    // Señal pagada → Denegado: mantener cobro señal (dinero recibido), borrar resto pendiente
    if (eraSeñal && seraDenegado) {
      const restoCobro = cobrosRef.current.find(c =>
        c.cliente === lead.empresa && (c.concepto || '').startsWith('Resto ·') && !c.pagado
      )
      if (restoCobro) deleteCobro(restoCobro.id)
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

    // Cualquier estado activo → Denegado (sin haber pasado por Cobrado ni Señal):
    // borrar cobros pendientes y cliente si no tiene historial de cobros pagados
    if (seraDenegado && !eraCobrado && !eraSeñal) {
      cobrosRef.current
        .filter(c => c.cliente === lead.empresa && !c.pagado && !c.recurrente)
        .forEach(c => deleteCobro(c.id))
      const client = clientesRef.current.find(c => c.nombre === lead.empresa)
      if (client) {
        const tienePagados = cobrosRef.current.some(c => c.cliente === lead.empresa && c.pagado)
        if (!tienePagados) deleteCliente(client.id)
      }
    }
  }

  const deleteLead = async (id) => {
    const lead = leads.find(l => l.id === id)
    try {
      await supabase.from('leads').delete().eq('id', id)
    } catch (_) {}
    setLeads(prev => prev.filter(l => l.id !== id))

    // Denegado: solo eliminar la fila. Si tenía señal cobrada, dejar el cobro (dinero real recibido)
    if (lead?.estado === STAGE.DENEGADO) return

    // Cobrado: "Quitar del pipeline" conserva el cliente (es historial real)
    if (lead?.estado === STAGE.COBRADO) return

    // Señal pagada: limpiar cobros de señal y resto creados al confirmar la señal
    if (lead?.estado === STAGE.SEÑAL) {
      const señalVal = parseFloat(lead.señal_cobrada) || 0
      if (señalVal > 0) {
        const señalCobro = cobrosRef.current.find(c =>
          c.cliente === lead.empresa && (c.concepto || '').startsWith('Señal ·') && c.monto === señalVal
        )
        if (señalCobro) deleteCobro(señalCobro.id)
      }
      const restoCobro = cobrosRef.current.find(c =>
        c.cliente === lead.empresa && (c.concepto || '').startsWith('Resto ·') && !c.pagado
      )
      if (restoCobro) deleteCobro(restoCobro.id)
    }

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
    const { data: d, error } = await supabase.from('clientes').insert([clean(cliente)]).select().single()
    if (!error && d) { setClientes(prev => [d, ...prev]); showToast(`Cliente «${cliente.nombre}» creado`) }
    else if (error) { console.error('[Supabase] addCliente:', error.message); showToast(`Error al guardar cliente: ${error.message}`, 'error') }
  }

  const updateCliente = async (id, updates, { skipCascade = false } = {}) => {
    const cliente = clientesRef.current.find(c => c.id === id)
    try {
      await supabase.from('clientes').update(clean(updates)).eq('id', id)
    } catch (_) {}
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    // Cascade: si cambia el nombre, actualizar cobros, tareas y proyectos que lo referencian
    // skipCascade=true cuando se llama desde updateLead (que ya ha cascadeado directamente)
    if (!skipCascade && updates.nombre && cliente?.nombre && updates.nombre !== cliente.nombre) {
      const oldName = cliente.nombre
      const newName = updates.nombre
      cobrosRef.current.filter(c => c.cliente === oldName).forEach(c => updateCobro(c.id, { cliente: newName }))
      tasksRef.current.filter(t => t.cliente === oldName).forEach(t => updateTask(t.id, { cliente: newName }))
      proyectosRef.current.filter(p => p.cliente === oldName).forEach(p => updateProyecto(p.id, { cliente: newName }))
    }
  }

  const deleteCliente = async (id) => {
    const cliente = clientesRef.current.find(c => c.id === id)
    try {
      await supabase.from('clientes').delete().eq('id', id)
    } catch (_) {}
    setClientes(prev => prev.filter(c => c.id !== id))

    // Cascade: borrar tareas, proyectos y cobros de este cliente
    if (cliente) {
      tasksRef.current.filter(t => t.cliente === cliente.nombre).forEach(t => deleteTask(t.id))
      proyectosRef.current.filter(p => p.cliente === cliente.nombre).forEach(p => deleteProyecto(p.id))
      // Solo borrar cobros NO pagados — los pagados son historial financiero
      cobrosRef.current.filter(c => c.cliente === cliente.nombre && !c.pagado).forEach(c => deleteCobro(c.id))
    }
  }

  // ── TAREAS ─────────────────────────────────────────────────
  const addTask = async (tarea) => {
    const { data: d, error } = await supabase.from('tareas').insert([clean(tarea)]).select().single()
    if (!error && d) {
      setTasks(prev => [d, ...prev]); showToast('Tarea creada')
      if (d.resp) createNotif(d.resp, 'tarea_asignada', `Nueva tarea: ${d.title}`, d.cliente || null)
    } else if (error) console.error('[Supabase] addTask:', error.message)
  }

  const updateTask = async (id, updates) => {
    const task = tasksRef.current.find(t => t.id === id)
    try {
      const { error } = await supabase.from('tareas').update(clean(updates)).eq('id', id)
      if (!error) {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
        if (updates.resp && updates.resp !== task?.resp)
          createNotif(updates.resp, 'tarea_reasignada', `Tarea reasignada: ${task?.title}`, task?.cliente || null)
        return
      }
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
    const { data: d, error } = await supabase.from('proyectos').insert([clean(proyecto)]).select().single()
    if (!error && d) { setProyectos(prev => [d, ...prev]) }
    else if (error) console.error('[Supabase] addProyecto:', error.message)
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
    const { data: d, error } = await supabase.from('gastos').insert([clean(gasto)]).select().single()
    if (!error && d) { setGastos(prev => [d, ...prev]) }
    else if (error) { console.error('[Supabase] addGasto:', error.message); showToast(`Error al guardar gasto: ${error.message}`, 'error') }
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
    const { data: d, error } = await supabase.from('cobros').insert([clean(cobro)]).select().single()
    if (!error && d) {
      setCobros(prev => [d, ...prev])
    } else if (error?.code === 'PGRST116') {
      // INSERT ok pero sin acceso SELECT (rol no-admin) — cobro guardado en DB, no es error real
    } else if (error) console.error('[Supabase] addCobro:', error.message)
  }

  const updateCobro = async (id, updates) => {
    const cobro = cobrosRef.current.find(c => c.id === id)
    let ok = false
    try {
      const { error } = await supabase.from('cobros').update(clean(updates)).eq('id', id)
      if (!error) { setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); ok = true }
    } catch (_) {
      setCobros(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c)); ok = true
    }
    if (!ok) return
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
    cobros.filter(c => !c.pagado && (c.vencida || (c.vence && new Date(c.vence + 'T00:00:00') < _today))).length +
    notificaciones.filter(n => !n.leida).length

  const data = {
    leads, clientes, tasks, proyectos, gastos, cobros, teamMembers, actividades, usuarios, plantillas,
    reasignarMasivo,
    addLead, updateLead, deleteLead,
    addCliente, updateCliente, deleteCliente,
    addTask, updateTask, deleteTask,
    addProyecto, updateProyecto, deleteProyecto,
    addGasto, updateGasto, deleteGasto,
    addCobro, updateCobro, deleteCobro,
    showToast,
  }

  // ── Auth gates ─────────────────────────────────────────────
  if (!authReady) return (
    <div style={{position:'fixed',inset:0,background:'#0A0E17',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7590',fontSize:13,fontFamily:'system-ui'}}>
      Cargando…
    </div>
  )
  if (!currentUser) return (
    <Login
      noProfile={noProfile}
      onRetry={() => { supabase.auth.signOut(); setNoProfile(false) }}
    />
  )

  const clearOpenItem = () => setOpenItem(null)

  const pageEl = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard role={role} setPage={setPage} openQuick={() => setDrawer(true)} data={data} currentUser={currentUser} />
      case 'pipeline':  return <Pipeline data={data} openQuick={() => setDrawer(true)} openItem={openItem} onItemOpened={clearOpenItem} currentUser={currentUser} />
      case 'clientes':  return <Clientes data={data} openItem={openItem} onItemOpened={clearOpenItem} currentUser={currentUser} />
      case 'tareas':    return <Tareas data={data} openItem={openItem} onItemOpened={clearOpenItem} currentUser={currentUser} />
      case 'proyectos': return <Proyectos data={data} currentUser={currentUser} />
      case 'equipo':    return (role === 'admin' || role === 'manager') ? <Equipo data={data} /> : null
      case 'finanzas':  return role === 'admin' ? <Finanzas role={role} data={data} /> : null
      case 'ajustes':   return role === 'admin' ? <Ajustes role={role} data={data} currentUser={currentUser} /> : null
      default:          return null
    }
  })()

  return (
    <>
      <div className="app" data-screen-label={PAGES.find(p => p[0] === page)?.[1]}>
        <Sidebar page={page} setPage={setPage} role={role} counts={counts} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} currentUser={currentUser} onSignOut={signOut} onProfileOpen={() => setProfileOpen(true)} />
        <div className="content">
          <Topbar crumb={crumbMap[page]} setDrawerOpen={setDrawer} role={role} onMenuClick={() => setSidebarOpen(o => !o)} notifCount={notifCount} onSearchOpen={() => setSearchOpen(true)} onBellOpen={() => setBellOpen(o => !o)} currentUser={currentUser} />
          <main className="main">{pageEl}</main>
        </div>
      </div>

      <QuickLeadDrawer open={drawer} onClose={() => setDrawer(false)} onSave={addLead} currentUser={currentUser} />
      {profileOpen && <ProfileModal currentUser={currentUser} onClose={() => setProfileOpen(false)} onSave={updateProfile} />}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} data={data} setPage={setPage}
        onSelect={r => { setPage(r.page); setOpenItem(r); setSearchOpen(false) }} />
      <BellPanel open={bellOpen} onClose={() => setBellOpen(false)} tasks={tasks} cobros={role === 'admin' ? cobros : []} notificaciones={notificaciones} onMarkRead={markNotifsRead} />

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
