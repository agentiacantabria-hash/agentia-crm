import React, { useState } from 'react'
import { I } from './Icons'
import { Modal, F } from './Modal'

const RESP = ['LP','AR']

// ── Tareas ───────────────────────────────────────────────────────

function TareaModal({ tarea, onClose, onSave }) {
  const isNew = !tarea?.id
  const [form, setForm] = useState(tarea || {
    title:'', cliente:'', when_group:'hoy', time:'', prio:'media', resp:'LP', tag:'Operativo', done:false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open title={isNew ? 'Nueva tarea' : 'Editar tarea'}
      onClose={onClose} onSave={() => onSave(form)} saveLabel={isNew ? 'Crear tarea' : 'Guardar'}>
      <F label="Título"><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus /></F>
      <div className="form-2col">
        <F label="Cliente"><input value={form.cliente||''} onChange={e => set('cliente', e.target.value)} placeholder="Ej: Clínica Marbella" /></F>
        <F label="Hora"><input value={form.time||''} onChange={e => set('time', e.target.value)} placeholder="14:00" /></F>
      </div>
      <div className="form-2col">
        <F label="Cuándo">
          <select value={form.when_group||'hoy'} onChange={e => set('when_group', e.target.value)}>
            <option value="vencida">Vencida</option>
            <option value="hoy">Hoy</option>
            <option value="mañana">Mañana</option>
            <option value="semana">Esta semana</option>
          </select>
        </F>
        <F label="Prioridad">
          <select value={form.prio||'media'} onChange={e => set('prio', e.target.value)}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </F>
      </div>
      <div className="form-2col">
        <F label="Responsable">
          <select value={form.resp||'LP'} onChange={e => set('resp', e.target.value)}>
            {RESP.map(r=><option key={r}>{r}</option>)}
          </select>
        </F>
        <F label="Etiqueta">
          <select value={form.tag||'Operativo'} onChange={e => set('tag', e.target.value)}>
            {['Comercial','Operativo','Entrega','Finanzas'].map(t=><option key={t}>{t}</option>)}
          </select>
        </F>
      </div>
    </Modal>
  )
}

export function Tareas({ data }) {
  const { tasks = [], updateTask, addTask, deleteTask } = data || {}
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)

  const toggle = (id) => {
    const task = tasks.find(t => t.id === id)
    if (task) updateTask?.(id, { done: !task.done })
  }

  const handleSave = (form) => {
    if (form.id) updateTask?.(form.id, form)
    else addTask?.(form)
    setCreating(false); setEditing(null)
  }

  const groups = [
    { key:'vencida', label:'Vencidas',        color:'var(--danger)', icon:I.Flame },
    { key:'hoy',     label:'Hoy',             color:'var(--brand)',  icon:I.Target },
    { key:'mañana',  label:'Mañana',          color:'var(--violet)', icon:I.Calendar },
    { key:'semana',  label:'Esta semana',     color:'var(--text-3)', icon:I.Clock },
  ]

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">No pierdas el hilo operativo · {tasks.filter(t=>!t.done).length} pendientes</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nueva tarea</button>
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
                      <div className={`check ${t.done?'done':''}`} onClick={()=>toggle(t.id)} style={{cursor:'pointer'}}>{t.done && <I.Check size={12} stroke={2.4}/>}</div>
                      <div onClick={() => setEditing(t)} style={{minWidth:0, flex:1, cursor:'pointer'}}>
                        <div className="title">{t.title}</div>
                        <div className="sub">{t.cliente} · {t.time} · <span style={{color:'var(--text-4)'}}>{t.tag}</span></div>
                      </div>
                      <div className="meta">
                        <span className={`chip ${t.prio==='alta'?'red':t.prio==='media'?'amber':'gray'}`}><span className="dot"/>{t.prio}</span>
                        <div className="avatar xs">{t.resp}</div>
                        <button className="icon-btn" style={{width:22, height:22, color:'var(--text-4)'}}
                          onClick={() => { if (confirm('¿Eliminar tarea?')) deleteTask?.(t.id) }}>
                          <I.Close size={11}/>
                        </button>
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
        </div>
      </div>

      {(creating || editing) && (
        <TareaModal
          tarea={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ── Proyectos ────────────────────────────────────────────────────

function ProyectoModal({ proyecto, onClose, onSave, onDelete }) {
  const isNew = !proyecto?.id
  const [form, setForm] = useState(proyecto || {
    cliente:'', servicio:'Web premium', estado:'En curso', progreso:0, ajustes:0, pago:'Pendiente', resp:'LP',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo proyecto' : `${form.cliente}`}
      onClose={onClose} onSave={() => onSave(form)} saveLabel={isNew ? 'Crear proyecto' : 'Guardar'}>
      <div className="form-2col">
        <F label="Cliente"><input value={form.cliente} onChange={e => set('cliente', e.target.value)} autoFocus /></F>
        <F label="Servicio">
          <select value={form.servicio||''} onChange={e => set('servicio', e.target.value)}>
            {['Web premium','Automatización WhatsApp','Chatbot de reservas','Mantenimiento mensual','E-commerce + SEO','Web + Captación'].map(s=><option key={s}>{s}</option>)}
          </select>
        </F>
      </div>
      <div className="form-2col">
        <F label="Estado">
          <select value={form.estado||''} onChange={e => set('estado', e.target.value)}>
            {['En curso','En revisión','Pagado · ajustes','Cerrado'].map(s=><option key={s}>{s}</option>)}
          </select>
        </F>
        <F label="Responsable">
          <select value={form.resp||'LP'} onChange={e => set('resp', e.target.value)}>
            {RESP.map(r=><option key={r}>{r}</option>)}
          </select>
        </F>
      </div>
      <F label={`Progreso — ${form.progreso}%`}>
        <input type="range" min="0" max="100" value={form.progreso||0} onChange={e => set('progreso', Number(e.target.value))} style={{width:'100%', accentColor:'var(--brand)'}} />
      </F>
      <div className="form-2col">
        <F label="Ajustes pendientes"><input type="number" min="0" value={form.ajustes||0} onChange={e => set('ajustes', Number(e.target.value))} /></F>
        <F label="Pago">
          <select value={form.pago||'Pendiente'} onChange={e => set('pago', e.target.value)}>
            {['Pendiente','Parcial 40%','Parcial 50%','Pagado'].map(p=><option key={p}>{p}</option>)}
          </select>
        </F>
      </div>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar proyecto</button>
          }
        </div>
      )}
    </Modal>
  )
}

export function Proyectos({ data }) {
  const proyectos = data?.proyectos || []
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const estadoChip = {
    'Pendiente':'gray', 'En curso':'blue', 'En revisión':'violet',
    'Pagado':'green', 'Pagado · ajustes':'amber', 'Cerrado':'gray',
  }

  const handleSave = (form) => {
    if (form.id) data.updateProyecto?.(form.id, form)
    else data.addProyecto?.(form)
    setEditing(null); setCreating(false)
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Proyectos y entregas</h1>
          <p className="page-subtitle">Control de lo que está en marcha · ajustes post-pago vigilados</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nuevo proyecto</button>
        </div>
      </div>

      <div className="stat-grid" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
        <div className="stat" style={{'--stat-glow':'rgba(45,107,255,0.18)','--stat-dot':'#4F8BFF'}}><div className="label"><span className="dot"/>En curso</div><div className="value">{proyectos.filter(p=>p.estado==='En curso').length}</div><div className="foot">proyectos activos</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(255,181,71,0.18)','--stat-dot':'#FFB547'}}><div className="label"><span className="dot"/>Con ajustes</div><div className="value">{proyectos.filter(p=>p.ajustes>0).length}</div><div className="foot">{proyectos.reduce((a,p)=>a+(p.ajustes||0),0)} ajustes totales</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(154,123,255,0.18)','--stat-dot':'#9A7BFF'}}><div className="label"><span className="dot"/>En revisión</div><div className="value">{proyectos.filter(p=>p.estado==='En revisión').length}</div><div className="foot">esperando feedback</div></div>
        <div className="stat" style={{'--stat-glow':'rgba(62,207,142,0.18)','--stat-dot':'#3ECF8E'}}><div className="label"><span className="dot"/>Cerrados</div><div className="value">{proyectos.filter(p=>p.estado==='Cerrado').length}</div><div className="foot">entregas firmadas</div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Proyectos activos</h3><div className="right"><span className="sub">{proyectos.length} proyectos</span></div></div>
        <div>
          {proyectos.map(p=>(
            <div className="project-item" key={p.id} style={{cursor:'pointer'}} onClick={() => setEditing(p)}>
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
                <button className="icon-btn" style={{width:28, height:28}} onClick={e => { e.stopPropagation(); setEditing(p) }}><I.ChevronR size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(editing || creating) && (
        <ProyectoModal
          proyecto={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
          onDelete={id => data.deleteProyecto?.(id)}
        />
      )}
    </div>
  )
}
