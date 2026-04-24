import React, { useState, useEffect, useMemo } from 'react'
import { I } from './Icons'
import { Modal, F, SelectOrText, CustomSelect } from './Modal'

function downloadCSV(rows, filename) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? '' : String(r[h])
      return v.includes(';') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v
    }).join(';'))
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

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
  const due   = new Date(due_date + 'T00:00:00'); due.setHours(0,0,0,0)
  const diff  = Math.floor((due - today) / 86400000)
  if (diff < 0)  return 'vencida'
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'mañana'
  // Friday of the current work week
  const dow = today.getDay() || 7 // Sun=7, Mon=1...Fri=5,Sat=6
  const friday = new Date(today); friday.setDate(today.getDate() + (5 - (dow > 5 ? dow - 7 : dow)))
  if (due <= friday) return 'semana'
  return 'proxima'
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

function taskDisplayDate(task) {
  if (task.due_date) return task.due_date
  const t = new Date(); t.setHours(0,0,0,0)
  const tomorrow = new Date(t); tomorrow.setDate(t.getDate() + 1)
  if (task.when_group === 'hoy')     return t.toISOString().slice(0,10)
  if (task.when_group === 'mañana')  return tomorrow.toISOString().slice(0,10)
  if (task.when_group === 'vencida') return t.toISOString().slice(0,10)
  return null
}

// ── Calendario ──────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function CalendarioView({ tasks, onEdit, onAdd }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const today = new Date().toISOString().slice(0,10)

  const days = useMemo(() => Array.from({length: 7}, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    return d
  }), [weekStart])

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n })
  const goToday  = () => setWeekStart(getMonday(new Date()))

  const rangeLabel = (() => {
    const from = days[0].toLocaleDateString('es-ES', {day:'numeric', month:'short'})
    const to   = days[6].toLocaleDateString('es-ES', {day:'numeric', month:'short', year:'numeric'})
    return `${from} — ${to}`
  })()

  const prioColor = (p, type) => {
    if (type === 'bg') return p==='alta' ? 'rgba(255,90,106,0.13)' : p==='media' ? 'rgba(255,181,71,0.11)' : 'rgba(107,117,144,0.1)'
    return p==='alta' ? '#FF8FA0' : p==='media' ? '#FFD080' : 'var(--text-3)'
  }

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap'}}>
        <button className="btn sm ghost" onClick={prevWeek} style={{padding:'4px 10px'}}>←</button>
        <button className="btn sm ghost" onClick={goToday}>Hoy</button>
        <button className="btn sm ghost" onClick={nextWeek} style={{padding:'4px 10px'}}>→</button>
        <span style={{fontSize:13, color:'var(--text-2)', fontWeight:500}}>{rangeLabel}</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(7, minmax(120px, 1fr))', gap:8, overflowX:'auto', paddingBottom:8}}>
        {days.map(d => {
          const key   = d.toISOString().slice(0,10)
          const isToday = key === today
          const isPast  = key < today
          const dayTasks = tasks.filter(t => taskDisplayDate(t) === key).sort((a,b) => {
            const order = {alta:0, media:1, baja:2}
            return (order[a.prio]||1) - (order[b.prio]||1)
          })
          const pendientes = dayTasks.filter(t => !t.done)
          const hechas     = dayTasks.filter(t => t.done)

          return (
            <div key={key} style={{
              background: isToday ? 'rgba(45,107,255,0.07)' : 'rgba(255,255,255,0.015)',
              border: `1px solid ${isToday ? 'rgba(45,107,255,0.35)' : 'var(--line-1)'}`,
              borderRadius: 12, padding: '10px 8px', minHeight: 140,
              opacity: isPast && !isToday ? 0.75 : 1,
            }}>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color: isToday ? 'var(--brand-2)' : 'var(--text-4)'}}>
                  {d.toLocaleDateString('es-ES', {weekday:'short'})}
                </div>
                <div style={{fontSize:20, fontWeight:700, lineHeight:1.1, color: isToday ? 'var(--brand-2)' : isPast ? 'var(--text-3)' : 'var(--text-0)'}}>
                  {d.getDate()}
                </div>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:4}}>
                {pendientes.map(t => (
                  <div key={t.id} onClick={() => onEdit(t)} style={{
                    padding:'4px 7px', borderRadius:6, cursor:'pointer', fontSize:11.5, fontWeight:500, lineHeight:1.3,
                    background: prioColor(t.prio, 'bg'), color: prioColor(t.prio, 'text'),
                    borderLeft: `2px solid ${prioColor(t.prio, 'text')}`,
                    opacity: !t.due_date ? 0.75 : 1,
                  }}>
                    {t.title}
                    {t.time && <span style={{fontSize:10, opacity:0.65, marginLeft:4}}>{t.time}</span>}
                    {!t.due_date && <span style={{fontSize:9, opacity:0.55, marginLeft:4}}>sin fecha</span>}
                  </div>
                ))}
                {hechas.map(t => (
                  <div key={t.id} onClick={() => onEdit(t)} style={{
                    padding:'4px 7px', borderRadius:6, cursor:'pointer', fontSize:11, lineHeight:1.3,
                    color:'var(--text-4)', textDecoration:'line-through', background:'rgba(255,255,255,0.03)',
                  }}>
                    {t.title}
                  </div>
                ))}
              </div>

              <button onClick={() => onAdd(key)} style={{
                marginTop: dayTasks.length ? 6 : 0, width:'100%', background:'transparent', border:'none',
                color:'var(--text-4)', fontSize:18, cursor:'pointer', lineHeight:1, padding:'2px 0',
                opacity: 0, transition:'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='0'}
              >+</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MesView({ tasks, onEdit, onAdd }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const today = new Date().toISOString().slice(0,10)

  const prevMonth = () => setMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n })
  const nextMonth = () => setMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n })
  const goToday   = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setMonth(d) }

  const startDay = getMonday(new Date(month.getFullYear(), month.getMonth(), 1))
  const days = useMemo(() => {
    const arr = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDay); d.setDate(startDay.getDate() + i); arr.push(d)
    }
    // Trim to minimum weeks needed
    while (arr.length > 35 && arr[arr.length - 7].getMonth() !== month.getMonth()) arr.splice(-7)
    return arr
  }, [month])

  const prioColor = p => p==='alta' ? '#FF8FA0' : p==='media' ? '#FFD080' : 'var(--text-3)'
  const prioBg    = p => p==='alta' ? 'rgba(255,90,106,0.13)' : p==='media' ? 'rgba(255,181,71,0.11)' : 'rgba(107,117,144,0.1)'
  const DOW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
  const monthLabel = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
        <button className="btn sm ghost" onClick={prevMonth} style={{padding:'4px 10px'}}>←</button>
        <button className="btn sm ghost" onClick={goToday}>Hoy</button>
        <button className="btn sm ghost" onClick={nextMonth} style={{padding:'4px 10px'}}>→</button>
        <span style={{fontSize:13, color:'var(--text-2)', fontWeight:500, textTransform:'capitalize'}}>{monthLabel}</span>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4}}>
        {DOW.map(d => (
          <div key={d} style={{fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-4)', textAlign:'center', padding:'2px 0 8px'}}>{d}</div>
        ))}
        {days.map(d => {
          const key = d.toISOString().slice(0,10)
          const isCurrentMonth = d.getMonth() === month.getMonth()
          const isToday = key === today
          const dayTasks  = tasks.filter(t => taskDisplayDate(t) === key)
          const pendientes = dayTasks.filter(t => !t.done)
          const MAX = 3
          return (
            <div key={key} onClick={() => onAdd(key)} style={{
              background: isToday ? 'rgba(45,107,255,0.07)' : 'rgba(255,255,255,0.015)',
              border: `1px solid ${isToday ? 'rgba(45,107,255,0.35)' : 'var(--line-1)'}`,
              borderRadius: 10, padding:'6px 6px 8px', minHeight: 76,
              opacity: isCurrentMonth ? 1 : 0.3, cursor:'pointer',
            }}
            onMouseEnter={e => { if (!isToday) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = isToday ? 'rgba(45,107,255,0.07)' : 'rgba(255,255,255,0.015)' }}
            >
              <div style={{fontSize:12, fontWeight: isToday?700:500, color: isToday?'var(--brand-2)':'var(--text-3)', textAlign:'right', marginBottom:4}}>{d.getDate()}</div>
              <div style={{display:'flex', flexDirection:'column', gap:2}}>
                {pendientes.slice(0, MAX).map(t => (
                  <div key={t.id} onClick={e => { e.stopPropagation(); onEdit(t) }} style={{
                    padding:'2px 5px', borderRadius:4, fontSize:10.5, fontWeight:500, lineHeight:1.3,
                    background: prioBg(t.prio), color: prioColor(t.prio),
                    borderLeft:`2px solid ${prioColor(t.prio)}`,
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', cursor:'pointer',
                  }}>{t.title}</div>
                ))}
                {pendientes.length > MAX && <div style={{fontSize:10, color:'var(--text-4)', padding:'1px 4px'}}>+{pendientes.length - MAX} más</div>}
                {pendientes.length === 0 && dayTasks.some(t => t.done) && <div style={{fontSize:10, color:'var(--text-4)', padding:'1px 4px'}}>✓ {dayTasks.filter(t=>t.done).length}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tareas ───────────────────────────────────────────────────────

function TareaModal({ tarea, onClose, onSave, onDelete, clientes = [] }) {
  const isNew = !tarea?.id
  const users = getUsers()
  const respOptions = users.filter(u => u.estado === 'activo').map(u => u.ini || (u.n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?')
  const defaultResp = respOptions[0] || 'LP'

  const [form, setForm] = useState(tarea || {
    title:'', cliente:'', due_date: todayIso(), time:'', prio:'media', resp: defaultResp, tag:'Operativo', done:false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSave = () => {
    if (!form.title.trim()) return
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
          {clientes.length > 0
            ? <CustomSelect value={form.cliente||''} onChange={v => set('cliente', v)} options={[{value:'',label:'— Sin cliente —'},...clientes.map(c=>({value:c.nombre,label:c.nombre}))]} />
            : <input value={form.cliente||''} onChange={e => set('cliente', e.target.value)} placeholder="Ej: Clínica Marbella" />
          }
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
          <CustomSelect value={form.prio||'media'} onChange={v => set('prio', v)} options={[{value:'alta',label:'Alta'},{value:'media',label:'Media'},{value:'baja',label:'Baja'}]} />
        </F>
      </div>
      <div className="form-2col">
        <F label="Responsable">
          <CustomSelect value={form.resp||defaultResp} onChange={v => set('resp', v)} options={respOptions.length ? respOptions : ['LP','AR']} />
        </F>
        <F label="Etiqueta">
          <SelectOrText value={form.tag||'Operativo'} onChange={v => set('tag', v)} options={['Comercial','Operativo','Entrega','Finanzas']} placeholder="Ej: Marketing…" />
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

export function Tareas({ data, openItem, onItemOpened }) {
  const { tasks = [], clientes = [], updateTask, addTask, deleteTask } = data || {}
  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [view, setView]         = useState('lista')
  const [newTaskDate, setNewTaskDate] = useState(null)

  useEffect(() => {
    if (openItem?.type === 'Tarea' && openItem.item) {
      const task = tasks.find(t => t.id === openItem.item.id)
      if (task) { setEditing(task); onItemOpened?.() }
    }
  }, [openItem])

  const toggle = (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (!task.done) {
      updateTask?.(id, { done: true })
      if (confirm('¿Eliminar la tarea completada?')) deleteTask?.(id)
    } else {
      updateTask?.(id, { done: false })
    }
  }

  const handleSave = (form) => {
    if (form.id) updateTask?.(form.id, form)
    else addTask?.(form)
    setCreating(false); setEditing(null); setNewTaskDate(null)
  }

  const handleCalendarAdd = (isoDate) => {
    setNewTaskDate(isoDate)
    setCreating(true)
  }

  const groups = [
    { key:'vencida', label:'Vencidas',       color:'var(--danger)', icon:I.Flame },
    { key:'hoy',     label:'Hoy',            color:'var(--brand)',  icon:I.Target },
    { key:'mañana',  label:'Mañana',         color:'var(--violet)', icon:I.Calendar },
    { key:'semana',  label:'Esta semana',    color:'var(--text-3)', icon:I.Clock },
    { key:'proxima', label:'Próxima semana', color:'var(--text-4)', icon:I.Clock },
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
          <div className="segmented">
            <button className={view==='lista'?'active':''} onClick={()=>setView('lista')}>Lista</button>
            <button className={view==='calendario'?'active':''} onClick={()=>setView('calendario')}>Semana</button>
            <button className={view==='mes'?'active':''} onClick={()=>setView('mes')}>Mes</button>
          </div>
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nueva tarea</button>
        </div>
      </div>

      {view === 'calendario' && (
        <CalendarioView tasks={tasks} onEdit={setEditing} onAdd={handleCalendarAdd} />
      )}
      {view === 'mes' && (
        <MesView tasks={tasks} onEdit={setEditing} onAdd={handleCalendarAdd} />
      )}

      {view === 'lista' && <div className="grid-main-side">
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
                        <button className="icon-btn" style={{width:22, height:22, color:'var(--text-4)'}}
                          onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${t.title}"?`)) deleteTask?.(t.id) }}>
                          <I.Close size={11}/>
                        </button>
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
      </div>}

      {(creating || editing) && (
        <TareaModal
          tarea={editing ? editing : (newTaskDate ? { due_date: newTaskDate } : undefined)}
          onClose={() => { setCreating(false); setEditing(null); setNewTaskDate(null) }}
          onSave={handleSave}
          onDelete={deleteTask}
          clientes={clientes}
        />
      )}
    </div>
  )
}

// ── Proyectos ────────────────────────────────────────────────────

function ProyectoModal({ proyecto, onClose, onSave, onDelete, cobros = [], updateCobro }) {
  const isNew = !proyecto?.id
  const users    = getUsers()
  const servList = getServicios()
  const DEFAULT_SERVICIOS = ['Web premium','Automatización WhatsApp','Chatbot de reservas','Mantenimiento mensual','E-commerce + SEO','Web + Captación']
  const servicios = servList.length ? servList : DEFAULT_SERVICIOS
  const respOptions = users.filter(u => u.estado === 'activo').map(u => u.ini || (u.n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?')

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
          <SelectOrText value={form.servicio||''} onChange={v => set('servicio', v)} options={servicios} placeholder="Ej: Web + Chatbot…" />
        </F>
      </div>
      <div className="form-2col">
        <F label="Estado">
          <CustomSelect value={form.estado||'En curso'} onChange={v => set('estado', v)} options={['En curso','En revisión','Pagado · ajustes','Cerrado']} />
        </F>
        <F label="Responsable">
          <CustomSelect value={form.resp||respOptions[0]||'LP'} onChange={v => set('resp', v)} options={respOptions.length ? respOptions : ['LP','AR']} />
        </F>
      </div>
      <F label={`Progreso — ${form.progreso}%`}>
        <input type="range" min="0" max="100" value={form.progreso||0} onChange={e => set('progreso', Number(e.target.value))} style={{width:'100%', accentColor:'var(--brand)'}} />
      </F>
      <div className="form-2col">
        <F label="Ajustes pendientes"><input type="number" min="0" value={form.ajustes||0} onChange={e => set('ajustes', Number(e.target.value))} /></F>
        <F label="Pago">
          <SelectOrText value={form.pago||'Pendiente'} onChange={v => set('pago', v)} options={['Pendiente','Señal cobrada','Pagado']} placeholder="Ej: Parcial 30%…" />
        </F>
      </div>

      {(() => {
        const cobrosProy = cobros.filter(c => c.cliente === form.cliente)
        if (!cobrosProy.length) return null
        const cobrado = cobrosProy.filter(c => c.pagado).reduce((a,c) => a+(c.monto||0), 0)
        const pendiente = cobrosProy.filter(c => !c.pagado).reduce((a,c) => a+(c.monto||0), 0)
        return (
          <div style={{border:'1px solid var(--line-2)', borderRadius:10, overflow:'hidden'}}>
            <div style={{padding:'10px 14px', borderBottom:'1px solid var(--line-1)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <span style={{fontSize:11.5, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Cobros del cliente</span>
              <span style={{fontSize:12, color:'var(--text-3)'}}>
                <b style={{color:'var(--ok)'}}>€{cobrado.toLocaleString('es-ES')}</b> cobrado
                {pendiente > 0 && <> · <b style={{color:'var(--warn)'}}>€{pendiente.toLocaleString('es-ES')}</b> pendiente</>}
              </span>
            </div>
            {cobrosProy.map(c => (
              <div key={c.id} style={{display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                <div style={{width:8, height:8, borderRadius:'50%', background: c.pagado ? 'var(--ok)' : 'var(--warn)', flexShrink:0}} />
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:13, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.concepto}</div>
                  {c.vence && <div style={{fontSize:11, color:'var(--text-4)'}}>Vence: {c.vence}</div>}
                </div>
                <span style={{fontSize:13, fontFamily:'var(--font-mono)', color:'var(--text-1)'}}>€{(c.monto||0).toLocaleString('es-ES')}</span>
                {c.pagado
                  ? <span style={{fontSize:11, color:'var(--ok)', minWidth:60, textAlign:'right'}}>✓ cobrado</span>
                  : <button className="btn sm primary" style={{fontSize:11, minWidth:60}}
                      onMouseDown={e => { e.preventDefault(); updateCobro?.(c.id, { pagado: true }) }}>
                      Cobrar
                    </button>
                }
              </div>
            ))}
          </div>
        )
      })()}

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
  const cobros    = data?.cobros    || []
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

  const handleUpdateCobro = (id, updates) => {
    data.updateCobro?.(id, updates)
    // Si se acaba de pagar el último cobro pendiente de un proyecto, marcar como pagado
    if (updates.pagado && editing) {
      const cliente = editing.cliente
      const pendientesTrasUpdate = cobros.filter(c => c.cliente === cliente && !c.pagado && c.id !== id)
      if (pendientesTrasUpdate.length === 0) {
        data.updateProyecto?.(editing.id, { pago: 'Pagado' })
        setEditing(p => ({ ...p, pago: 'Pagado' }))
      } else {
        setEditing(p => ({ ...p, pago: 'Señal cobrada' }))
      }
    }
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Proyectos y entregas</h1>
          <p className="page-subtitle">Control de lo que está en marcha · ajustes post-pago vigilados</p>
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => downloadCSV(
            proyectos.map(p => ({ Cliente: p.cliente, Servicio: p.servicio, Estado: p.estado, Progreso: `${p.progreso}%`, Ajustes: p.ajustes||0, Pago: p.pago||'', Responsable: p.resp||'' })),
            `proyectos-${new Date().toISOString().slice(0,10)}.csv`
          )}>↓ CSV</button>
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
                {(() => {
                  const cp = cobros.filter(c => c.cliente === p.cliente)
                  if (cp.length > 0) {
                    const cobrado = cp.filter(c => c.pagado).reduce((a,c) => a+(c.monto||0), 0)
                    const total   = cp.reduce((a,c) => a+(c.monto||0), 0)
                    const pend    = cp.some(c => !c.pagado)
                    return (
                      <span className="small mono" style={{color: pend ? 'var(--warn)' : 'var(--ok)'}}>
                        €{cobrado.toLocaleString('es-ES')}/{total.toLocaleString('es-ES')}
                      </span>
                    )
                  }
                  return <span className="small" style={{color: p.pago==='Pagado'?'var(--ok)':p.pago==='Pendiente'?'var(--warn)':'var(--text-2)'}}>{p.pago}</span>
                })()}
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
          cobros={cobros}
          updateCobro={handleUpdateCobro}
        />
      )}
    </div>
  )
}
