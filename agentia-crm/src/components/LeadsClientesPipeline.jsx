import React, { useState, useEffect, useRef } from 'react'
import { I } from './Icons'
import { Modal, F, SelectOrText } from './Modal'
import { STATE_COLORS, PIPELINE_COLS, eur } from './data'

function getServicios() {
  try {
    const s = JSON.parse(localStorage.getItem('agentia_servicios') || '[]')
    const active = s.filter(x => x.activo).map(x => x.n)
    return active.length ? active : ['Web premium','Automatización WhatsApp','Chatbot de reservas','Mantenimiento mensual','Campaña captación']
  } catch { return ['Web premium','Automatización WhatsApp','Chatbot de reservas'] }
}

function getResp() {
  try {
    const users = JSON.parse(localStorage.getItem('agentia_usuarios') || '[]')
    const r = users.filter(u => u.estado === 'activo').map(u => u.ini || u.n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())
    return r.length ? r : ['LP','AR']
  } catch { return ['LP','AR'] }
}

// ── Leads ────────────────────────────────────────────────────────

function LeadModal({ lead, onClose, onSave, onDelete }) {
  const isNew = !lead?.id
  const SERVICIOS = getServicios()
  const RESP = getResp()
  const [form, setForm] = useState(lead ? { ...lead, monto: lead.monto ?? '', crearProyecto: false, tipo: lead.tipo || 'Proyecto', montoRecurrente: '', frecuencia: 'Mensual' } : {
    empresa:'', sector:'', ciudad:'', contacto:'', telefono:'', email:'',
    responsable: RESP[0] || 'LP', servicio: SERVICIOS[0] || 'Web premium',
    estado:'Cliente Nuevo', next:'', monto:'', origen:'Instagram', origenCustom:'', notas:'',
    crearProyecto: false, tipo: 'Proyecto', montoRecurrente: '', frecuencia: 'Mensual',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo lead' : `Editar — ${form.empresa}`}
      onClose={onClose} onSave={() => {
        const origenFinal = form.origen === 'Otro' ? (form.origenCustom?.trim() || 'Otro') : form.origen
        onSave({ ...form, monto: parseFloat(form.monto) || 0, origen: origenFinal })
      }} saveLabel={isNew ? 'Crear lead' : 'Guardar cambios'}>
      <div className="form-2col">
        <F label="Empresa"><input value={form.empresa} onChange={e => set('empresa', e.target.value)} placeholder="Ej: Clínica Marbella" autoFocus /></F>
        <F label="Contacto"><input value={form.contacto||''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del contacto" /></F>
      </div>
      <div className="form-2col">
        <F label="Teléfono"><input value={form.telefono||''} onChange={e => set('telefono', e.target.value)} placeholder="+34 600 000 000" /></F>
        <F label="Email"><input type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="contacto@empresa.com" /></F>
      </div>
      <div className="form-2col">
        <F label="Sector"><input value={form.sector||''} onChange={e => set('sector', e.target.value)} placeholder="Salud, Legal…" /></F>
        <F label="Ciudad"><input value={form.ciudad||''} onChange={e => set('ciudad', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Servicio">
          <SelectOrText value={form.servicio||''} onChange={v => set('servicio', v)} options={SERVICIOS} placeholder="Ej: Web + Chatbot…" />
        </F>
        <F label="Origen">
          <select value={form.origen||''} onChange={e => set('origen', e.target.value)}>
            {['Instagram','LinkedIn','Referido','Formulario web','Evento','Otro'].map(o=><option key={o}>{o}</option>)}
          </select>
        </F>
      </div>
      {form.origen === 'Otro' && (
        <F label="Especifica el origen"><input value={form.origenCustom||''} onChange={e => set('origenCustom', e.target.value)} placeholder="Ej: Feria, podcast, amigo…" /></F>
      )}
      <div className="form-2col">
        <F label="Estado">
          <select value={form.estado||''} onChange={e => set('estado', e.target.value)}>
            {PIPELINE_COLS.map(s=><option key={s}>{s}</option>)}
          </select>
        </F>
        <F label="Responsable">
          <select value={form.responsable||''} onChange={e => set('responsable', e.target.value)}>
            {RESP.map(r=><option key={r}>{r}</option>)}
          </select>
        </F>
      </div>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
        <F label="Próximo paso"><input value={form.next||''} onChange={e => set('next', e.target.value)} placeholder="Llamar el lunes…" /></F>
      </div>
      <F label="Notas"><textarea value={form.notas||''} onChange={e => set('notas', e.target.value)} placeholder="Detalles adicionales…" /></F>

      {form.estado === 'Cobrado' && (
        <div style={{display:'flex', flexDirection:'column', gap:10, padding:'14px', background:'rgba(62,207,142,0.06)', border:'1px solid rgba(62,207,142,0.2)', borderRadius:10}}>
          <div className="form-2col">
            <F label="Tipo de cliente">
              <select value={form.tipo || 'Proyecto'} onChange={e => set('tipo', e.target.value)}>
                <option value="Proyecto">Proyecto — pago único cerrado</option>
                <option value="Recurrente">Recurrente — cuota periódica</option>
              </select>
            </F>
            <F label="¿Crear proyecto?">
              <select value={form.crearProyecto ? 'si' : 'no'} onChange={e => set('crearProyecto', e.target.value === 'si')}>
                <option value="no">No por ahora</option>
                <option value="si">Sí — crear proyecto</option>
              </select>
            </F>
          </div>
          {form.tipo === 'Recurrente' && (
            <div className="form-2col">
              <F label="Cuota (€)">
                <input type="number" min="0" placeholder="30" value={form.montoRecurrente||''} onChange={e => set('montoRecurrente', e.target.value)} />
              </F>
              <F label="Frecuencia">
                <select value={form.frecuencia || 'Mensual'} onChange={e => set('frecuencia', e.target.value)}>
                  <option>Mensual</option>
                  <option>Semanal</option>
                  <option>Trimestral</option>
                </select>
              </F>
            </div>
          )}
        </div>
      )}

      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete(form.id); onClose() }}>¿Confirmar?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>
                {['Cobrado','Denegado'].includes(form.estado) ? 'Quitar del pipeline' : 'Eliminar lead'}
              </button>
          }
        </div>
      )}
    </Modal>
  )
}

function RowMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  return (
    <div className="row-menu-wrap" ref={ref}>
      <button className="icon-btn" style={{width:28, height:28}} onClick={e => { e.stopPropagation(); setOpen(o=>!o) }}>
        <I.MoreH size={14}/>
      </button>
      {open && (
        <div className="row-menu" onClick={() => setOpen(false)}>
          <button onClick={onEdit}><I.Settings size={13}/> Editar</button>
          <button className="del" onClick={onDelete}><I.Close size={13}/> Eliminar</button>
        </div>
      )}
    </div>
  )
}

// ── Clientes ─────────────────────────────────────────────────────

function ClienteModal({ cliente, onClose, onSave, onDelete }) {
  const isNew = !cliente?.id
  const SERVICIOS = getServicios()
  const RESP = getResp()
  const [form, setForm] = useState(cliente ? { ...cliente, importe: cliente.importe ?? '' } : {
    nombre:'', contacto:'', telefono:'', email:'',
    servicio: SERVICIOS[0] || 'Web premium', importe:'', estado:'En curso',
    tipo:'Proyecto', pagado:false, ajustes:0, responsable: RESP[0] || 'LP', since:'',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo cliente' : `Editar — ${form.nombre}`}
      onClose={onClose} onSave={() => onSave({ ...form, importe: parseFloat(form.importe) || 0, ajustes: parseInt(form.ajustes) || 0 })} saveLabel={isNew ? 'Crear cliente' : 'Guardar cambios'}>
      <F label="Nombre / empresa"><input value={form.nombre} onChange={e => set('nombre', e.target.value)} autoFocus /></F>
      <div className="form-2col">
        <F label="Contacto"><input value={form.contacto||''} onChange={e => set('contacto', e.target.value)} placeholder="Nombre del contacto" /></F>
        <F label="Teléfono"><input value={form.telefono||''} onChange={e => set('telefono', e.target.value)} placeholder="+34 600 000 000" /></F>
      </div>
      <F label="Email"><input type="email" value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="contacto@empresa.com" /></F>
      <div className="form-2col">
        <F label="Servicio">
          <SelectOrText value={form.servicio||''} onChange={v => set('servicio', v)} options={SERVICIOS} placeholder="Ej: Web + Chatbot…" />
        </F>
        <F label="Responsable">
          <select value={form.responsable||''} onChange={e => set('responsable', e.target.value)}>
            {RESP.map(r=><option key={r}>{r}</option>)}
          </select>
        </F>
      </div>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.importe ?? ''} onChange={e => set('importe', e.target.value)} /></F>
        <F label="Desde (ej: Abr 2026)"><input value={form.since||''} onChange={e => set('since', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Tipo">
          <select value={form.tipo || 'Proyecto'} onChange={e => set('tipo', e.target.value)}>
            <option value="Proyecto">Proyecto — pago único</option>
            <option value="Recurrente">Recurrente — cuota periódica</option>
          </select>
        </F>
        <F label="Estado">
          <select value={form.estado||''} onChange={e => set('estado', e.target.value)}>
            {['En curso','En revisión','Pagado · ajustes','Cerrado','Recurrente'].map(s=><option key={s}>{s}</option>)}
          </select>
        </F>
      </div>
      <div className="form-2col">
        <F label="Ajustes pendientes"><input type="number" min="0" value={form.ajustes||0} onChange={e => set('ajustes', Number(e.target.value))} /></F>
      </div>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar cliente</button>
          }
        </div>
      )}
    </Modal>
  )
}

export function Clientes({ data }) {
  const clientes = data?.clientes || []
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const handleSave = (form) => {
    if (form.id) data.updateCliente?.(form.id, form)
    else data.addCliente?.(form)
    setEditing(null); setCreating(false)
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Activos, recurrentes y cerrados · {clientes.length} clientes · €{eur(clientes.reduce((a,c)=>a+(c.importe||0),0))} facturados</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nuevo cliente</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead><tr><th>Cliente</th><th>Tipo</th><th>Servicio</th><th>Estado</th><th>Ajustes</th><th>Resp.</th><th>Desde</th><th style={{textAlign:'right'}}>Importe</th><th></th></tr></thead>
          <tbody>
            {clientes.map(c => {
              const chip = c.estado==='Cerrado'?'gray':c.estado==='En curso'?'blue':c.estado==='En revisión'?'violet':c.estado==='Recurrente'?'green':'amber'
              const tipo = c.tipo || (c.estado === 'Recurrente' ? 'Recurrente' : 'Proyecto')
              return (
                <tr key={c.id} style={{cursor:'pointer'}} onClick={() => setEditing(c)}>
                  <td><div className="primary">{c.nombre}</div></td>
                  <td>
                    <span style={{fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                      background: tipo==='Recurrente' ? 'rgba(62,207,142,0.12)' : 'rgba(107,117,144,0.12)',
                      color: tipo==='Recurrente' ? 'var(--ok)' : 'var(--text-3)'}}>
                      {tipo==='Recurrente' ? '↺ Recurrente' : 'Proyecto'}
                    </span>
                  </td>
                  <td className="muted">{c.servicio}</td>
                  <td><span className={`chip ${chip}`}><span className="dot"/>{c.estado}</span></td>
                  <td>{c.ajustes>0 ? <span className="pend">{c.ajustes} pendiente{c.ajustes>1?'s':''}</span> : <span className="muted small">—</span>}</td>
                  <td><div className="avatar sm">{c.responsable}</div></td>
                  <td className="muted small">{c.since}</td>
                  <td className="mono" style={{textAlign:'right'}}>€{eur(c.importe||0)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu
                      onEdit={() => setEditing(c)}
                      onDelete={() => { if (confirm(`¿Eliminar "${c.nombre}"?`)) data.deleteCliente?.(c.id) }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(editing || creating) && (
        <ClienteModal
          cliente={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
          onDelete={id => data.deleteCliente?.(id)}
        />
      )}
    </div>
  )
}

// ── Pipeline ─────────────────────────────────────────────────────

export function Pipeline({ data, openQuick }) {
  const leads = data?.leads || []
  const [view,     setView]     = useState('kanban')
  const [filter,   setFilter]   = useState('todos')
  const [movingId,    setMovingId]    = useState(null)
  const [editing,     setEditing]     = useState(null)
  const [creating,    setCreating]    = useState(false)
  const [cobradoLead, setCobradoLead] = useState(null) // lead pre-cargado para el modal de Cobrado

  const activeLeads = leads.filter(l => !['Cobrado','Denegado'].includes(l.estado))
  const closedLeads = leads.filter(l =>  ['Cobrado','Denegado'].includes(l.estado))
  const base     = filter === 'cerrados' ? closedLeads : activeLeads
  const filtered = (filter === 'todos' || filter === 'cerrados') ? base : base.filter(l => l.temp === filter)

  const cols = PIPELINE_COLS.map(label => ({
    label,
    color: STATE_COLORS[label]?.color || '#6B7590',
    items: leads.filter(l => l.estado === label),
  }))

  const moveCard = (leadId, newEstado) => {
    if (newEstado === 'Cobrado') {
      const lead = leads.find(l => l.id === leadId)
      if (lead) { setCobradoLead({ ...lead, estado: 'Cobrado' }); setMovingId(null); return }
    }
    data.updateLead?.(leadId, { estado: newEstado })
    setMovingId(null)
  }

  const totalAbierto = activeLeads.reduce((a,l) => a + (l.monto||0), 0)

  const handleSave = (form) => {
    if (form.id) data.updateLead?.(form.id, form)
    else data.addLead?.(form)
    setEditing(null)
    setCreating(false)
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="page-subtitle">
            {view === 'lista' && filter === 'cerrados'
              ? `Leads cerrados · ${closedLeads.length} totales`
              : `${activeLeads.length} oportunidades activas · €${eur(totalAbierto)} en juego`}
          </p>
        </div>
        <div className="page-actions">
          {view === 'lista' && (
            <div className="segmented">
              {[['todos','Todos'],['hot','Calientes'],['warm','Tibios'],['cold','Fríos'],['cerrados','Cerrados']].map(([k,v])=>(
                <button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{v}</button>
              ))}
            </div>
          )}
          <div className="segmented">
            <button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}>Kanban</button>
            <button className={view==='lista'?'active':''} onClick={()=>setView('lista')}>Lista</button>
          </div>
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nuevo lead</button>
        </div>
      </div>

      {view === 'kanban' && (
        <>
          <div className="pipe-summary">
            {[
              {label:'Abiertas',       v: activeLeads.length,                                   sub:'oportunidades'},
              {label:'Valor potencial',v: `€${eur(totalAbierto)}`,                              sub:'suma total'},
              {label:'Cobradas',       v: leads.filter(l=>l.estado==='Cobrado').length,         sub:'este pipeline'},
              {label:'Denegadas',      v: leads.filter(l=>l.estado==='Denegado').length,        sub:'este pipeline'},
            ].map((s,i)=>(
              <div key={i} className="stat" style={{padding:'14px 16px'}}>
                <div className="label" style={{fontSize:11}}>{s.label}</div>
                <div className="value" style={{fontSize:22, marginTop:6}}>{s.v}</div>
                <div className="foot">{s.sub}</div>
              </div>
            ))}
          </div>

          {movingId && (() => {
            const lead = leads.find(l => l.id === movingId)
            return (
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'flex-end'}} onClick={() => setMovingId(null)}>
                <div style={{width:'100%',background:'var(--surface-1)',borderRadius:'20px 20px 0 0',padding:'20px 16px 32px'}} onClick={e=>e.stopPropagation()}>
                  <div style={{fontSize:13,color:'var(--text-3)',marginBottom:14}}>Mover <b style={{color:'var(--text-0)'}}>{lead?.empresa}</b> a…</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {PIPELINE_COLS.map(col => (
                      <button key={col} className="btn" style={{justifyContent:'flex-start',gap:10,opacity:lead?.estado===col?0.4:1}}
                        disabled={lead?.estado===col} onClick={() => moveCard(movingId, col)}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:STATE_COLORS[col]?.color||'#6B7590',flexShrink:0}}/>
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="kanban">
            {cols.map(col=>(
              <div className="kanban-col" key={col.label}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('leadId'); if (id) moveCard(id, col.label) }}>
                <div className="kanban-col-head">
                  <div className="bar" style={{'--col-color': col.color}}/>
                  <span className="title">{col.label}</span>
                  <span className="count">{col.items.length}</span>
                </div>
                {col.items.map(l=>(
                  <div className="kanban-card" key={l.id} draggable
                    onDragStart={e => e.dataTransfer.setData('leadId', l.id)}
                    onClick={() => setEditing(l)}>
                    <div className="name">{l.empresa}</div>
                    <div className="sub">{l.servicio}</div>
                    <div className="meta">
                      <div className="avatar xs">{l.responsable}</div>
                      <span>{l.ciudad}</span>
                      <span className="amount">€{eur(l.monto||0)}</span>
                    </div>
                    <button className="btn sm ghost" style={{marginTop:8,width:'100%',fontSize:11}}
                      onClick={e => { e.stopPropagation(); setMovingId(l.id) }}>
                      Mover →
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'lista' && (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Empresa</th><th>Sector</th><th>Servicio</th><th>Estado</th><th>Origen</th><th>Próximo paso</th><th>Resp.</th><th style={{textAlign:'right'}}>Importe</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                const tempColor = l.temp==='hot'?'#FF5A6A':l.temp==='warm'?'#FFB547':l.temp==='cold'?'#6B7590':'#3ECF8E'
                return (
                  <tr key={l.id} style={{cursor:'pointer'}} onClick={() => setEditing(l)}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <div style={{width:8, height:8, borderRadius:'50%', background:tempColor, boxShadow:`0 0 8px ${tempColor}`, flexShrink:0}}/>
                        <div><div className="primary">{l.empresa}</div><div className="muted" style={{fontSize:11.5}}>{l.ciudad}</div></div>
                      </div>
                    </td>
                    <td className="muted">{l.sector}</td>
                    <td className="muted">{l.servicio}</td>
                    <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                    <td className="muted small">{l.origen}</td>
                    <td className="muted small">{l.next}</td>
                    <td><div className="avatar sm">{l.responsable}</div></td>
                    <td className="mono" style={{textAlign:'right'}}>{l.monto ? `€${eur(l.monto)}` : <span className="muted">—</span>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <RowMenu
                        onEdit={() => setEditing(l)}
                        onDelete={() => { if (confirm(`¿${['Cobrado','Denegado'].includes(l.estado) ? 'Quitar del pipeline' : 'Eliminar'} "${l.empresa}"?`)) data.deleteLead?.(l.id) }}
                      />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{textAlign:'center', padding:'32px 0', color:'var(--text-4)', fontSize:13}}>Sin leads en esta vista</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <LeadModal
          lead={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
          onDelete={id => { data.deleteLead?.(id); setEditing(null) }}
        />
      )}

      {cobradoLead && (
        <LeadModal
          lead={cobradoLead}
          onClose={() => setCobradoLead(null)}
          onSave={(form) => { data.updateLead?.(form.id, form); setCobradoLead(null) }}
          onDelete={id => { data.deleteLead?.(id); setCobradoLead(null) }}
        />
      )}
    </div>
  )
}
