import React, { useState } from 'react'
import { I } from './Icons'
import { Modal, F } from './Modal'

// ── helpers ─────────────────────────────────────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem('agentia_usuarios') || '[]') } catch { return [] }
}
function getServicios() {
  try {
    const s = JSON.parse(localStorage.getItem('agentia_servicios') || '[]')
    return s.filter(x => x.activo).map(x => x.n)
  } catch { return [] }
}

function computeWhenGroup(due_date) {
  if (!due_date) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due   = new Date(due_date); due.setHours(0,0,0,0)
  const diff  = Math.floor((due - today) / 86400000)
  if (diff < 0)  return 'vencida'
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  return 'semana'
}

function effectiveGroup(task) {
  if (task.due_date) return computeWhenGroup(task.due_date)
  return task.when_group || 'semana'
}

function todayIso() {
  return new Date().toISOString().slice(0,10)
}

function tomorrowIso() {
  const d = new Date(); d.setDate(d.getDate()+1)
  return d.toISOString().slice(0,10)
}

function weekIso() {
  const d = new Date(); d.setDate(d.getDate()+3)
  return d.toISOString().slice(0,10)
}

// ── Tareas ───────────────────────────────────────────────────────

function TareaModal({ tarea, onClose, onSave, onDelete }) {
  const isNew = !tarea?.id
  const users = getUsers()
  const respOptions = users.filter(u => u.estado === 'activo').map(u => u.ini || u.n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())
  const defaultResp = respOptions[0] || 'LP'

  const [form, setForm] = useState(tarea || {
    title:'', cliente:'', due_date: todayIso(), time:'', prio:'media', resp: defaultResp, tag:'Operativo', done:false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSave = () => {
    const group = computeWhenGroup(form.due_date) || form.when_group || 'hoy'
    onSave({ ...form, when_group: group })
  }

  return (
    <Modal open title={isNew ? 'Nueva tarea' : 'Editar tarea'}
      onClose={onClose} onSave={handleSave} saveLabel={isNew ? 'Crear tarea' : 'Guardar'}>
      <F label="Título">
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
      </F>
      <div className="form-2col">
        <F label="Cliente / empresa">
          <input value={form.cliente||''} onChange={e => set('cliente', e.target.value)} placeholder="Ej: Clínica Marbella" />
        </F>
        <F label="Hora">
          <input value={form.time||''} onChange={e => set('time', e.target.value)} placeholder="14:00" />
        </F>
      </div>
      <div className="form-2col">
        <F label="Fecha límite">
          <input type="date" value={form.due_date||''} onChange={e => set('due_date', e.target.value)} />
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
          <select value={form.resp||defaultResp} onChange={e => set('resp', e.target.value)}>
            {(respOptions.length ? respOptions : ['LP','AR']).map(r=><option key={r}>{r}</option>)}
          </select>
        </F>
        <F label="Etiqueta">
          <select value={form.tag||'Operativo'} onChange={e => set('tag', e.target.value)}>
            {['Comercial','Operativo','Entrega','Finanzas'].map(t=><option key={t}>{t}</option>)}
          </select>
        </F>
      </div>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete?.(form.id); onClose() }}>¿Confirmar?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar tarea</button>
          }
        </div>
      )}
    </Modal>
  )
}

export function Tareas({ data }) {
  const { tasks = [], updateTask, addTask, deleteTask } = data || {}
  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState(null)

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
    { key:'vencida', label:'Vencidas',    color:'var(--danger)', icon:I.Flame },
    { key:'hoy',     label:'Hoy',         color:'var(--brand)',  icon:I.Target },
    { key:'mañana',  label:'Mañana',      color:'var(--violet)', icon:I.Calendar },
    { key:'semana',  label:'Esta semana', color:'var(--text-3)', icon:I.Clock },
  ]

  const formatDate = (due_date) => {
    if (!due_date) return null
    return new Date(due_date + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' })
  }

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
            const list = tasks.filter(t => effectiveGroup(t) === g.key)
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
                        <div className="sub">
                          {t.cliente && `${t.cliente} · `}
                          {t.due_date ? formatDate(t.due_date) : t.time}
                          {t.time && t.due_date ? ` · ${t.time}` : ''}
                          {' · '}<span style={{color:'var(--text-4)'}}>{t.tag}</span>
                        </div>
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
          {tasks.filter(t => !t.done).length === 0 && (
            <div className="card" style={{textAlign:'center', padding:'32px 0', color:'var(--text-4)'}}>
              Sin tareas pendientes · <button className="btn sm ghost" onClick={() => setCreating(true)} style={{display:'inline-flex'}}>Crear tarea</button>
            </div>
          )}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div className="card">
            <div className="card-head"><h3>Resumen operativo</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:12}}>
              {[
                {l:'Vencidas', v:tasks.filter(t=>effectiveGroup(t)==='vencida'&&!t.done).length, c:'#FF5A6A'},
                {l:'Hoy', v:tasks.filter(t=>effectiveGroup(t)==='hoy'&&!t.done).length, c:'#4F8BFF'},
                {l:'Mañana', v:tasks.filter(t=>effectiveGroup(t)==='mañana'&&!t.done).length, c:'#9A7BFF'},
                {l:'Completadas', v:tasks.filter(t=>t.done).length, c:'#3ECF8E'},
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
          onDelete={deleteTask}
        />
      )}
    </div>
  )
}

// ── Proyectos ────────────────────────────────────────────────────

function ProyectoModal({ proyecto, onClose, onSave, onDelete }) {
  const isNew = !proyecto?.id
  const users    = getUsers()
  const servList = getServicios()
  const DEFAULT_SERVICIOS = ['Web premium','Automatización WhatsApp','Chatbot de reservas','Mantenimiento mensual','E-commerce + SEO','Web + Captación']
  const servicios = servList.length ? servList : DEFAULT_SERVICIOS
  const respOptions = users.filter(u => u.estado === 'activo').map(u => u.ini || u.n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())

  const [form, setForm] = useState(proyecto || {
    cliente:'', servicio: servicios[0] || 'Web premium', estado:'En curso', progreso:0, ajustes:0, pago:'Pendiente', resp: respOptions[0] || 'LP',
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
            {servicios.map(s=><option key={s}>{s}</option>)}
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
          <select value={form.resp||''} onChange={e => set('resp', e.target.value)}>
            {(respOptions.length ? respOptions : ['LP','AR']).map(r=><option key={r}>{r}</option>)}
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
  const [editing, setEditing]   = useState(null)
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
          {proyectos.length === 0 && (
            <div style={{textAlign:'center', padding:'32px 0', color:'var(--text-4)'}}>
              Sin proyectos aún · <button className="btn sm ghost" onClick={() => setCreating(true)} style={{display:'inline-flex'}}>Crear proyecto</button>
            </div>
          )}
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
