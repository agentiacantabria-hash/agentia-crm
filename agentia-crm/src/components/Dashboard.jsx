import React, { useState } from 'react'
import { I } from './Icons'
import { STATE_COLORS, PIPELINE_COLS, eur } from './data'

function effectiveGroup(task) {
  if (task.due_date) {
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(task.due_date); due.setHours(0,0,0,0)
    const diff = Math.floor((due - today) / 86400000)
    if (diff < 0) return 'vencida'
    if (diff === 0) return 'hoy'
    if (diff === 1) return 'mañana'
    return 'semana'
  }
  return task.when_group || 'semana'
}

function getAdminName() {
  try {
    const users = JSON.parse(localStorage.getItem('agentia_usuarios') || '[]')
    const admin = users.find(u => u.rol === 'Admin' && u.estado === 'activo')
    return admin ? admin.n.split(' ')[0] : 'Admin'
  } catch { return 'Admin' }
}

function getEmpleadoName() {
  try {
    const users = JSON.parse(localStorage.getItem('agentia_usuarios') || '[]')
    const emp = users.find(u => u.rol === 'Empleado' && u.estado === 'activo')
    return emp ? emp.n.split(' ')[0] : 'Empleado'
  } catch { return 'Empleado' }
}

function buildChartData(cobros, period) {
  const now = new Date()
  const paid = cobros.filter(c => c.pagado)
  if (period === 'semana') {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
      days.push({ key: d.toISOString().slice(0,10), label: d.toLocaleDateString('es-ES', { weekday:'short' }), value: 0 })
    }
    paid.forEach(c => {
      const key = new Date(c.created_at || Date.now()).toISOString().slice(0,10)
      const m = days.find(m => m.key === key)
      if (m) m.value += (c.monto || 0)
    })
    return days
  }
  const count = period === 'año' ? 12 : 6
  const months = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('es-ES', { month: 'short' }),
      value: 0,
    })
  }
  paid.forEach(c => {
    const d = new Date(c.created_at || Date.now())
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const m = months.find(m => m.key === key)
    if (m) m.value += (c.monto || 0)
  })
  return months
}

function RevenueChart({ cobros, period }) {
  const months  = buildChartData(cobros, period)
  const data    = months.map(m => m.value)
  const labels  = months.map(m => m.label)
  const total   = data.reduce((a,v) => a+v, 0)
  const hasData = total > 0

  const W=720, H=220, P={l:44,r:12,t:16,b:26}
  const max = hasData ? Math.max(...data) * 1.15 : 16000
  const x = (i) => P.l + i*((W-P.l-P.r)/(data.length-1))
  const y = (v) => P.t + (1 - v/max)*(H-P.t-P.b)
  const pts = data.map((v,i)=>`${x(i)},${y(v)}`).join(' ')
  const area = `M${x(0)},${y(data[0])} L${data.map((v,i)=>`${x(i)},${y(v)}`).join(' L')} L${x(data.length-1)},${H-P.b} L${x(0)},${H-P.b} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-area" style={{display:'block'}}>
      <defs>
        <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2D6BFF" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#2D6BFF" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gLine" x1="0" x2="1">
          <stop offset="0%" stopColor="#4F8BFF"/>
          <stop offset="100%" stopColor="#9A7BFF"/>
        </linearGradient>
      </defs>
      {[0,0.25,0.5,0.75,1].map((r,i)=>(
        <line key={i} x1={P.l} x2={W-P.r} y1={P.t + r*(H-P.t-P.b)} y2={P.t + r*(H-P.t-P.b)} stroke="rgba(255,255,255,0.04)"/>
      ))}
      {[0,0.25,0.5,0.75,1].map((r,i)=>(
        <text key={i} x={P.l-6} y={P.t + r*(H-P.t-P.b)+3} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono" fill="#6B7590">
          €{Math.round(max*(1-r)/1000)}k
        </text>
      ))}
      <path d={area} fill="url(#gArea)"/>
      <polyline points={pts} fill="none" stroke="url(#gLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v,i)=>(
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.4" fill="#0A0E17" stroke="#4F8BFF" strokeWidth="2"/>
          <text x={x(i)} y={H-8} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill="#6B7590">{labels[i]}</text>
          {i === data.length-1 && v > 0 && (
            <>
              <circle cx={x(i)} cy={y(v)} r="8" fill="#2D6BFF" opacity="0.25"/>
              <text x={x(i)} y={y(v)-12} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono" fill="#8FB3FF">€{eur(v)}</text>
            </>
          )}
        </g>
      ))}
      {!hasData && (
        <text x={W/2} y={H/2} textAnchor="middle" fontSize="12" fill="#6B7590" fontFamily="JetBrains Mono">
          Añade cobros marcados como pagados para ver la evolución
        </text>
      )}
    </svg>
  )
}

function PipelineFunnel({ leads }) {
  const active = PIPELINE_COLS.filter(c => !['Cobrado','Denegado'].includes(c))
  const stages = active.map(col => {
    const group = leads.filter(l => l.estado === col)
    return {
      label: col,
      n: group.length,
      amount: group.reduce((a,l) => a + (l.monto||0), 0),
      color: STATE_COLORS[col]?.color || '#6B7590',
    }
  }).filter(s => s.n > 0)

  if (!stages.length) {
    return <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'24px 0'}}>Sin leads activos en el pipeline</div>
  }

  const max = Math.max(...stages.map(s => s.amount), 1)
  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {stages.map((s,i)=>(
        <div key={i} style={{display:'grid', gridTemplateColumns:'150px 1fr 90px', alignItems:'center', gap:12}}>
          <div className="pipe-tag" style={{'--color': s.color}}><span className="box"/>{s.label}</div>
          <div style={{position:'relative', height:28, background:'rgba(255,255,255,0.03)', borderRadius:7, overflow:'hidden'}}>
            <div style={{width:`${s.amount/max*100}%`, height:'100%', background:`linear-gradient(90deg, ${s.color}33, ${s.color}cc)`, borderRight:`2px solid ${s.color}`, boxShadow:`0 0 16px ${s.color}44`, transition:'width 0.6s'}}/>
            <div style={{position:'absolute', left:10, top:0, bottom:0, display:'flex', alignItems:'center', fontSize:12, color:'var(--text-1)', fontWeight:500}}>
              {s.n} oportunidad{s.n!==1?'es':''}
            </div>
          </div>
          <div className="mono" style={{textAlign:'right', fontSize:12.5}}>€{eur(s.amount)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ role, setPage, openQuick, data }) {
  const { leads = [], tasks = [], proyectos = [], clientes = [], gastos = [], cobros = [], updateTask } = data || {}
  const [chartPeriod, setChartPeriod] = useState('mes')

  // ── computed ────────────────────────────────────────────────
  const ingresosMes   = cobros.filter(c => c.pagado).reduce((a,c) => a + (c.monto||0), 0)
  const pendientes    = cobros.filter(c => !c.pagado)
  const pendientesMes = pendientes.reduce((a,c) => a + (c.monto||0), 0)
  const gastosMes     = gastos.reduce((a,g) => a + (g.monto||0), 0)
  const gastoIA       = gastos.filter(g => g.tipo==='IA').reduce((a,g) => a + (g.monto||0), 0)
  const totalFacturado = cobros.reduce((a,c) => a + (c.monto||0), 0)
  const margen        = (ingresosMes + pendientesMes) > 0
    ? Math.round((ingresosMes - gastosMes) / (ingresosMes + pendientesMes) * 100)
    : (gastosMes === 0 ? 100 : 0)

  const mrr = cobros.filter(c => c.recurrente && !c.pagado).reduce((acc, c) => {
    const freq = c.frecuencia || 'Mensual'
    const factor = freq === 'Semanal' ? 4.33 : freq === 'Trimestral' ? 1/3 : 1
    return acc + (c.monto || 0) * factor
  }, 0)
  const clientesRecurrentesN = clientes.filter(c => (c.tipo || c.estado) === 'Recurrente').length

  const leadsActivos  = leads.filter(l => !['Cobrado','Denegado'].includes(l.estado))
  const leadsCalientes = leads.filter(l => l.temp === 'hot')
  const leadesTibios  = leads.filter(l => l.temp === 'warm')
  const urgentes      = tasks.filter(t => t.prio === 'alta' && !t.done && ['hoy','vencida'].includes(t.when_group))

  const clientesActivos    = clientes.length
  const clientesEnCurso    = clientes.filter(c => c.estado === 'En curso').length
  const clientesRecurrentes = clientes.filter(c => c.estado === 'Recurrente').length
  const clientesAjustes    = clientes.filter(c => c.ajustes > 0).length

  const gastoIAItems = gastos.filter(g => g.tipo === 'IA')
  const gastoIADetail = gastoIAItems.length
    ? gastoIAItems.map(g => `${g.concepto.split('—')[0].trim()} €${g.monto}`).join(' · ')
    : 'Sin gastos IA registrados'

  const pipelineTotal = leadsActivos.reduce((a,l) => a + (l.monto||0), 0)

  const seguimientos = leads
    .filter(l => l.next && l.next !== '—' && !['Cobrado','Denegado'].includes(l.estado))
    .slice(0, 4)
    .map(l => ({
      name: l.empresa,
      type: /llam/i.test(l.next) ? 'Llamada' : /reuni/i.test(l.next) ? 'Reunión' : 'Seguimiento',
      when: l.next,
      who: l.responsable,
    }))

  // ── hero message ────────────────────────────────────────────
  const nombreAdmin = getAdminName()
  const nombreEmp   = getEmpleadoName()
  const nombre      = role === 'admin' ? nombreAdmin : nombreEmp

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 14) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  })()

  const fechaHoy = (() => {
    const s = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  const heroTitle = (() => {
    if (urgentes.length > 0 && leadsCalientes.length > 0)
      return <h1>Tienes <span style={{color:'var(--brand-2)'}}>{urgentes.length} tarea{urgentes.length!==1?'s':''} urgente{urgentes.length!==1?'s':''}</span> y <span style={{color:'var(--brand-2)'}}>{leadsCalientes.length} lead{leadsCalientes.length!==1?'s':''} caliente{leadsCalientes.length!==1?'s':''}</span> por cerrar.</h1>
    if (urgentes.length > 0)
      return <h1>Tienes <span style={{color:'var(--brand-2)'}}>{urgentes.length} tarea{urgentes.length!==1?'s':''} urgente{urgentes.length!==1?'s':''}</span> pendiente{urgentes.length!==1?'s':''}.</h1>
    if (leadsCalientes.length > 0)
      return <h1>Tienes <span style={{color:'var(--brand-2)'}}>{leadsCalientes.length} lead{leadsCalientes.length!==1?'s':''} caliente{leadsCalientes.length!==1?'s':''}</span> por cerrar.</h1>
    return <h1>Todo al día. <span style={{color:'var(--brand-2)'}}>Buen trabajo.</span></h1>
  })()

  const heroSub = (() => {
    if (role !== 'admin') {
      // Empleado: solo info operativa, sin finanzas
      const parts = []
      const tareasHoy = tasks.filter(t => t.when_group === 'hoy' && !t.done).length
      if (tareasHoy > 0) parts.push(`${tareasHoy} tarea${tareasHoy!==1?'s':''} para hoy`)
      if (leadsActivos.length > 0) parts.push(`${leadsActivos.length} lead${leadsActivos.length!==1?'s':''} activo${leadsActivos.length!==1?'s':''}`)
      return parts.length ? parts.join(' · ') : 'Sin tareas ni leads pendientes.'
    }
    // Admin: info financiera completa
    const parts = []
    if (ingresosMes > 0) parts.push(`€${eur(ingresosMes)} cobrados este mes`)
    if (pendientes.length > 0) parts.push(`${pendientes.length} factura${pendientes.length!==1?'s':''} pendiente${pendientes.length!==1?'s':''}`)
    if (gastosMes > 0) parts.push(`€${eur(gastosMes)} en gastos`)
    return parts.length ? parts.join(' · ') : 'Empieza añadiendo tus primeros leads y clientes.'
  })()

  return (
    <div className="fade-in">
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-welcome">
            <p className="kicker">{greeting}, {nombre}</p>
            {heroTitle}
            <p>{fechaHoy} · {heroSub}</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={openQuick}><I.Plus size={14}/> Crear lead</button>
              <button className="btn" onClick={() => setPage('finanzas')}><I.Receipt size={14}/> Registrar cobro</button>
              <button className="btn" onClick={() => setPage('finanzas')}><I.ArrowDn size={14}/> Registrar gasto</button>
              <button className="btn ghost" onClick={() => setPage('tareas')}><I.Tasks size={14}/> Crear tarea</button>
            </div>
          </div>

          {role === 'admin' ? (
            <div className="hero-kpi">
              <div className="mini">
                <div className="label">Ingresos mes</div>
                <div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> {eur(ingresosMes)}</div>
                <div className="trend" style={{color: ingresosMes > 0 ? 'var(--ok)' : 'var(--text-3)'}}>
                  {cobros.filter(c=>c.pagado).length} cobros registrados
                </div>
              </div>
              <div className="mini">
                <div className="label">Cobros pendientes</div>
                <div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> {eur(pendientesMes)}</div>
                <div className="trend" style={{color: pendientes.length > 0 ? 'var(--warn)' : 'var(--ok)'}}>
                  {pendientes.length > 0 ? `${pendientes.length} factura${pendientes.length!==1?'s':''} abierta${pendientes.length!==1?'s':''}` : 'Todo cobrado'}
                </div>
              </div>
              <div className="mini">
                <div className="label">Gastos mes</div>
                <div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> {eur(gastosMes)}</div>
                <div className="trend" style={{color:'var(--text-3)'}}>
                  {gastos.length > 0 ? `${gastos.length} gasto${gastos.length!==1?'s':''}` : 'Sin gastos aún'}
                </div>
              </div>
              <div className="mini">
                <div className="label">Margen</div>
                <div className="value">{margen}<span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>%</span></div>
                <div className="trend" style={{color: margen >= 70 ? 'var(--ok)' : margen >= 40 ? 'var(--warn)' : 'var(--danger)'}}>
                  {margen >= 70 ? 'Saludable' : margen >= 40 ? 'Ajustado' : 'Revisar gastos'}
                </div>
              </div>
            </div>
          ) : (
            <div className="hero-kpi">
              <div className="mini"><div className="label">Leads activos</div><div className="value">{leadsActivos.length}</div><div className="trend" style={{color:'var(--brand-3)'}}>{leadsCalientes.length} calientes</div></div>
              <div className="mini"><div className="label">Tareas hoy</div><div className="value">{tasks.filter(t=>t.when_group==='hoy'&&!t.done).length}</div><div className="trend" style={{color: urgentes.length>0?'var(--warn)':'var(--ok)'}}>{urgentes.length>0?`${urgentes.length} urgente${urgentes.length!==1?'s':''}`:'Sin urgentes'}</div></div>
              <div className="mini"><div className="label">En proyecto</div><div className="value">{proyectos.filter(p=>p.estado!=='Cerrado').length}</div><div className="trend" style={{color:'var(--text-3)'}}>{proyectos.filter(p=>p.ajustes>0).length} con ajustes</div></div>
              <div className="mini"><div className="label">Cobrados</div><div className="value">{leads.filter(l=>l.estado==='Cobrado').length}</div><div className="trend trend-up">leads cerrados</div></div>
            </div>
          )}
        </div>
      </div>

      {role === 'admin' && (
        <div className="stat-grid">
          <div className="stat" style={{'--stat-glow':'rgba(45,107,255,0.22)','--stat-dot':'#4F8BFF'}}>
            <div className="label"><span className="dot"/>Total facturado</div>
            <div className="value"><span className="currency">€</span>{eur(totalFacturado)}</div>
            <div className="foot">{cobros.length} factura{cobros.length!==1?'s':''} · €{eur(ingresosMes)} cobrados</div>
          </div>
          <div className="stat" style={{'--stat-glow':'rgba(62,207,142,0.18)','--stat-dot':'#3ECF8E'}}>
            <div className="label"><span className="dot"/>Clientes activos</div>
            <div className="value">{clientesActivos}</div>
            <div className="foot">
              {[clientesEnCurso > 0 && `${clientesEnCurso} en curso`, clientesRecurrentes > 0 && `${clientesRecurrentes} recurrentes`, clientesAjustes > 0 && `${clientesAjustes} con ajustes`].filter(Boolean).join(' · ') || 'Sin clientes aún'}
            </div>
          </div>
          <div className="stat" style={{'--stat-glow':'rgba(154,123,255,0.18)','--stat-dot':'#9A7BFF'}}>
            <div className="label"><span className="dot"/>Leads activos</div>
            <div className="value">{leadsActivos.length}</div>
            <div className="foot">
              {leadsCalientes.length > 0 && <span style={{color:'#FF9BA5'}}>● {leadsCalientes.length} calientes</span>}
              {leadsCalientes.length > 0 && leadesTibios.length > 0 && ', '}
              {leadesTibios.length > 0 && `${leadesTibios.length} tibios`}
              {leadsActivos.length === 0 && 'Sin leads activos'}
            </div>
          </div>
          <div className="stat" style={{'--stat-glow':'rgba(62,207,142,0.18)','--stat-dot':'#3ECF8E'}}>
            <div className="label"><span className="dot"/>MRR · recurrentes</div>
            <div className="value"><span className="currency">€</span>{eur(Math.round(mrr))}</div>
            <div className="foot">{clientesRecurrentesN > 0 ? `${clientesRecurrentesN} cliente${clientesRecurrentesN!==1?'s':''} recurrente${clientesRecurrentesN!==1?'s':''}` : 'Sin clientes recurrentes'}</div>
          </div>
        </div>
      )}

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head">
            <h3>Ingresos cobrados · histórico</h3>
            <span className="sub">· total €{eur(ingresosMes)}</span>
            <div className="right">
              <div className="segmented">
                {[['semana','Semana'],['mes','Mes'],['año','Año']].map(([k,v]) => (
                  <button key={k} className={chartPeriod===k?'active':''} onClick={() => setChartPeriod(k)}>{v}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="card-body"><RevenueChart cobros={cobros} period={chartPeriod} /></div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Qué toca hoy</h3>
            <div className="right"><button className="btn sm ghost" onClick={() => setPage('tareas')}>Ver todas <I.ChevronR size={12}/></button></div>
          </div>
          <div>
            {tasks.filter(t => effectiveGroup(t) === 'hoy' || effectiveGroup(t) === 'vencida').slice(0,5).map(t => (
              <div className="task" key={t.id}>
                <div className={`check ${t.done ? 'done' : ''}`} style={{cursor:'pointer'}}
                  onClick={() => updateTask?.(t.id, { done: !t.done })}>
                  {t.done && <I.Check size={12} stroke={2.4}/>}
                </div>
                <div style={{minWidth:0, flex:1}}>
                  <div className="title" style={{textDecoration: t.done?'line-through':'none', color: t.done?'var(--text-3)':'var(--text-0)'}}>{t.title}</div>
                  <div className="sub">{t.cliente} · {t.time}</div>
                </div>
                <span className={`chip ${t.prio==='alta'?'red':t.prio==='media'?'amber':'gray'}`}><span className="dot"/>{t.prio}</span>
              </div>
            ))}
            {tasks.filter(t => !t.done && ['hoy','vencida'].includes(effectiveGroup(t))).length === 0 && (
              <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'24px 0'}}>Sin tareas para hoy</div>
            )}
          </div>
        </div>
      </div>

      <div style={{height:16}}/>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head">
            <h3>Pipeline comercial</h3>
            <span className="sub">· €{eur(pipelineTotal)} en juego</span>
            <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Abrir tablero <I.ChevronR size={12}/></button></div>
          </div>
          <div className="card-body"><PipelineFunnel leads={leads} /></div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Ajustes pendientes tras pago</h3>
            <div className="right"><button className="btn sm ghost" onClick={() => setPage('proyectos')}>Ver todo</button></div>
          </div>
          <div>
            {proyectos.filter(p => p.ajustes > 0).map(p => (
              <div key={p.id} className="task">
                <div style={{width:30, height:30, borderRadius:8, background:'rgba(255,181,71,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#FFB547', flexShrink:0}}><I.Bolt size={14}/></div>
                <div style={{minWidth:0, flex:1}}><div className="title">{p.cliente}</div><div className="sub">{p.servicio}</div></div>
                <span className="pend">{p.ajustes} ajuste{p.ajustes>1?'s':''}</span>
              </div>
            ))}
            {proyectos.filter(p => p.ajustes > 0).length === 0 && (
              <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'24px 0'}}>Sin ajustes pendientes</div>
            )}
          </div>
        </div>
      </div>

      <div style={{height:16}}/>

      {role === 'admin' && (() => {
        const señalLeads = leads.filter(l => l.estado === 'Señal pagada')
        if (!señalLeads.length) return null
        return (
          <div className="card" style={{marginBottom:16}}>
            <div className="card-head">
              <h3>Señales por cobrar</h3>
              <span className="sub">· {señalLeads.length} lead{señalLeads.length!==1?'s':''} pendiente{señalLeads.length!==1?'s':''}</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver pipeline <I.ChevronR size={12}/></button></div>
            </div>
            <div>
              {señalLeads.map(l => {
                const señalCobrada = parseFloat(l.señal_cobrada) || 0
                const total        = parseFloat(l.monto) || 0
                const resto        = total - señalCobrada
                const diasDesde    = l.señal_fecha
                  ? Math.floor((Date.now() - new Date(l.señal_fecha)) / 86400000)
                  : 0
                const alert = diasDesde > 30
                return (
                  <div key={l.id} className="task">
                    <div style={{width:30, height:30, borderRadius:8,
                      background: alert ? 'rgba(255,90,106,0.12)' : 'rgba(46,196,182,0.12)',
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      color: alert ? '#FF5A6A' : '#2EC4B6', flexShrink:0}}>
                      <I.Receipt size={14}/>
                    </div>
                    <div style={{minWidth:0, flex:1}}>
                      <div className="title">{l.empresa}</div>
                      <div className="sub">Señal €{eur(señalCobrada)} cobrada · Resto €{eur(resto > 0 ? resto : 0)} pendiente · Hace {diasDesde}d</div>
                    </div>
                    {alert
                      ? <span className="chip red"><span className="dot"/>+30 días</span>
                      : <span className="chip teal"><span className="dot"/>Activo</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head">
            <h3>Leads recientes</h3>
            <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver todos</button></div>
          </div>
          <table className="table">
            <thead><tr><th>Empresa</th><th>Servicio</th><th>Estado</th><th>Próximo paso</th><th style={{textAlign:'right'}}>Importe</th></tr></thead>
            <tbody>
              {leads.slice(0,5).map(l => {
                const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                return (
                  <tr key={l.id}>
                    <td><div className="primary">{l.empresa}</div><div className="muted" style={{fontSize:11.5, marginTop:2}}>{l.sector} · {l.ciudad}</div></td>
                    <td className="muted">{l.servicio}</td>
                    <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                    <td className="muted small">{l.next}</td>
                    <td className="mono" style={{textAlign:'right'}}>€{eur(l.monto || 0)}</td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr><td colSpan={5} style={{textAlign:'center', color:'var(--text-4)', padding:'24px 0'}}>Sin leads — crea tu primero con el botón de arriba</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head"><h3>Seguimientos próximos</h3></div>
          <div>
            {seguimientos.map((s,i) => (
              <div key={i} className="task">
                <div style={{width:30, height:30, borderRadius:8, background:'rgba(45,107,255,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--brand-2)', flexShrink:0}}>
                  {s.type==='Llamada'?<I.Phone size={14}/>:s.type==='Reunión'?<I.Calendar size={14}/>:<I.Clock size={14}/>}
                </div>
                <div style={{minWidth:0, flex:1}}><div className="title">{s.name}</div><div className="sub">{s.type} · {s.when}</div></div>
                <div className="avatar sm">{s.who}</div>
              </div>
            ))}
            {seguimientos.length === 0 && (
              <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'24px 0'}}>Sin seguimientos pendientes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
