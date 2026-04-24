import React, { useState, useEffect } from 'react'
import { I } from './Icons'
import { Modal, F, SelectOrText, CustomSelect } from './Modal'
import { PIPELINE_COLS, STATE_COLORS, eur } from './data'

// ── Finanzas ─────────────────────────────────────────────────────

function CobroModal({ cobro, onClose, onSave }) {
  const isNew = !cobro?.id
  const [form, setForm] = useState(cobro ? { ...cobro, monto: cobro.monto ?? '' } : {
    cliente:'', concepto:'', monto:'', vence:'', vencida:false, pagado:false,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal open title={isNew ? 'Nueva factura' : 'Editar factura'}
      onClose={onClose} onSave={() => onSave({ ...form, monto: parseFloat(form.monto) || 0 })} saveLabel={isNew ? 'Añadir factura' : 'Guardar'}>
      <F label="Cliente"><input value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Ej: Bodegas Altura" autoFocus /></F>
      <F label="Concepto"><input value={form.concepto||''} onChange={e => set('concepto', e.target.value)} placeholder="Ej: Mantenimiento mensual" /></F>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
        <F label="Fecha de vencimiento"><input type="date" value={form.vence||''} onChange={e => set('vence', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Estado">
          <CustomSelect value={form.pagado?'pagado':form.vencida?'vencida':'pendiente'}
            onChange={v => setForm(f => ({ ...f, pagado: v==='pagado', vencida: v==='vencida' }))}
            options={[{value:'pendiente',label:'Pendiente'},{value:'vencida',label:'Vencida'},{value:'pagado',label:'Pagada'}]} />
        </F>
      </div>
    </Modal>
  )
}

function GastoModal({ gasto, onClose, onSave, onDelete }) {
  const isNew = !gasto?.id
  const [form, setForm] = useState(gasto || {
    concepto:'', tipo:'Herramienta', monto:'', recurrente:false, fecha:'',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo gasto' : 'Editar gasto'}
      onClose={onClose} onSave={() => onSave({ ...form, monto: parseFloat(form.monto) || 0 })} saveLabel={isNew ? 'Añadir gasto' : 'Guardar'}>
      <F label="Concepto"><input value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Ej: OpenAI — API" autoFocus /></F>
      <div className="form-2col">
        <F label="Tipo">
          <SelectOrText value={form.tipo||'Herramienta'} onChange={v => set('tipo', v)} options={['IA','Infra','Herramienta','Personas','Otro']} placeholder="Ej: Marketing…" />
        </F>
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Fecha"><input type="date" value={form.fecha||''} onChange={e => set('fecha', e.target.value)} /></F>
        <F label="Recurrente">
          <CustomSelect value={form.recurrente?'si':'no'} onChange={v => set('recurrente', v==='si')}
            options={[{value:'no',label:'No — pago único'},{value:'si',label:'Sí — mensual'}]} />
        </F>
      </div>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete?.(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar gasto</button>
          }
        </div>
      )}
    </Modal>
  )
}

export function Finanzas({ role, data }) {
  const gastos = data?.gastos || []
  const cobros = data?.cobros || []
  const [addingGasto, setAddingGasto]   = useState(false)
  const [editingGasto, setEditingGasto] = useState(null)
  const [addingCobro, setAddingCobro]   = useState(false)
  const [editingCobro, setEditingCobro] = useState(null)

  if (role !== 'admin') {
    return (
      <div className="card fade-in" style={{marginTop:40}}>
        <div className="locked">
          <I.Lock size={28}/>
          <h3>Zona privada — solo admins</h3>
          <p>El módulo de finanzas está restringido a usuarios con rol de administrador.</p>
        </div>
      </div>
    )
  }

  const pendientes  = cobros.filter(c => !c.pagado)
  const pagados     = cobros.filter(c => c.pagado)
  const ingresosMes = pagados.reduce((a,c) => a + (c.monto||0), 0)
  const cobrosPend  = pendientes.reduce((a,c) => a + (c.monto||0), 0)
  const gastosMes   = gastos.reduce((a,g) => a + (g.monto||0), 0)
  const gastoIA     = gastos.filter(g => g.tipo === 'IA').reduce((a,g) => a + (g.monto||0), 0)
  const gastoInfra  = gastos.filter(g => g.tipo === 'Infra').reduce((a,g) => a + (g.monto||0), 0)
  const gastoHerr   = gastos.filter(g => g.tipo === 'Herramienta').reduce((a,g) => a + (g.monto||0), 0)
  const gastoPerso  = gastos.filter(g => g.tipo === 'Personas').reduce((a,g) => a + (g.monto||0), 0)
  const margen      = (ingresosMes + cobrosPend) > 0
    ? Math.round((ingresosMes - gastosMes) / (ingresosMes + cobrosPend) * 100)
    : 100

  const handleSaveCobro = (form) => {
    if (form.id) data.updateCobro?.(form.id, form)
    else data.addCobro?.(form)
    setAddingCobro(false); setEditingCobro(null)
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Visión ejecutiva del negocio · {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setAddingCobro(true)}><I.Plus size={13}/> Nueva factura</button>
          <button className="btn primary" onClick={() => setAddingGasto(true)}><I.Plus size={13}/> Añadir gasto</button>
        </div>
      </div>

      <div className="grid-3" style={{marginBottom:16}}>
        <div className="fin-card accent">
          <div className="label">Ingresos cobrados</div>
          <div className="big"><span className="currency">€</span>{eur(ingresosMes)}</div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginTop:10}}>
            <span className="chip green"><span className="dot"/>{pagados.length} cobro{pagados.length!==1?'s':''}</span>
            {pendientes.length > 0 && <span className="chip amber"><span className="dot"/>{pendientes.length} pendiente{pendientes.length!==1?'s':''}</span>}
          </div>
          <div style={{height:8}}/>
          <div className="progress">
            <div className="bar" style={{width: ingresosMes > 0 ? `${Math.min(100, Math.round(ingresosMes/20000*100))}%` : '0%'}}/>
          </div>
          <div className="small" style={{color:'var(--text-3)', marginTop:6}}>
            {ingresosMes > 0 ? `${Math.min(100, Math.round(ingresosMes/20000*100))}% del objetivo €20.000` : 'Sin cobros aún'}
          </div>
        </div>

        <div className="fin-card">
          <div className="label">Por cobrar</div>
          <div className="big"><span className="currency">€</span>{eur(cobrosPend)}</div>
          <div className="small" style={{color: pendientes.length > 0 ? 'var(--warn)' : 'var(--ok)', marginTop:8, fontFamily:'var(--font-mono)'}}>
            {pendientes.length > 0 ? `${pendientes.length} factura${pendientes.length!==1?'s':''} sin cobrar` : 'Todo cobrado ✓'}
          </div>
          <div style={{height:8}}/>
          <div className="progress">
            <div className="bar warn" style={{width: (ingresosMes+cobrosPend) > 0 ? `${Math.round(cobrosPend/(ingresosMes+cobrosPend)*100)}%` : '0%'}}/>
          </div>
          <div className="small" style={{color:'var(--text-3)', marginTop:6}}>
            {(ingresosMes+cobrosPend) > 0 ? `${Math.round(cobrosPend/(ingresosMes+cobrosPend)*100)}% del total aún no cobrado` : 'Añade facturas desde la tabla'}
          </div>
        </div>

        <div className="fin-card">
          <div className="label">Gastos del mes</div>
          <div className="big"><span className="currency">€</span>{eur(gastosMes)}</div>
          <div className="small" style={{color:'var(--text-3)', marginTop:8, fontFamily:'var(--font-mono)'}}>
            <span style={{color:'#9A7BFF'}}>●</span> IA €{gastoIA} · Infra €{gastoInfra} · Herr €{gastoHerr} · Pers €{gastoPerso}
          </div>
          <div style={{height:10}}/>
          {gastosMes > 0 && (
            <div style={{display:'flex', height:6, borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,0.05)'}}>
              <div style={{width:`${Math.round(gastoIA/gastosMes*100)}%`, background:'#9A7BFF'}}/>
              <div style={{width:`${Math.round(gastoInfra/gastosMes*100)}%`, background:'#4F8BFF'}}/>
              <div style={{width:`${Math.round(gastoHerr/gastosMes*100)}%`, background:'#3ECF8E'}}/>
              <div style={{width:`${Math.round(gastoPerso/gastosMes*100)}%`, background:'#FFB547'}}/>
            </div>
          )}
          <div className="small" style={{color:'var(--text-3)', marginTop:12}}>Margen estimado: <span style={{color: margen>=60?'var(--ok)':margen>=30?'var(--warn)':'var(--danger)', fontFamily:'var(--font-mono)'}}>{margen}%</span></div>
        </div>
      </div>

      <div className="grid-main-side">
        <div className="card">
          <div className="card-head">
            <h3>Todas las facturas</h3>
            <div className="right">
              <button className="btn sm" onClick={() => setAddingCobro(true)}><I.Plus size={12}/></button>
            </div>
          </div>
          {cobros.length === 0 ? (
            <div className="small" style={{color:'var(--text-4)', textAlign:'center', padding:'24px 0'}}>
              Sin facturas — añade tu primera factura con el botón de arriba
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Concepto</th>
                  <th style={{textAlign:'right'}}>Importe</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cobros.map(c => (
                  <tr key={c.id} style={{cursor:'pointer'}} onClick={() => setEditingCobro(c)}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:7}}>
                        <span className="primary">{c.cliente}</span>
                        {c.recurrente && (
                          <span style={{fontSize:10, fontWeight:600, color:'var(--ok)', background:'rgba(62,207,142,0.12)', padding:'1px 6px', borderRadius:12}}>
                            ↺ {c.frecuencia || 'Recurrente'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="muted small">{c.concepto}</td>
                    <td className="mono" style={{textAlign:'right'}}>€{eur(c.monto||0)}</td>
                    <td className="muted">
                      {c.vence || '—'}
                      {!c.pagado && c.vence && (() => {
                        const dias = Math.floor((Date.now() - new Date(c.vence + 'T00:00:00')) / 86400000)
                        if (dias < 0) return null
                        const col = dias < 15 ? '#3ECF8E' : dias < 30 ? '#FFB547' : '#FF5A6A'
                        return <span style={{marginLeft:6, fontSize:10.5, fontWeight:600, color:col, fontFamily:'var(--font-mono)'}}>+{dias}d</span>
                      })()}
                    </td>
                    <td>
                      {c.pagado
                        ? <span className="chip green"><span className="dot"/>Pagada</span>
                        : c.vencida
                          ? <span className="chip red"><span className="dot"/>Vencida</span>
                          : <span className="chip amber"><span className="dot"/>Pendiente</span>
                      }
                    </td>
                    <td style={{display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
                      {!c.pagado && (
                        <button className="btn sm" style={{padding:'3px 10px', fontSize:12}}
                          onClick={e => { e.stopPropagation(); data.updateCobro?.(c.id, { pagado: true, vencida: false }) }}>
                          ✓ Cobrado
                        </button>
                      )}
                      <button className="icon-btn" style={{width:24, height:24, color:'var(--text-4)'}}
                        onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar factura de ${c.cliente}?`)) data.deleteCobro?.(c.id) }}>
                        <I.Close size={11}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Gastos recientes</h3>
            <div className="right"><button className="btn sm" onClick={() => setAddingGasto(true)}><I.Plus size={12}/></button></div>
          </div>
          <div>
            {gastos.map(g => {
              const typeColor = g.tipo==='IA'?'#9A7BFF':g.tipo==='Infra'?'#4F8BFF':g.tipo==='Personas'?'#FFB547':'#3ECF8E'
              return (
                <div className="task" key={g.id} style={{cursor:'pointer'}} onClick={() => setEditingGasto(g)}>
                  <div style={{width:30, height:30, borderRadius:8, background:`${typeColor}22`, color:typeColor, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}><I.Receipt size={14}/></div>
                  <div style={{flex:1, minWidth:0}}>
                    <div className="title">{g.concepto}</div>
                    <div className="sub">{g.tipo} · {g.fecha} {g.recurrente && <span style={{color:'var(--brand-3)'}}>· recurrente</span>}</div>
                  </div>
                  <div className="mono" style={{fontSize:13}}>€{eur(g.monto||0)}</div>
                  <button className="icon-btn" style={{width:22, height:22, color:'var(--text-4)'}}
                    onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${g.concepto}"?`)) data.deleteGasto?.(g.id) }}>
                    <I.Close size={11}/>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {(addingCobro || editingCobro) && (
        <CobroModal
          cobro={editingCobro}
          onClose={() => { setAddingCobro(false); setEditingCobro(null) }}
          onSave={handleSaveCobro}
        />
      )}
      {(addingGasto || editingGasto) && (
        <GastoModal
          gasto={editingGasto}
          onClose={() => { setAddingGasto(false); setEditingGasto(null) }}
          onSave={form => {
            if (form.id) data.updateGasto?.(form.id, form)
            else data.addGasto?.(form)
            setAddingGasto(false); setEditingGasto(null)
          }}
          onDelete={id => { data.deleteGasto?.(id); setEditingGasto(null) }}
        />
      )}
    </div>
  )
}

// ── Ajustes ──────────────────────────────────────────────────────

function ServicioModal({ servicio, onClose, onSave }) {
  const isNew = !servicio
  const [form, setForm] = useState(servicio || { n:'', base:0, activo:true, color:'#4F8BFF' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const COLORS = ['#4F8BFF','#9A7BFF','#3ECF8E','#FFB547','#FF5A6A','#F0A050']

  return (
    <Modal open title={isNew ? 'Nuevo servicio' : `Editar — ${form.n}`}
      onClose={onClose} onSave={() => onSave(form)} saveLabel={isNew ? 'Añadir servicio' : 'Guardar'}>
      <F label="Nombre del servicio"><input value={form.n} onChange={e => set('n', e.target.value)} autoFocus /></F>
      <F label="Precio base (€)"><input type="number" min="0" value={form.base} onChange={e => set('base', Number(e.target.value))} /></F>
      <F label="Color">
        <div style={{display:'flex', gap:8, flexWrap:'wrap', paddingTop:4}}>
          {COLORS.map(c=>(
            <div key={c} onClick={() => set('color', c)}
              style={{width:26, height:26, borderRadius:7, background:c, cursor:'pointer',
                boxShadow: form.color===c ? `0 0 0 2px white, 0 0 0 4px ${c}` : `0 0 8px ${c}66`}}/>
          ))}
        </div>
      </F>
      <F label="Activo">
        <CustomSelect value={form.activo?'si':'no'} onChange={v => set('activo', v==='si')}
          options={[{value:'si',label:'Sí'},{value:'no',label:'No (desactivado)'}]} />
      </F>
    </Modal>
  )
}

const DEFAULT_USUARIOS = [
  { id:1, n:'Lucía P.',    rol:'Admin',    email:'lucia@agentia.com',  ini:'LP', estado:'activo' },
  { id:2, n:'Andrés R.',   rol:'Empleado', email:'andres@agentia.com', ini:'AR', estado:'activo' },
]

const DEFAULT_SERVICIOS = [
  { id:1, n:'Página web premium',       base:2500, activo:true,  color:'#4F8BFF' },
  { id:2, n:'Automatización WhatsApp',  base:1800, activo:true,  color:'#9A7BFF' },
  { id:3, n:'Chatbot de reservas',      base:1600, activo:true,  color:'#3ECF8E' },
  { id:4, n:'Mantenimiento mensual',    base:120,  activo:true,  color:'#FFB547' },
  { id:5, n:'Campaña captación',        base:900,  activo:false, color:'#FF5A6A' },
]

function initials(name) {
  return (name || '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0,2).toUpperCase() || '?'
}

function UsuarioModal({ usuario, onClose, onSave, onDelete }) {
  const isNew = !usuario?.id
  const [form, setForm] = useState(usuario || { n:'', rol:'Empleado', email:'', estado:'activo' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <Modal open title={isNew ? 'Nuevo usuario' : `Editar — ${form.n}`}
      onClose={onClose} onSave={() => onSave({ ...form, ini: initials(form.n) })}
      saveLabel={isNew ? 'Crear usuario' : 'Guardar'}>
      <F label="Nombre completo">
        <input value={form.n} onChange={e => set('n', e.target.value)} placeholder="Ej: Unai López" autoFocus />
      </F>
      <div className="form-2col">
        <F label="Email">
          <input value={form.email||''} onChange={e => set('email', e.target.value)} placeholder="unai@agentia.com" />
        </F>
        <F label="Rol">
          <CustomSelect value={form.rol||'Empleado'} onChange={v => set('rol', v)} options={['Admin','Empleado']} />
        </F>
      </div>
      <F label="Estado">
        <CustomSelect value={form.estado||'activo'} onChange={v => set('estado', v)} options={[{value:'activo',label:'Activo'},{value:'inactivo',label:'Inactivo'}]} />
      </F>
      {!isNew && (
        <div className="modal-danger-zone">
          <span>Zona peligrosa</span>
          {confirmDel
            ? <button className="btn danger sm" onClick={() => { onDelete(form.id); onClose() }}>¿Confirmar eliminación?</button>
            : <button className="btn sm ghost" onClick={() => setConfirmDel(true)} style={{color:'var(--danger)'}}>Eliminar usuario</button>
          }
        </div>
      )}
    </Modal>
  )
}

export function Ajustes({ role }) {
  if (role !== 'admin') {
    return (
      <div className="card fade-in" style={{marginTop:40}}>
        <div className="locked">
          <I.Lock size={28}/>
          <h3>Solo admins pueden editar esta sección</h3>
          <p>Pide acceso a un administrador para modificar servicios o usuarios.</p>
        </div>
      </div>
    )
  }

  const [tab, setTab] = useState('servicios')

  const [servicios, setServicios] = useState(() => {
    try { const s = localStorage.getItem('agentia_servicios'); return s ? JSON.parse(s) : DEFAULT_SERVICIOS } catch { return DEFAULT_SERVICIOS }
  })
  useEffect(() => { localStorage.setItem('agentia_servicios', JSON.stringify(servicios)) }, [servicios])

  const [editingServicio, setEditingServicio] = useState(null)
  const [addingServicio, setAddingServicio] = useState(false)

  const toggleServicio = (id) => setServicios(prev => prev.map(s => s.id===id ? {...s, activo:!s.activo} : s))
  const saveServicio = (form) => {
    if (form.id) setServicios(prev => prev.map(s => s.id===form.id ? form : s))
    else setServicios(prev => [...prev, { ...form, id: Date.now() }])
    setEditingServicio(null); setAddingServicio(false)
  }

  const [usuarios, setUsuarios] = useState(() => {
    try { const u = localStorage.getItem('agentia_usuarios'); return u ? JSON.parse(u) : DEFAULT_USUARIOS } catch { return DEFAULT_USUARIOS }
  })
  useEffect(() => { localStorage.setItem('agentia_usuarios', JSON.stringify(usuarios)) }, [usuarios])

  const [editingUsuario, setEditingUsuario] = useState(null)
  const [addingUsuario, setAddingUsuario] = useState(false)

  const saveUsuario = (form) => {
    if (form.id) setUsuarios(prev => prev.map(u => u.id===form.id ? form : u))
    else setUsuarios(prev => [...prev, { ...form, id: Date.now() }])
    setEditingUsuario(null); setAddingUsuario(false)
  }
  const deleteUsuario = (id) => setUsuarios(prev => prev.filter(u => u.id !== id))

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ajustes</h1>
          <p className="page-subtitle">Configura servicios, usuarios y permisos del sistema</p>
        </div>
      </div>

      <div className="segmented" style={{marginBottom:16}}>
        <button className={tab==='servicios'?'active':''} onClick={()=>setTab('servicios')}>Servicios</button>
        <button className={tab==='usuarios'?'active':''} onClick={()=>setTab('usuarios')}>Usuarios y roles</button>
        <button className={tab==='estados'?'active':''} onClick={()=>setTab('estados')}>Estados y etiquetas</button>
        <button className={tab==='marca'?'active':''} onClick={()=>setTab('marca')}>Marca</button>
      </div>

      {tab === 'servicios' && (
        <div className="card">
          <div className="card-head">
            <h3>Catálogo de servicios</h3>
            <span className="sub">· {servicios.filter(s=>s.activo).length} activos</span>
            <div className="right">
              <button className="btn primary" onClick={() => setAddingServicio(true)}><I.Plus size={13}/> Añadir servicio</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Servicio</th><th>Precio base</th><th>Activo</th><th></th></tr></thead>
            <tbody>
              {servicios.map(s=>(
                <tr key={s.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div style={{width:8, height:8, borderRadius:3, background:s.color, boxShadow:`0 0 8px ${s.color}`}}/>
                      <span className="primary">{s.n}</span>
                    </div>
                  </td>
                  <td className="mono">€{eur(s.base)}</td>
                  <td>
                    <div className={`toggle ${s.activo?'on':''}`} style={{cursor:'pointer'}} onClick={() => toggleServicio(s.id)}/>
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn sm ghost" onClick={() => setEditingServicio(s)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="card">
          <div className="card-head">
            <h3>Equipo y permisos</h3>
            <span className="sub">· {usuarios.length} usuario{usuarios.length!==1?'s':''}</span>
            <div className="right">
              <button className="btn primary" onClick={() => setAddingUsuario(true)}><I.Plus size={13}/> Añadir usuario</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div className="avatar" style={u.estado==='inactivo'?{background:'rgba(255,255,255,0.05)', color:'var(--text-3)'}:{}}>{u.ini || initials(u.n)}</div>
                      <span className="primary">{u.n}</span>
                    </div>
                  </td>
                  <td className="muted">{u.email || '—'}</td>
                  <td>
                    {u.rol==='Admin'
                      ? <span className="chip blue"><span className="dot"/>Admin</span>
                      : <span className="chip gray"><span className="dot"/>Empleado</span>
                    }
                  </td>
                  <td>
                    {u.estado==='activo'
                      ? <span className="chip green"><span className="dot"/>Activo</span>
                      : <span className="chip amber"><span className="dot"/>Inactivo</span>
                    }
                  </td>
                  <td style={{textAlign:'right'}}>
                    <button className="btn sm ghost" onClick={() => setEditingUsuario(u)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'estados' && (
        <div className="card">
          <div className="card-head"><h3>Estados del pipeline</h3></div>
          <div className="card-body" style={{display:'flex', flexWrap:'wrap', gap:10}}>
            {PIPELINE_COLS.map(s=>(
              <div key={s} style={{display:'flex', alignItems:'center', gap:8, padding:'8px 14px', border:'1px solid var(--line-2)', borderRadius:10, background:'rgba(255,255,255,0.02)'}}>
                <div style={{width:10, height:10, borderRadius:3, background:STATE_COLORS[s]?.color, boxShadow:`0 0 8px ${STATE_COLORS[s]?.color}`}}/>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'marca' && (
        <div className="card">
          <div className="card-head"><h3>Identidad Agentia</h3></div>
          <div className="card-body" style={{display:'flex', alignItems:'center', gap:24}}>
            <div style={{width:96, height:96, borderRadius:18, backgroundImage:'url(/assets/logo-agentia.jpeg)', backgroundSize:'cover', boxShadow:'0 0 0 1px var(--line-2), 0 10px 30px -6px rgba(45,107,255,0.4)'}}/>
            <div>
              <div style={{fontSize:18, fontWeight:600}}>Agentia</div>
              <div className="small" style={{color:'var(--text-3)'}}>Logo oficial · subido 23 abr 2026</div>
              <div style={{display:'flex', gap:8, marginTop:10}}>
                <button className="btn sm"><I.Upload size={12}/> Reemplazar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(editingServicio || addingServicio) && (
        <ServicioModal
          servicio={editingServicio}
          onClose={() => { setEditingServicio(null); setAddingServicio(false) }}
          onSave={saveServicio}
        />
      )}

      {(editingUsuario || addingUsuario) && (
        <UsuarioModal
          usuario={editingUsuario}
          onClose={() => { setEditingUsuario(null); setAddingUsuario(false) }}
          onSave={saveUsuario}
          onDelete={deleteUsuario}
        />
      )}
    </div>
  )
}
