import React from 'react'
import { I } from './Icons'
import { STATE_COLORS, eur } from './data'

function RevenueChart() {
  const data = [6400, 7200, 8100, 9800, 12500, 14820]
  const labels = ['Nov','Dic','Ene','Feb','Mar','Abr']
  const W=720, H=220, P={l:40,r:12,t:16,b:26}
  const max = 16000
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
        <text key={i} x={P.l-6} y={P.t + r*(H-P.t-P.b)+3} textAnchor="end" fontSize="9" fontFamily="JetBrains Mono" fill="#6B7590">€{Math.round(max*(1-r)/1000)}k</text>
      ))}
      <path d={area} fill="url(#gArea)"/>
      <polyline points={pts} fill="none" stroke="url(#gLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v,i)=>(
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.4" fill="#0A0E17" stroke="#4F8BFF" strokeWidth="2"/>
          <text x={x(i)} y={H-8} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill="#6B7590">{labels[i]}</text>
        </g>
      ))}
      <circle cx={x(5)} cy={y(14820)} r="8" fill="#2D6BFF" opacity="0.25"/>
      <text x={x(5)} y={y(14820)-12} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono" fill="#8FB3FF">€14.820</text>
    </svg>
  )
}

function PipelineFunnel() {
  const stages = [
    { label:'Nuevo',             n:4, amount:5200, color:'#6B7590' },
    { label:'Contactado',        n:3, amount:4800, color:'#4F8BFF' },
    { label:'Interesado',        n:2, amount:3600, color:'#9A7BFF' },
    { label:'Propuesta enviada', n:3, amount:7900, color:'#FFB547' },
    { label:'En seguimiento',    n:2, amount:2700, color:'#7BA8FF' },
  ]
  const max = Math.max(...stages.map(s=>s.amount))
  return (
    <div style={{display:'flex', flexDirection:'column', gap:10}}>
      {stages.map((s,i)=>(
        <div key={i} style={{display:'grid', gridTemplateColumns:'150px 1fr 90px', alignItems:'center', gap:12}}>
          <div className="pipe-tag" style={{'--color': s.color}}><span className="box"/>{s.label}</div>
          <div style={{position:'relative', height:28, background:'rgba(255,255,255,0.03)', borderRadius:7, overflow:'hidden'}}>
            <div style={{width:`${s.amount/max*100}%`, height:'100%', background:`linear-gradient(90deg, ${s.color}33, ${s.color}cc)`, borderRight:`2px solid ${s.color}`, boxShadow:`0 0 16px ${s.color}44`, transition:'width 0.6s'}}/>
            <div style={{position:'absolute', left:10, top:0, bottom:0, display:'flex', alignItems:'center', fontSize:12, color:'var(--text-1)', fontWeight:500}}>
              {s.n} oportunidades
            </div>
          </div>
          <div className="mono" style={{textAlign:'right', fontSize:12.5}}>€{eur(s.amount)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ role, setPage, openQuick, data }) {
  const { leads = [], tasks = [], proyectos = [] } = data || {}

  return (
    <div className="fade-in">
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-welcome">
            <p className="kicker">Buenos días, {role === 'admin' ? 'Lucía' : 'Andrés'}</p>
            <h1>Tienes <span style={{color:'var(--brand-2)'}}>3 tareas urgentes</span> y 2 leads calientes por cerrar.</h1>
            <p>Jueves 23 de abril · Todo va según plan este mes — ingresos +18% vs marzo.</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={openQuick}><I.Plus size={14}/> Crear lead</button>
              <button className="btn"><I.Receipt size={14}/> Registrar cobro</button>
              <button className="btn"><I.ArrowDn size={14}/> Registrar gasto</button>
              <button className="btn ghost"><I.Tasks size={14}/> Crear tarea</button>
            </div>
          </div>

          {role === 'admin' ? (
            <div className="hero-kpi">
              <div className="mini"><div className="label">Ingresos mes</div><div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> 14.820</div><div className="trend trend-up">↑ 18% vs marzo</div></div>
              <div className="mini"><div className="label">Cobros pendientes</div><div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> 5.300</div><div className="trend" style={{color:'var(--warn)'}}>3 facturas abiertas</div></div>
              <div className="mini"><div className="label">Gastos mes</div><div className="value"><span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>€</span> 1.240</div><div className="trend trend-down">↑ 6% — IA +€40</div></div>
              <div className="mini"><div className="label">Margen</div><div className="value">91<span style={{color:'var(--text-3)', fontSize:14, fontWeight:400}}>%</span></div><div className="trend trend-up">Saludable</div></div>
            </div>
          ) : (
            <div className="hero-kpi">
              <div className="mini"><div className="label">Mis leads</div><div className="value">8</div><div className="trend" style={{color:'var(--brand-3)'}}>2 calientes</div></div>
              <div className="mini"><div className="label">Tareas hoy</div><div className="value">4</div><div className="trend" style={{color:'var(--warn)'}}>1 urgente</div></div>
              <div className="mini"><div className="label">En proyecto</div><div className="value">5</div><div className="trend" style={{color:'var(--text-3)'}}>2 con ajustes</div></div>
              <div className="mini"><div className="label">Cerrados mes</div><div className="value">3</div><div className="trend trend-up">↑ récord personal</div></div>
            </div>
          )}
        </div>
      </div>

      {role === 'admin' && (
        <div className="stat-grid">
          <div className="stat" style={{'--stat-glow':'rgba(45,107,255,0.22)','--stat-dot':'#4F8BFF'}}><div className="label"><span className="dot"/>Ingresos totales</div><div className="value"><span className="currency">€</span>86.420</div><div className="foot"><span className="trend-up">+12%</span> YTD</div></div>
          <div className="stat" style={{'--stat-glow':'rgba(62,207,142,0.18)','--stat-dot':'#3ECF8E'}}><div className="label"><span className="dot"/>Clientes activos</div><div className="value">14</div><div className="foot">7 en curso · 5 recurrentes · 2 ajustes</div></div>
          <div className="stat" style={{'--stat-glow':'rgba(154,123,255,0.18)','--stat-dot':'#9A7BFF'}}><div className="label"><span className="dot"/>Leads nuevos</div><div className="value">{leads.filter(l=>!['Ganado','Perdido'].includes(l.estado)).length}</div><div className="foot"><span style={{color:'#FF9BA5'}}>●</span> 2 calientes, 3 tibios</div></div>
          <div className="stat" style={{'--stat-glow':'rgba(255,181,71,0.18)','--stat-dot':'#FFB547'}}><div className="label"><span className="dot"/>Gasto IA · mes</div><div className="value"><span className="currency">€</span>213</div><div className="foot">OpenAI €128 · Claude €85</div></div>
        </div>
      )}

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head"><h3>Ingresos últimos 6 meses</h3><span className="sub">· total €86.420</span><div className="right"><div className="segmented"><button>Semana</button><button className="active">Mes</button><button>Año</button></div></div></div>
          <div className="card-body"><RevenueChart /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Qué toca hoy</h3><div className="right"><button className="btn sm ghost" onClick={() => setPage('tareas')}>Ver todas <I.ChevronR size={12}/></button></div></div>
          <div>
            {tasks.filter(t => t.when_group === 'hoy').slice(0,4).map(t => (
              <div className="task" key={t.id}>
                <div className={`check ${t.done ? 'done' : ''}`}>{t.done && <I.Check size={12} stroke={2.4}/>}</div>
                <div style={{minWidth:0, flex:1}}>
                  <div className="title" style={{textDecoration: t.done?'line-through':'none', color: t.done?'var(--text-3)':'var(--text-0)'}}>{t.title}</div>
                  <div className="sub">{t.cliente} · {t.time}</div>
                </div>
                <span className={`chip ${t.prio==='alta'?'red':t.prio==='media'?'amber':'gray'}`}><span className="dot"/>{t.prio}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{height:16}}/>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head"><h3>Pipeline comercial</h3><span className="sub">· €24.200 en juego</span><div className="right"><button className="btn sm ghost" onClick={() => setPage('pipeline')}>Abrir tablero <I.ChevronR size={12}/></button></div></div>
          <div className="card-body"><PipelineFunnel /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Ajustes pendientes tras pago</h3><div className="right"><button className="btn sm ghost" onClick={() => setPage('proyectos')}>Ver todo</button></div></div>
          <div>
            {proyectos.filter(p => p.ajustes > 0).map(p => (
              <div key={p.id} className="task">
                <div style={{width:30, height:30, borderRadius:8, background:'rgba(255,181,71,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#FFB547', flexShrink:0}}><I.Bolt size={14}/></div>
                <div style={{minWidth:0, flex:1}}><div className="title">{p.cliente}</div><div className="sub">{p.servicio}</div></div>
                <span className="pend">{p.ajustes} ajuste{p.ajustes>1?'s':''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{height:16}}/>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head"><h3>Leads recientes</h3><div className="right"><button className="btn sm ghost" onClick={() => setPage('leads')}>Ver todos</button></div></div>
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
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head"><h3>Seguimientos próximos</h3></div>
          <div>
            {[
              {name:'Clínica Marbella', when:'Hoy · 11:30', who:'LP', type:'Llamada'},
              {name:'Estudio Nácar', when:'Mañana · 10:00', who:'LP', type:'Reunión'},
              {name:'Notaría Vega', when:'Vie · 09:30', who:'LP', type:'Seguimiento'},
              {name:'Gym Pulse', when:'30 abr', who:'AR', type:'Recordatorio'},
            ].map((s,i) => (
              <div key={i} className="task">
                <div style={{width:30, height:30, borderRadius:8, background:'rgba(45,107,255,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'var(--brand-2)', flexShrink:0}}>
                  {s.type==='Llamada'?<I.Phone size={14}/>:s.type==='Reunión'?<I.Calendar size={14}/>:<I.Clock size={14}/>}
                </div>
                <div style={{minWidth:0, flex:1}}><div className="title">{s.name}</div><div className="sub">{s.type} · {s.when}</div></div>
                <div className="avatar sm">{s.who}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
