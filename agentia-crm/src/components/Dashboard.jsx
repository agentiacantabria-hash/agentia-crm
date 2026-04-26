import React, { useState, useEffect } from 'react'
import { I } from './Icons'
import { STATE_COLORS, PIPELINE_COLS, STAGE, STAGES_CLOSED, STAGES_VALOR, eur } from './data'
import { supabase } from '../lib/supabase'

const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`


function effectiveGroup(task) {
  if (task.due_date) {
    const today = new Date(); today.setHours(0,0,0,0)
    const due   = new Date(task.due_date + 'T00:00:00'); due.setHours(0,0,0,0)
    const diff  = Math.floor((due - today) / 86400000)
    if (diff < 0)  return 'vencida'
    if (diff === 0) return 'hoy'
    if (diff === 1) return 'mañana'
    return 'semana'
  }
  return task.when_group || 'semana'
}

function buildChartData(cobros, period) {
  const now = new Date()
  const paid = cobros.filter(c => c.pagado)
  if (period === 'semana') {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0,0,0,0)
      days.push({ key: ymd(d), label: d.toLocaleDateString('es-ES', { weekday:'short' }), value: 0 })
    }
    paid.forEach(c => {
      const raw = c.vence || c.created_at
      const key = raw ? (raw.length === 10 ? raw : ymd(new Date(raw))) : null
      const m = key ? days.find(m => m.key === key) : null
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
    const raw = c.vence || c.created_at
    const d = raw ? new Date(raw.length === 10 ? raw + 'T00:00:00' : raw) : new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const m = months.find(m => m.key === key)
    if (m) m.value += (c.monto || 0)
  })
  return months
}

function MrrTrend({ cobros }) {
  const now = new Date()
  const months = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const label = d.toLocaleDateString('es-ES', { month:'short' })
    const ingr = cobros.filter(c => {
      if (!c.pagado) return false
      const raw = c.vence || c.created_at
      if (!raw) return false
      const cd = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw)
      return cd >= d && cd <= end
    }).reduce((a,c) => a + (c.monto||0), 0)
    months.push({ label, value: ingr })
  }
  const max = Math.max(...months.map(m => m.value), 1)
  const prev = months[1]?.value || 0
  const curr = months[2]?.value || 0
  const delta = prev > 0 ? Math.round((curr - prev) / prev * 100) : null

  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      <div style={{display:'flex', alignItems:'flex-end', gap:8, height:60}}>
        {months.map((m, i) => (
          <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
            <div style={{
              width:'100%', borderRadius:4,
              height: Math.max(4, Math.round(m.value / max * 56)),
              background: i === 2 ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
              transition:'height 0.4s',
            }}/>
            <div style={{fontSize:10.5, color:'var(--text-4)'}}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
        <div>
          <div style={{fontSize:22, fontWeight:700}}>€{eur(curr)}</div>
          <div style={{fontSize:11, color:'var(--text-4)', marginTop:2}}>este mes</div>
        </div>
        {delta !== null && (
          <div style={{fontSize:12, fontWeight:600, color: delta >= 0 ? 'var(--ok)' : 'var(--danger)'}}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs mes anterior
          </div>
        )}
      </div>
    </div>
  )
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
  const active = PIPELINE_COLS.filter(c => !STAGES_CLOSED.includes(c))
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

// ── Modal de detalle de empleado (admin) ─────────────────────────
function EmpleadoDetalleModal({ empleado, data, onClose }) {
  const [tab, setTab] = useState('leads')
  const { leads = [], tasks = [], proyectos = [], updateTask } = data || {}
  const ini = empleado.iniciales

  const misLeads     = leads.filter(l => l.responsable === ini).sort((a,b) =>
    STAGES_CLOSED.includes(a.estado) && !STAGES_CLOSED.includes(b.estado) ? 1 : -1
  )
  const misTareas    = tasks.filter(t => t.resp === ini).sort((a,b) => {
    const ga = effectiveGroup(a), gb = effectiveGroup(b)
    const order = ['vencida','hoy','mañana','semana']
    return (order.indexOf(ga) - order.indexOf(gb)) || (a.done ? 1 : -1)
  })
  const misProyectos = proyectos.filter(p => p.resp === ini)

  const activos    = misLeads.filter(l => !STAGES_CLOSED.includes(l.estado))
  const cerrados   = misLeads.filter(l => l.estado === STAGE.COBRADO)
  const montoGen   = cerrados.reduce((a,l) => a + (l.monto||0), 0)
  const pipelineV  = activos.filter(l => STAGES_VALOR.includes(l.estado)).reduce((a,l) => a + (l.monto||0), 0)
  const pendTareas = misTareas.filter(t => !t.done)

  return (
    <>
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:950,backdropFilter:'blur(5px)'}} onClick={onClose}/>
      <div style={{
        position:'fixed', top:'4%', left:'50%', transform:'translateX(-50%)',
        width:'min(900px,96vw)', maxHeight:'92vh',
        background:'var(--surface-1)', border:'1px solid var(--line-2)',
        borderRadius:20, boxShadow:'0 40px 100px rgba(0,0,0,0.85)',
        zIndex:951, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:16, padding:'20px 24px', borderBottom:'1px solid var(--line-1)', flexShrink:0, flexWrap:'wrap', rowGap:12}}>
          <div className="avatar" style={{width:48, height:48, fontSize:17, borderRadius:14, flexShrink:0}}>{empleado.iniciales}</div>
          <div style={{flex:1, minWidth:120}}>
            <div style={{fontSize:18, fontWeight:700}}>{empleado.nombre}</div>
            <div style={{fontSize:12, color:'var(--text-3)', marginTop:2}}>
              <span className={`chip ${empleado.rol==='Admin'?'blue':'gray'}`} style={{fontSize:10}}><span className="dot"/>{empleado.rol}</span>
              {empleado.email && <span style={{marginLeft:8}}>{empleado.email}</span>}
            </div>
          </div>
          <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:700, color:'var(--ok)'}}>€{eur(montoGen)}</div>
              <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:2}}>generado total</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:700, color:'var(--brand-2)'}}>€{eur(pipelineV)}</div>
              <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:2}}>en pipeline</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:700}}>{activos.length}</div>
              <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:2}}>leads activos</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:700, color: pendTareas.length > 0 ? 'var(--warn)' : 'var(--ok)'}}>{pendTareas.length}</div>
              <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:2}}>tareas pend.</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:22, fontWeight:700}}>{misProyectos.filter(p=>p.estado!=='Cerrado').length}</div>
              <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:2}}>proyectos</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{flexShrink:0, marginLeft:8}}><I.Close size={16}/></button>
        </div>

        {/* Tabs */}
        <div style={{padding:'12px 24px 0', flexShrink:0, borderBottom:'1px solid var(--line-1)'}}>
          <div className="segmented">
            <button className={tab==='leads'?'active':''} onClick={()=>setTab('leads')}>Leads ({misLeads.length})</button>
            <button className={tab==='tareas'?'active':''} onClick={()=>setTab('tareas')}>Tareas ({misTareas.length})</button>
            <button className={tab==='proyectos'?'active':''} onClick={()=>setTab('proyectos')}>Proyectos ({misProyectos.length})</button>
          </div>
        </div>

        {/* Content */}
        <div style={{overflowY:'auto', flex:1, padding:'16px 24px'}}>
          {tab === 'leads' && (
            <div style={{overflowX:'auto'}}>
              <table className="table">
                <thead>
                  <tr><th>Empresa</th><th>Servicio</th><th>Estado</th><th>Temp</th><th style={{textAlign:'right'}}>Importe</th><th>Próximo paso</th></tr>
                </thead>
                <tbody>
                  {misLeads.length === 0
                    ? <tr><td colSpan={6} style={{textAlign:'center', color:'var(--text-4)', padding:'32px 0'}}>Sin leads asignados</td></tr>
                    : misLeads.map(l => {
                      const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                      return (
                        <tr key={l.id}>
                          <td>
                            <div className="primary">{l.empresa}</div>
                            <div className="muted" style={{fontSize:11, marginTop:2}}>{[l.sector, l.ciudad].filter(Boolean).join(' · ')}</div>
                          </td>
                          <td className="muted">{l.servicio}</td>
                          <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                          <td style={{fontSize:16}}>{l.temp==='hot'?'🔥':l.temp==='warm'?'☀️':'❄️'}</td>
                          <td className="mono" style={{textAlign:'right'}}>€{eur(l.monto||0)}</td>
                          <td className="muted small">{l.next || '—'}</td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
            </div>
          )}

          {tab === 'tareas' && (
            <div>
              {misTareas.length === 0
                ? <div style={{textAlign:'center', color:'var(--text-4)', padding:'32px 0'}}>Sin tareas asignadas</div>
                : misTareas.map(t => {
                  const g = effectiveGroup(t)
                  const isVencida = g === 'vencida'
                  return (
                    <div key={t.id} className="task">
                      <div className={`check ${t.done?'done':''}`} style={{cursor:'pointer'}}
                        onClick={() => updateTask?.(t.id, { done: !t.done })}>
                        {t.done && <I.Check size={12} stroke={2.4}/>}
                      </div>
                      <div style={{minWidth:0, flex:1}}>
                        <div className="title" style={{
                          textDecoration: t.done ? 'line-through' : 'none',
                          color: t.done ? 'var(--text-3)' : isVencida ? 'var(--danger)' : 'var(--text-0)',
                        }}>{t.title}</div>
                        <div className="sub">{[t.cliente, t.due_date].filter(Boolean).join(' · ')}</div>
                      </div>
                      {isVencida && !t.done && <span className="chip red"><span className="dot"/>Vencida</span>}
                      {g === 'hoy'  && !t.done && <span className="chip amber"><span className="dot"/>Hoy</span>}
                      <span className={`chip ${t.prio==='alta'?'red':t.prio==='media'?'amber':'gray'}`}><span className="dot"/>{t.prio||'—'}</span>
                    </div>
                  )
                })
              }
            </div>
          )}

          {tab === 'proyectos' && (
            <div>
              {misProyectos.length === 0
                ? <div style={{textAlign:'center', color:'var(--text-4)', padding:'32px 0'}}>Sin proyectos asignados</div>
                : misProyectos.map(p => (
                  <div key={p.id} className="task">
                    <div style={{width:32, height:32, borderRadius:8, background:'rgba(45,107,255,0.1)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--brand-2)', flexShrink:0}}>
                      <I.Projects size={15}/>
                    </div>
                    <div style={{minWidth:0, flex:1}}>
                      <div className="title">{p.cliente}</div>
                      <div className="sub">{[p.servicio, p.estado].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {p.ajustes > 0 && <span className="chip amber"><span className="dot"/>{p.ajustes} ajuste{p.ajustes>1?'s':''}</span>}
                      <div className="mono" style={{fontSize:12, color:'var(--text-3)'}}>{p.progreso||0}%</div>
                      <div style={{width:60, height:5, borderRadius:3, background:'rgba(255,255,255,0.07)', overflow:'hidden'}}>
                        <div style={{width:`${p.progreso||0}%`, height:'100%', background:'var(--brand)', borderRadius:3}}/>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Sección Equipo (admin) ────────────────────────────────────────
function EquipoSection({ usuarios, data, onSelect }) {
  const { leads = [], tasks = [], proyectos = [] } = data || {}

  const stats = usuarios.map(u => {
    const ini = u.iniciales
    const activos    = leads.filter(l => l.responsable === ini && !STAGES_CLOSED.includes(l.estado))
    const cerrados   = leads.filter(l => l.responsable === ini && l.estado === STAGE.COBRADO)
    const pendTareas = tasks.filter(t => t.resp === ini && !t.done)
    const tareasHoy  = pendTareas.filter(t => ['hoy','vencida'].includes(effectiveGroup(t)))
    const proyActivos = proyectos.filter(p => p.resp === ini && p.estado !== 'Cerrado')
    const montoGen   = cerrados.reduce((a,l) => a + (l.monto||0), 0)
    const pipelineV  = activos.filter(l => STAGES_VALOR.includes(l.estado)).reduce((a,l) => a + (l.monto||0), 0)
    return { u, activos, cerrados, pendTareas, tareasHoy, proyActivos, montoGen, pipelineV }
  })

  return (
    <div className="card" style={{marginBottom:16}}>
      <div className="card-head">
        <h3>Equipo</h3>
        <span className="sub">· {usuarios.length} miembro{usuarios.length!==1?'s':''}</span>
      </div>
      {usuarios.length === 0 ? (
        <div style={{textAlign:'center', color:'var(--text-4)', fontSize:13, padding:'24px 0'}}>
          Sin miembros — añade desde Ajustes → Usuarios
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))', gap:12, paddingTop:4}}>
          {stats.map(({ u, activos, pendTareas, tareasHoy, proyActivos, montoGen, pipelineV }) => (
            <div key={u.id}
              style={{border:'1px solid var(--line-2)', borderRadius:12, padding:'16px', background:'var(--surface-2)', cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s'}}
              onClick={() => onSelect(u)}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--brand)'; e.currentTarget.style.boxShadow='0 0 0 1px var(--brand-glow)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--line-2)'; e.currentTarget.style.boxShadow='' }}
            >
              <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
                <div className="avatar" style={{width:38, height:38, fontSize:13, borderRadius:10, flexShrink:0}}>{u.iniciales}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.nombre}</div>
                  <div style={{fontSize:10.5, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.05em'}}>{u.rol}</div>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10}}>
                <div style={{background:'rgba(45,107,255,0.07)', borderRadius:8, padding:'8px 10px'}}>
                  <div style={{fontSize:20, fontWeight:700, color:'var(--brand-2)', lineHeight:1}}>{activos.length}</div>
                  <div style={{fontSize:10, color:'var(--text-4)', marginTop:3}}>leads activos</div>
                </div>
                <div style={{background:'rgba(62,207,142,0.07)', borderRadius:8, padding:'8px 10px'}}>
                  <div style={{fontSize:14, fontWeight:700, color:'var(--ok)', lineHeight:1.2}}>€{eur(montoGen)}</div>
                  <div style={{fontSize:10, color:'var(--text-4)', marginTop:3}}>generado</div>
                </div>
              </div>

              <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:12, minHeight:22}}>
                {tareasHoy.length > 0 && <span className="chip amber" style={{fontSize:10.5}}><span className="dot"/>{tareasHoy.length} tarea{tareasHoy.length>1?'s':''} hoy</span>}
                {proyActivos.length > 0 && <span className="chip blue" style={{fontSize:10.5}}><span className="dot"/>{proyActivos.length} proy.</span>}
                {pipelineV > 0 && <span style={{fontSize:10.5, color:'var(--text-3)', fontFamily:'var(--font-mono)'}}>€{eur(pipelineV)} en juego</span>}
                {activos.length === 0 && pendTareas.length === 0 && <span style={{fontSize:10.5, color:'var(--text-4)'}}>Sin actividad reciente</span>}
              </div>

              <button className="btn sm ghost" style={{width:'100%', justifyContent:'center', fontSize:12, pointerEvents:'none'}}>
                Ver detalle →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────
export default function Dashboard({ role, setPage, openQuick, data, currentUser }) {
  const { leads = [], tasks = [], proyectos = [], clientes = [], gastos = [], cobros = [], actividades = [], updateTask, showToast } = data || {}
  const actMap = actividades.reduce((m, a) => { (m[a.lead_id] || (m[a.lead_id] = [])).push(a); return m }, {})
  const [chartPeriod, setChartPeriod] = useState('mes')
  const [usuarios, setUsuarios] = useState([])
  const [selectedEmpleado, setSelectedEmpleado] = useState(null)

  useEffect(() => {
    if (role === 'admin') {
      supabase.from('usuarios').select('*').eq('estado', 'activo').order('nombre').then(({ data: u }) => {
        if (u) setUsuarios(u)
      })
    }
  }, [role])

  // ── computed ────────────────────────────────────────────────
  const ingresosMes   = cobros.filter(c => c.pagado).reduce((a,c) => a + (c.monto||0), 0)
  const pendientes    = cobros.filter(c => !c.pagado)
  const pendientesMes = pendientes.reduce((a,c) => a + (c.monto||0), 0)
  const gastosMes     = gastos.reduce((a,g) => a + (g.monto||0), 0)
  const totalFacturado = cobros.filter(c => c.pagado).reduce((a,c) => a + (c.monto||0), 0)
  const margen        = (ingresosMes + pendientesMes) > 0
    ? Math.round((ingresosMes - gastosMes) / (ingresosMes + pendientesMes) * 100)
    : (gastosMes === 0 ? 100 : 0)

  const mrr = cobros.filter(c => c.recurrente && !c.pagado).reduce((acc, c) => {
    const freq = c.frecuencia || 'Mensual'
    const factor = freq === 'Semanal' ? 4.33 : freq === 'Trimestral' ? 1/3 : 1
    return acc + (c.monto || 0) * factor
  }, 0)
  const clientesRecurrentesN = clientes.filter(c => c.tipo === 'Recurrente' || c.estado === 'Recurrente').length

  const leadsActivos   = leads.filter(l => !STAGES_CLOSED.includes(l.estado))
  const leadsCalientes = leads.filter(l => l.temp === 'hot' && !STAGES_CLOSED.includes(l.estado))
  const leadesTibios   = leads.filter(l => l.temp === 'warm' && !STAGES_CLOSED.includes(l.estado))
  const urgentes       = tasks.filter(t => t.prio === 'alta' && !t.done && ['hoy','vencida'].includes(effectiveGroup(t)))

  const clientesActivos    = clientes.length
  const clientesEnCurso    = clientes.filter(c => c.estado === 'En curso').length
  const clientesRecurrentes = clientes.filter(c => c.estado === 'Recurrente').length
  const clientesAjustes    = clientes.filter(c => c.ajustes > 0).length

  const pipelineTotal = leadsActivos.filter(l => STAGES_VALOR.includes(l.estado)).reduce((a,l) => a + (l.monto||0), 0)

  // Para empleado: cuánto ha generado él mismo
  const myIni = currentUser?.iniciales || ''
  const misCierres = leads.filter(l => l.responsable === myIni && l.estado === STAGE.COBRADO)
  const miMontoGen = misCierres.reduce((a,l) => a + (l.monto||0), 0)

  const seguimientos = leads
    .filter(l => l.next && l.next !== '—' && !STAGES_CLOSED.includes(l.estado))
    .slice(0, 4)
    .map(l => ({
      name: l.empresa,
      type: /llam/i.test(l.next) ? 'Llamada' : /reuni/i.test(l.next) ? 'Reunión' : 'Seguimiento',
      when: l.next,
      who: l.responsable,
    }))

  // ── greeting ────────────────────────────────────────────────
  const nombre = currentUser?.nombre?.split(' ')[0] || (role === 'admin' ? 'Admin' : 'Empleado')

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
      const parts = []
      const tareasHoy = tasks.filter(t => effectiveGroup(t) === 'hoy' && !t.done).length
      if (tareasHoy > 0) parts.push(`${tareasHoy} tarea${tareasHoy!==1?'s':''} para hoy`)
      if (leadsActivos.length > 0) parts.push(`${leadsActivos.length} lead${leadsActivos.length!==1?'s':''} activo${leadsActivos.length!==1?'s':''}`)
      return parts.length ? parts.join(' · ') : 'Sin tareas ni leads pendientes.'
    }
    const parts = []
    if (ingresosMes > 0) parts.push(`€${eur(ingresosMes)} cobrados este mes`)
    if (pendientes.length > 0) parts.push(`${pendientes.length} factura${pendientes.length!==1?'s':''} pendiente${pendientes.length!==1?'s':''}`)
    if (gastosMes > 0) parts.push(`€${eur(gastosMes)} en gastos`)
    return parts.length ? parts.join(' · ') : 'Empieza añadiendo tus primeros leads y clientes.'
  })()

  const pagadosN    = cobros.filter(c => c.pagado).length
  const pendientesN = cobros.filter(c => !c.pagado).length
  const factFoot    = `${pagadosN} cobro${pagadosN!==1?'s':''}${pendientesN > 0 ? ' · ' + pendientesN + ' pendiente' + (pendientesN!==1?'s':'') : ''}`

  return (
    <div className="fade-in">
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-welcome">
            <p className="kicker">{greeting}, {nombre}</p>
            {heroTitle}
            <p>{fechaHoy} · {heroSub}</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={openQuick}><I.Plus size={14}/> Crear lead</button>
              {role === 'admin' && <>
                <button className="btn" onClick={() => setPage('finanzas')}><I.Receipt size={14}/> Registrar cobro</button>
                <button className="btn" onClick={() => setPage('finanzas')}><I.ArrowDn size={14}/> Registrar gasto</button>
              </>}
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
              <div className="mini"><div className="label">Mis leads activos</div><div className="value">{leadsActivos.length}</div><div className="trend" style={{color:'var(--brand-3)'}}>{leadsCalientes.length} calientes</div></div>
              <div className="mini"><div className="label">Mis tareas hoy</div><div className="value">{tasks.filter(t=>effectiveGroup(t)==='hoy'&&!t.done).length}</div><div className="trend" style={{color: urgentes.length>0?'var(--warn)':'var(--ok)'}}>{urgentes.length>0?`${urgentes.length} urgente${urgentes.length!==1?'s':''}`:'Sin urgentes'}</div></div>
              <div className="mini"><div className="label">Mis proyectos</div><div className="value">{proyectos.filter(p=>p.estado!=='Cerrado').length}</div><div className="trend" style={{color:'var(--text-3)'}}>{proyectos.filter(p=>p.ajustes>0).length} con ajustes</div></div>
              <div className="mini"><div className="label">He generado</div><div className="value"><span style={{fontSize:14, color:'var(--text-3)'}}>€</span>{eur(miMontoGen)}</div><div className="trend trend-up">{misCierres.length} cierre{misCierres.length!==1?'s':''} totales</div></div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI grid (admin) ── */}
      {role === 'admin' && (
        <div className="stat-grid">
          <div className="stat" style={{'--stat-glow':'rgba(45,107,255,0.22)','--stat-dot':'#4F8BFF'}}>
            <div className="label"><span className="dot"/>Total facturado</div>
            <div className="value"><span className="currency">€</span>{eur(totalFacturado)}</div>
            <div className="foot">{factFoot}</div>
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

      {/* ── Alerta leads calientes sin contacto ── */}
      {(() => {
        const hotLeads = leads.filter(l => l.temp === 'hot' && !STAGES_CLOSED.includes(l.estado))
        const visibles = role === 'admin' ? hotLeads : hotLeads.filter(l => l.responsable === myIni)
        const sinContacto = visibles.filter(l => {
          const acts = actMap[l.id] || []
          const sorted = [...acts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
          const ref = sorted.length ? new Date(sorted[0].created_at) : (l.created_at ? new Date(l.created_at) : new Date())
          return Math.floor((Date.now() - ref) / 86400000) >= 5
        })
        if (!sinContacto.length) return null
        return (
          <div className="card" style={{marginBottom:16, borderColor:'rgba(255,90,106,0.3)'}}>
            <div className="card-head">
              <h3>🔥 Leads calientes sin contacto reciente</h3>
              <span className="sub">· {sinContacto.length} lead{sinContacto.length!==1?'s':''}</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver pipeline <I.ChevronR size={12}/></button></div>
            </div>
            <div>
              {sinContacto.map(l => {
                const acts = actMap[l.id] || []
                const sorted = [...acts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
                const ref = sorted.length ? new Date(sorted[0].created_at) : (l.created_at ? new Date(l.created_at) : new Date())
                const dias = Math.floor((Date.now() - ref) / 86400000)
                return (
                  <div key={l.id} className="task">
                    <div style={{width:30,height:30,borderRadius:8,background:'rgba(255,90,106,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#FF5A6A',flexShrink:0,fontSize:14}}>🔥</div>
                    <div style={{minWidth:0,flex:1}}>
                      <div className="title">{l.empresa}</div>
                      <div className="sub">{l.servicio} · {l.estado}{role === 'admin' ? ` · resp. ${l.responsable}` : ''}</div>
                    </div>
                    <span className="chip red"><span className="dot"/>{dias}d sin contacto</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Alerta cobros próximos (admin) ── */}
      {role === 'admin' && (() => {
        const hoy = new Date(); hoy.setHours(0,0,0,0)
        const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7)
        const proximos = cobros
          .filter(c => {
            if (c.pagado || !c.vence) return false
            const vd = new Date(c.vence + 'T00:00:00')
            return vd >= hoy && vd <= en7
          })
          .sort((a,b) => a.vence.localeCompare(b.vence))
        if (!proximos.length) return null
        return (
          <div className="card" style={{marginBottom:16, borderColor:'rgba(255,181,71,0.3)'}}>
            <div className="card-head">
              <h3>💰 Cobros que vencen esta semana</h3>
              <span className="sub">· {proximos.length} cobro{proximos.length!==1?'s':''}</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('finanzas')}>Ver finanzas <I.ChevronR size={12}/></button></div>
            </div>
            <div>
              {proximos.map(c => {
                const vd = new Date(c.vence + 'T00:00:00')
                const dias = Math.floor((vd - hoy) / 86400000)
                const label = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias}d`
                return (
                  <div key={c.id} className="task">
                    <div style={{width:30,height:30,borderRadius:8,background:'rgba(255,181,71,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:'#FFB547',flexShrink:0,fontSize:14}}>💰</div>
                    <div style={{minWidth:0,flex:1}}>
                      <div className="title">{c.cliente}</div>
                      <div className="sub">{c.concepto}</div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3,flexShrink:0}}>
                      <span style={{fontSize:13,fontWeight:700,color:'var(--text-0)'}}>€{eur(c.monto)}</span>
                      <span className={`chip ${dias === 0 ? 'red' : 'amber'}`}><span className="dot"/>{label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Equipo (admin) ── */}
      {role === 'admin' && (
        <EquipoSection usuarios={usuarios} data={data} onSelect={setSelectedEmpleado} />
      )}

      {/* ── Charts + Tareas hoy ── */}
      <div className="grid-main-side">
        {role === 'admin' ? (
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
        ) : (
          <div className="card">
            <div className="card-head">
              <h3>Mi pipeline comercial</h3>
              <span className="sub">· €{eur(pipelineTotal)} en juego</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver tablero <I.ChevronR size={12}/></button></div>
            </div>
            <div className="card-body"><PipelineFunnel leads={leads} /></div>
          </div>
        )}
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
        {role === 'admin' ? (
          <div className="card">
            <div className="card-head">
              <h3>Pipeline comercial</h3>
              <span className="sub">· €{eur(pipelineTotal)} en juego</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Abrir tablero <I.ChevronR size={12}/></button></div>
            </div>
            <div className="card-body"><PipelineFunnel leads={leads} /></div>
          </div>
        ) : (
          <div className="card">
            <div className="card-head">
              <h3>Leads recientes</h3>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver todos</button></div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="table">
                <thead><tr><th>Empresa</th><th>Servicio</th><th>Estado</th><th style={{textAlign:'right'}}>Importe</th></tr></thead>
                <tbody>
                  {leads.slice(0,5).map(l => {
                    const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                    return (
                      <tr key={l.id}>
                        <td><div className="primary">{l.empresa}</div></td>
                        <td className="muted">{l.servicio}</td>
                        <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                        <td className="mono" style={{textAlign:'right'}}>€{eur(l.monto||0)}</td>
                      </tr>
                    )
                  })}
                  {leads.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', color:'var(--text-4)', padding:'24px 0'}}>Sin leads — crea el primero</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div>
          {role === 'admin' && (
            <div className="card" style={{marginBottom:16}}>
              <div className="card-head"><h3>Ingresos · últimos 3 meses</h3></div>
              <div className="card-body"><MrrTrend cobros={cobros} /></div>
            </div>
          )}
          <div className="card">
            <div className="card-head"><h3>Ajustes pendientes</h3>
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
      </div>

      <div style={{height:16}}/>

      {/* ── Señales por cobrar (admin) ── */}
      {role === 'admin' && (() => {
        const señalLeads = leads.filter(l => l.estado === STAGE.SEÑAL)
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

      {/* ── Cuotas recurrentes vencidas (admin) ── */}
      {role === 'admin' && (() => {
        const today = new Date(); today.setHours(0,0,0,0)
        const recVencidos = cobros.filter(c => c.recurrente && !c.pagado && c.vence && new Date(c.vence + 'T00:00:00') < today)
        if (!recVencidos.length) return null
        return (
          <div className="card" style={{marginBottom:16, borderColor:'rgba(255,181,71,0.3)'}}>
            <div className="card-head">
              <h3>Cuotas recurrentes vencidas</h3>
              <span className="sub">· {recVencidos.length} sin cobrar</span>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('finanzas')}>Ver finanzas <I.ChevronR size={12}/></button></div>
            </div>
            <div>
              {recVencidos.map(c => {
                const dias = Math.floor((today - new Date(c.vence + 'T00:00:00')) / 86400000)
                return (
                  <div key={c.id} className="task">
                    <div style={{width:30, height:30, borderRadius:8, background:'rgba(255,181,71,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#FFB547', flexShrink:0}}>
                      <I.Receipt size={14}/>
                    </div>
                    <div style={{minWidth:0, flex:1}}>
                      <div className="title">{c.cliente}</div>
                      <div className="sub">{c.concepto} · Venció hace {dias}d · €{eur(c.monto||0)}</div>
                    </div>
                    <button className="btn sm" style={{fontSize:11}}
                      onClick={() => { data.updateCobro?.(c.id, { pagado: true, vencida: false }); showToast?.(`Cobro de ${c.cliente} marcado como pagado`) }}>
                      ✓ Cobrar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Tabla leads recientes (admin) ── */}
      {role === 'admin' && (
        <div className="grid-main-side">
          <div className="card">
            <div className="card-head">
              <h3>Leads recientes</h3>
              <div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Ver todos</button></div>
            </div>
            <div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
              <table className="table">
                <thead><tr><th>Empresa</th><th>Resp.</th><th>Servicio</th><th>Estado</th><th>Próximo paso</th><th style={{textAlign:'right'}}>Importe</th></tr></thead>
                <tbody>
                  {leads.slice(0,5).map(l => {
                    const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                    return (
                      <tr key={l.id}>
                        <td><div className="primary">{l.empresa}</div><div className="muted" style={{fontSize:11.5, marginTop:2}}>{l.sector} · {l.ciudad}</div></td>
                        <td><div className="avatar sm" style={{width:26,height:26,fontSize:10}}>{l.responsable}</div></td>
                        <td className="muted">{l.servicio}</td>
                        <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                        <td className="muted small">{l.next}</td>
                        <td className="mono" style={{textAlign:'right'}}>€{eur(l.monto || 0)}</td>
                      </tr>
                    )
                  })}
                  {leads.length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center', color:'var(--text-4)', padding:'24px 0'}}>Sin leads — crea tu primero con el botón de arriba</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
      )}

      {/* ── Modal detalle empleado ── */}
      {selectedEmpleado && (
        <EmpleadoDetalleModal
          empleado={selectedEmpleado}
          data={data}
          onClose={() => setSelectedEmpleado(null)}
        />
      )}
    </div>
  )
}
