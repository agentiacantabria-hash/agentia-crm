import React from 'react'
import { I } from './Icons'

export function Tareas({ data }) {
  const { tasks = [], updateTask } = data || {}

  const toggle = async (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    updateTask?.(id, { done: !task.done })
  }

  const groups = [
    { key:'vencida', label:'Vencidas',           color:'var(--danger)', icon:I.Flame },
    { key:'hoy',     label:'Hoy · 23 abr',       color:'var(--brand)',  icon:I.Target },
    { key:'mañana',  label:'Mañana · 24 abr',    color:'var(--violet)', icon:I.Calendar },
    { key:'semana',  label:'Esta semana',         color:'var(--text-3)', icon:I.Clock },
  ]

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">No pierdas el hilo operativo · {tasks.filter(t=>!t.done).length} pendientes</p>
        </div>
        <div className="page-actions">
          <div className="segmented"><button className="active">Todos</button><button>Mías</button><button>Equipo</button></div>
          <button className="btn"><I.Filter size={13}/> Tipo</button>
          <button className="btn primary"><I.Plus size={13}/> Nueva tarea</button>
        </div>
      </div>

      <div className="grid-main-side">
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {groups.map(g => {
            const list = tasks.filter(t => t.when_group === g.key)
            if (!list.length) return null
            return (
              <div className="card" key={g.key}>
                <div className="card-head">
                  <div style={{width:28, height:28, borderRadius:7, background:`color-mix(in oklab, ${g.color} 18%, transparent)`, color:g.color, display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
                    <g.icon size={14}/>
                  </div>
                  <h3>{g.label}</h3>
                  <span className="sub">· {list.length}</span>
                </div>
                <div>
                  {list.map(t=>(
                    <div key={t.id} className={`task ${t.done?'done':''}`}>
                      <div className={`check ${t.done?'done':''}`} onClick={()=>toggle(t.id)}>{t.done && <I.Check size={12} stroke={2.4}/>}</div>
                      <div style={{minWidth:0, flex:1}}>
                        <div className="title">{t.title}</div>
                        <div className="sub">{t.cliente} · {t.time} · <span style={{color:'var(--text-4)'}}>{t.tag}</span></div>
                      </div>
                      <div className="meta">
                        <span className={`chip ${t.prio==='alta'?'red':t.prio==='media'?'amber':'gray'}`}><span className="dot"/>{t.prio}</span>
                        <div className="avatar xs">{t.resp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div className="card">
            <div className="card-head"><h3>Resumen operativo</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:12}}>
              {[
                {l:'Vencidas', v:tasks.filter(t=>t.when_group==='vencida'&&!t.done).length, c:'#FF5A6A'},
                {l:'Hoy', v:tasks.filter(t=>t.when_group==='hoy'&&!t.done).length, c:'#4F8BFF'},
                {l:'Mañana', v:tasks.filter(t=>t.when_group==='mañana'&&!t.done).length, c:'#9A7BFF'},
                {l:'Completadas hoy', v:tasks.filter(t=>t.done&&t.when_group==='hoy').length, c:'#3ECF8E'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:6, height:24, borderRadius:3, background:r.c, boxShadow:`0 0 10px ${r.c}66`}}/>
                  <div style={{flex:1, color:'var(--text-2)'}}>{r.l}</div>
                  <div className="mono" style={{fontSize:18, fontWeight:600}}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Clientes que requieren acción</h3></div>
            <div>
              {[
                {n:'Clínica Marbella', why:'Esperando respuesta hace 3 días', c:'#FF5A6A'},
                {n:'Óptica Horizonte', why:'3 ajustes pendientes', c:'#FFB547'},
                {n:'Aceite del Sur', why:'Caso de éxito prometido', c:'#4F8BFF'},
              ].map((r,i)=>(
                <div key={i} className="task">
                  <div style={{width:8, height:8, borderRadius:'50%', background:r.c, boxShadow:`0 0 8px ${r.c}`, flexShrink:0}}/>
                  <div><div className="title">{r.n}</div><div className="sub">{r.why}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Proyectos({ data }) {
  const proyectos = data?.proyectos || []
  const estadoChip = {
    'Pendiente':'gray', 'En curso':'blue', 'En revisión':'violet',
    'Pagado':'green', 'Pagado · ajustes':'amber', 'Cerrado':'gray',
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Proyectos y entregas</h1>
          <p className="page-subtitle">Control de lo que está en marcha · ajustes post-pago vigilados</p>
        </div>
        <div className="page-actions">
          <div className="segmented"><button className="active">Todos</button><button>En curso</button><button>Con ajustes</button><button>Cerrados</button></div>
          <button className="btn primary"><I.Plus size={13}/> Nuevo proyecto</button>
        </div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div className="stat" style={{'--stat-glow':'rgba(45,107,255,0.18)','--stat-dot':'#4F8BFF'}}><div className="label"><span className="dot"/>En curso</div><div className="value">{proyectos.filter(p=>p.estado==='En curso').length}</div><div className="foot">proyectos activos</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(255,181,71,0.18)','--stat-dot':'#FFB547'}}><div className="label"><span className="dot"/>Pagado · con ajustes</div><div className="value">{proyectos.filter(p=>p.ajustes>0).length}</div><div className="foot">{proyectos.reduce((a,p)=>a+(p.ajustes||0),0)} ajustes totales</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(154,123,255,0.18)','--stat-dot':'#9A7BFF'}}><div className="label"><span className="dot"/>En revisión</div><div className="value">{proyectos.filter(p=>p.estado==='En revisión').length}</div><div className="foot">esperando feedback</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(62,207,142,0.18)','--stat-dot':'#3ECF8E'}}><div className="label"><span className="dot"/>Cerrados mes</div><div className="value">{proyectos.filter(p=>p.estado==='Cerrado').length}</div><div className="foot">entregas firmadas</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Proyectos activos</h3><div className="right"><span className="sub">{proyectos.length} proyectos</span></div></div>
        <div>
          {proyectos.map(p=>(
            <div className="project-item" key={p.id}>
              <div><div className="title">{p.cliente}</div><div className="service">{p.servicio} · resp. {p.resp}</div></div>
              <div><span className={`chip ${estadoChip[p.estado]||'gray'}`}><span className="dot"/>{p.estado}</span></div>
              <div>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div className="progress" style={{flex:1}}>
                    <div className={`bar ${p.estado==='Pagado · ajustes'?'warn':p.estado==='Cerrado'?'ok':''}`} style={{width:`${p.progreso}%`}}/>
                  </div>
                  <span className="mono small" style={{color:'var(--text-3)', width:32}}>{p.progreso}%</span>
                </div>
              </div>
              <div>{p.ajustes>0 ? <span className="pend"><I.Bolt size={10}/> {p.ajustes} ajuste{p.ajustes>1?'s':''}</span> : <span className="muted small">sin pendientes</span>}</div>
              <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'flex-end'}}>
                <span className="small" style={{color: p.pago==='Pagado'?'var(--ok)':p.pago==='Pendiente'?'var(--warn)':'var(--text-2)'}}>{p.pago}</span>
                <button className="icon-btn" style={{width:28, height:28}}><I.ChevronR size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
