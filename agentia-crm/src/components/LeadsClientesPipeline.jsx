import React, { useState, useEffect, useRef } from 'react'
import { I } from './Icons'
import { Modal, F, SelectOrText, CustomSelect } from './Modal'
import { STATE_COLORS, PIPELINE_COLS, STAGE, STAGES_CLOSED, eur } from './data'

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

function getServicios() {
  try {
    const s = JSON.parse(localStorage.getItem('agentia_servicios') || '[]')
    const active = s.filter(x => x.activo).map(x => x.n)
    return active.length ? active : ['Web premium','Automatización WhatsApp','Chatbot de reservas','Mantenimiento mensual','Campaña captación']
  } catch { return ['Web premium','Automatización WhatsApp','Chatbot de reservas'] }
}

// ── Activity log (localStorage) ─────────────────────────────────
const ACT_TYPES = [
  { id:'llamada', label:'Llamada', icon:'📞' },
  { id:'email',   label:'Email',   icon:'✉️' },
  { id:'reunion', label:'Reunión', icon:'🤝' },
  { id:'nota',    label:'Nota',    icon:'📝' },
]
function getAct(leadId) {
  if (!leadId) return []
  try { return JSON.parse(localStorage.getItem(`agentia_act_${leadId}`) || '[]') } catch { return [] }
}
function saveAct(leadId, arr) {
  localStorage.setItem(`agentia_act_${leadId}`, JSON.stringify(arr))
}
function diasSinActiv(leadId, createdAt) {
  const acts = getAct(leadId)
  const ref = acts.length ? new Date(acts[0].fecha) : (createdAt ? new Date(createdAt) : new Date())
  return Math.floor((Date.now() - ref) / 86400000)
}
function getStageTime(leadId) {
  try { return localStorage.getItem(`agentia_stagetime_${leadId}`) } catch { return null }
}

// ── Presupuesto generator ────────────────────────────────────────
function generarPresupuesto(lead) {
  const fecha = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })
  let agencyName = 'Agentia', agencyEmail = 'agentiacantabria@gmail.com', agencyPhone = ''
  try {
    const s = JSON.parse(localStorage.getItem('agentia_settings') || '{}')
    if (s.nombre)   agencyName  = s.nombre
    if (s.email)    agencyEmail = s.email
    if (s.telefono) agencyPhone = s.telefono
  } catch {}
  const monto = parseFloat(lead.monto) || 0
  const num = `PRES-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Presupuesto — ${lead.empresa}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,sans-serif;background:#fff;color:#111;padding:48px 56px;max-width:780px;margin:0 auto;font-size:14px;line-height:1.6}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #111;margin-bottom:36px}
.agency{font-size:22px;font-weight:700}
.agency-sub{font-size:12px;color:#777;margin-top:3px}
.doc-num{font-size:12px;color:#777;text-align:right}
.doc-num strong{display:block;font-size:16px;color:#111;margin-bottom:3px}
h1{font-size:26px;font-weight:700;margin-bottom:6px}
.para{color:#555;margin-bottom:32px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:36px}
.box{background:#f6f6f6;border-radius:10px;padding:16px 20px}
.box-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:6px}
.box-val{font-size:15px;font-weight:600}
.box-sub{font-size:12px;color:#777;margin-top:3px}
table{width:100%;border-collapse:collapse;margin-bottom:28px}
th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;text-align:left;padding:8px 0;border-bottom:1px solid #ddd}
td{padding:14px 0;border-bottom:1px solid #f0f0f0}
.right{text-align:right}
.total td{font-weight:700;font-size:16px;border-top:2px solid #111;border-bottom:none;padding-top:14px}
.conds{font-size:12px;color:#888;border-top:1px solid #eee;padding-top:20px;margin-top:20px;white-space:pre-line}
.footer{margin-top:48px;display:flex;justify-content:space-between;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:16px}
.print-btn{margin-top:32px;background:#111;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600}
@media print{.print-btn{display:none}@page{margin:32px}}
</style></head>
<body>
<div class="header">
  <div><div class="agency">${agencyName}</div><div class="agency-sub">Automatizaciones · Presencia Digital</div></div>
  <div class="doc-num"><strong>${num}</strong>${fecha}</div>
</div>
<h1>Propuesta de servicios</h1>
<p class="para">Preparado para <strong>${lead.empresa}</strong>${lead.contacto ? ` — ${lead.contacto}` : ''}</p>
<div class="grid">
  <div class="box"><div class="box-label">Cliente</div><div class="box-val">${lead.empresa}</div>${lead.sector ? `<div class="box-sub">${lead.sector}${lead.ciudad ? ` · ${lead.ciudad}` : ''}</div>` : ''}</div>
  <div class="box"><div class="box-label">Contacto</div><div class="box-val">${lead.contacto || '—'}</div>${lead.email ? `<div class="box-sub">${lead.email}</div>` : ''}${lead.telefono ? `<div class="box-sub">${lead.telefono}</div>` : ''}</div>
</div>
<table>
  <thead><tr><th>Descripción</th><th class="right">Importe</th></tr></thead>
  <tbody>
    <tr><td>${lead.servicio || 'Servicio personalizado'}${lead.notas ? `<br><span style="font-size:12px;color:#888">${lead.notas}</span>` : ''}</td><td class="right">€${monto.toLocaleString('es-ES')}</td></tr>
    <tr class="total"><td>Total (IVA no incluido)</td><td class="right">€${monto.toLocaleString('es-ES')}</td></tr>
  </tbody>
</table>
<div class="conds">Presupuesto válido por 30 días.
Pago: 50% señal + 50% al entregar.
Los presupuestos no incluyen IVA.</div>
<div class="footer"><span>${agencyName} · ${agencyEmail}${agencyPhone ? ` · ${agencyPhone}` : ''}</span><span>Generado el ${fecha}</span></div>
<button class="print-btn" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Leads ────────────────────────────────────────────────────────

function LeadModal({ lead, onClose, onSave, onDelete, resp: RESP = [] }) {
  const isNew = !lead?.id
  const SERVICIOS = getServicios()
  const [form, setForm] = useState(lead ? { ...lead, monto: lead.monto ?? '', crearProyecto: false, tipo: lead.tipo || 'Proyecto', montoRecurrente: '', frecuencia: 'Mensual', pagoDividido: false, señalPct: 50 } : {
    empresa:'', sector:'', ciudad:'', contacto:'', telefono:'', email:'',
    responsable: RESP[0] || '', servicio: SERVICIOS[0] || 'Web premium',
    estado:'Cliente Nuevo', next:'', monto:'', origen:'Instagram', origenCustom:'', notas:'',
    crearProyecto: false, tipo: 'Proyecto', montoRecurrente: '', frecuencia: 'Mensual', pagoDividido: false, señalPct: 50,
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
          <CustomSelect value={form.origen||'Instagram'} onChange={v => set('origen', v)} options={['Instagram','LinkedIn','Referido','Formulario web','Evento','Otro']} />
        </F>
      </div>
      {form.origen === 'Otro' && (
        <F label="Especifica el origen"><input value={form.origenCustom||''} onChange={e => set('origenCustom', e.target.value)} placeholder="Ej: Feria, podcast, amigo…" /></F>
      )}
      <div className="form-2col">
        <F label="Estado">
          <CustomSelect value={form.estado||'Cliente Nuevo'} onChange={v => set('estado', v)} options={PIPELINE_COLS} />
        </F>
        <F label="Responsable">
          <CustomSelect value={form.responsable||RESP[0]||''} onChange={v => set('responsable', v)} options={RESP} />
        </F>
      </div>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.monto ?? ''} onChange={e => set('monto', e.target.value)} /></F>
        <F label="Próximo paso"><input value={form.next||''} onChange={e => set('next', e.target.value)} placeholder="Llamar el lunes…" /></F>
      </div>
      <F label="Notas"><textarea value={form.notas||''} onChange={e => set('notas', e.target.value)} placeholder="Detalles adicionales…" /></F>

      {!isNew && <ActivitySection leadId={lead?.id} defaultResp={form.responsable} />}

      {form.estado === 'Cobrado' && (
        <div style={{display:'flex', flexDirection:'column', gap:10, padding:'14px', background:'rgba(62,207,142,0.06)', border:'1px solid rgba(62,207,142,0.2)', borderRadius:10}}>
          <div className="form-2col">
            <F label="Tipo de cliente">
              <CustomSelect value={form.tipo || 'Proyecto'} onChange={v => set('tipo', v)} options={[{value:'Proyecto',label:'Proyecto — pago único cerrado'},{value:'Recurrente',label:'Recurrente — cuota periódica'}]} />
            </F>
            <F label="¿Crear proyecto?">
              <CustomSelect value={form.crearProyecto ? 'si' : 'no'} onChange={v => set('crearProyecto', v === 'si')} options={[{value:'no',label:'No por ahora'},{value:'si',label:'Sí — crear proyecto'}]} />
            </F>
          </div>

          {form.tipo === 'Proyecto' && (
            <div>
              <F label="Estructura de cobro">
                <CustomSelect value={form.pagoDividido ? 'dividido' : 'unico'}
                  onChange={v => set('pagoDividido', v === 'dividido')}
                  options={[{value:'unico',label:'Pago único — cobrar todo ahora'},{value:'dividido',label:'En dos partes — señal ahora · resto al entregar'}]} />
              </F>
              {form.pagoDividido && (
                <div style={{marginTop:10, padding:'10px 12px', background:'rgba(62,207,142,0.06)', border:'1px solid rgba(62,207,142,0.15)', borderRadius:8}}>
                  <div style={{fontSize:11.5, color:'var(--text-3)', marginBottom:8}}>Señal ahora: <b style={{color:'var(--text-1)'}}>{form.señalPct}%</b></div>
                  <input type="range" min="10" max="90" step="5" value={form.señalPct||50}
                    onChange={e => set('señalPct', Number(e.target.value))}
                    style={{width:'100%', accentColor:'var(--brand)', marginBottom:8}} />
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5}}>
                    <span>Señal: <b style={{color:'var(--ok)'}}>€{Math.round((parseFloat(form.monto)||0) * (form.señalPct||50) / 100).toLocaleString('es-ES')}</b> · cobrada ya</span>
                    <span>Resto: <b style={{color:'var(--warn)'}}>€{((parseFloat(form.monto)||0) - Math.round((parseFloat(form.monto)||0) * (form.señalPct||50) / 100)).toLocaleString('es-ES')}</b> · al entregar</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {form.tipo === 'Recurrente' && (
            <div className="form-2col">
              <F label="Cuota (€)">
                <input type="number" min="0" placeholder="30" value={form.montoRecurrente||''} onChange={e => set('montoRecurrente', e.target.value)} />
              </F>
              <F label="Frecuencia">
                <CustomSelect value={form.frecuencia || 'Mensual'} onChange={v => set('frecuencia', v)} options={['Mensual','Semanal','Trimestral']} />
              </F>
            </div>
          )}
        </div>
      )}

      {!isNew && (
        <div style={{display:'flex', justifyContent:'flex-start', marginTop:4}}>
          <button className="btn sm ghost" style={{fontSize:11.5}} onClick={() => generarPresupuesto(form)}>
            📄 Generar presupuesto PDF
          </button>
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

// ── ActivitySection ──────────────────────────────────────────────
function ActivitySection({ leadId, defaultResp }) {
  const [items, setItems] = useState(() => getAct(leadId))
  const [tipo, setTipo] = useState('nota')
  const [texto, setTexto] = useState('')

  const add = () => {
    if (!texto.trim()) return
    const entry = { id: Date.now(), tipo, texto: texto.trim(), fecha: new Date().toISOString(), resp: defaultResp || '' }
    const updated = [entry, ...items]
    setItems(updated)
    saveAct(leadId, updated)
    setTexto('')
  }

  const remove = (id) => {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    saveAct(leadId, updated)
  }

  const fmt = (iso) => {
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return 'hoy'
    if (days === 1) return 'ayer'
    if (days < 7) return `hace ${days}d`
    return new Date(iso).toLocaleDateString('es-ES', { day:'numeric', month:'short' })
  }

  return (
    <div>
      <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--text-4)', padding:'14px 0 10px', borderTop:'1px solid var(--line-2)', marginTop:8}}>Actividad</div>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        <select className="select" style={{flexShrink:0, width:108, padding:'0 8px'}} value={tipo} onChange={e => setTipo(e.target.value)}>
          {ACT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <input className="input" style={{flex:1}} placeholder="Escribe aquí…" value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }} />
        <button className="btn primary sm" onClick={add} style={{flexShrink:0, padding:'0 12px'}}>+</button>
      </div>
      {items.length === 0 && (
        <div style={{fontSize:12, color:'var(--text-4)', textAlign:'center', padding:'10px 0 4px'}}>Sin actividad registrada aún</div>
      )}
      {items.map(item => {
        const t = ACT_TYPES.find(x => x.id === item.tipo) || ACT_TYPES[3]
        return (
          <div key={item.id} style={{display:'flex', gap:10, padding:'8px 0', borderTop:'1px solid var(--line-2)'}}>
            <div style={{fontSize:15, flexShrink:0, marginTop:2, width:20, textAlign:'center'}}>{t.icon}</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:2}}>
                <span style={{fontSize:11.5, fontWeight:600, color:'var(--text-2)'}}>{t.label}</span>
                <div style={{display:'flex', alignItems:'center', gap:6, flexShrink:0}}>
                  {item.resp && <div className="avatar xs" style={{fontSize:9,width:17,height:17}}>{item.resp}</div>}
                  <span style={{fontSize:10.5, color:'var(--text-4)'}}>{fmt(item.fecha)}</span>
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-4)',fontSize:14,lineHeight:1,padding:'0 2px',display:'flex',alignItems:'center'}} onClick={() => remove(item.id)}>×</button>
                </div>
              </div>
              <div style={{fontSize:12.5, color:'var(--text-1)', lineHeight:1.5, wordBreak:'break-word'}}>{item.texto}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Clientes ─────────────────────────────────────────────────────

function ClienteModal({ cliente, onClose, onSave, onDelete, resp: RESP = [] }) {
  const isNew = !cliente?.id
  const SERVICIOS = getServicios()
  const [form, setForm] = useState(cliente ? { ...cliente, importe: cliente.importe ?? '' } : {
    nombre:'', contacto:'', telefono:'', email:'',
    servicio: SERVICIOS[0] || 'Web premium', importe:'', estado:'En curso',
    tipo:'Proyecto', pagado:false, ajustes:0, responsable: RESP[0] || '', since:'',
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
          <CustomSelect value={form.responsable||RESP[0]||''} onChange={v => set('responsable', v)} options={RESP} />
        </F>
      </div>
      <div className="form-2col">
        <F label="Importe (€)"><input type="number" min="0" placeholder="0" value={form.importe ?? ''} onChange={e => set('importe', e.target.value)} /></F>
        <F label="Desde (ej: Abr 2026)"><input value={form.since||''} onChange={e => set('since', e.target.value)} /></F>
      </div>
      <div className="form-2col">
        <F label="Tipo">
          <CustomSelect value={form.tipo || 'Proyecto'} onChange={v => set('tipo', v)} options={[{value:'Proyecto',label:'Proyecto — pago único'},{value:'Recurrente',label:'Recurrente — cuota periódica'}]} />
        </F>
        <F label="Estado">
          <CustomSelect value={form.estado||'En curso'} onChange={v => set('estado', v)} options={['En curso','En revisión','Pagado · ajustes','Cerrado','Recurrente']} />
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

export function Clientes({ data, openItem, onItemOpened, currentUser }) {
  const clientes = data?.clientes || []
  const cobros   = data?.cobros   || []
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const myIni   = currentUser?.rol !== 'Admin' ? currentUser?.iniciales : null
  const allResp = [...new Set([...(myIni ? [myIni] : []), ...clientes.map(c => c.responsable).filter(Boolean)])]

  useEffect(() => {
    if (openItem?.type === 'Cliente' && openItem.item) {
      const c = clientes.find(c => c.id === openItem.item.id)
      if (c) { setEditing(c); onItemOpened?.() }
    }
  }, [openItem])

  const handleSave = (form) => {
    if (form.id) data.updateCliente?.(form.id, form)
    else data.addCliente?.(form)
    setEditing(null); setCreating(false)
  }

  const getTipo = (c) => c.tipo || (c.estado === 'Recurrente' ? 'Recurrente' : 'Proyecto')
  const recurrentes = clientes.filter(c => getTipo(c) === 'Recurrente')
  const proyectos   = clientes.filter(c => getTipo(c) !== 'Recurrente')

  const getRepCobro = (nombre) => {
    const all = cobros.filter(cb => cb.cliente === nombre && cb.recurrente)
    return all.filter(cb => !cb.pagado).sort((a,b) => (a.vence||'') < (b.vence||'') ? -1 : 1)[0]
        || all.find(cb => cb.pagado)
  }

  const mrr = recurrentes.reduce((sum, c) => sum + (getRepCobro(c.nombre)?.monto || 0), 0)
  const totalProyectos = proyectos.reduce((a, c) => a + (c.importe || 0), 0)

  const hoy = new Date(); hoy.setHours(0,0,0,0)

  const getChip = (estado) =>
    estado === 'Cerrado' ? 'gray' : estado === 'En curso' ? 'blue' : estado === 'En revisión' ? 'violet' : 'amber'

  const ClientCard = ({ c, isRecurrente }) => {
    const nextCobro = isRecurrente ? getRepCobro(c.nombre) : null
    const venceDate = nextCobro?.vence ? new Date(nextCobro.vence + 'T00:00:00') : null
    const dias = venceDate ? Math.floor((venceDate - hoy) / 86400000) : null
    const vencido = dias !== null && dias < 0
    const esHoy   = dias === 0

    return (
      <div className="card" style={{padding:'14px 16px', cursor:'pointer', marginBottom:8}} onClick={() => setEditing(c)}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{c.nombre}</div>
            <div style={{fontSize:11.5, color:'var(--text-3)', marginTop:2}}>{c.servicio || c.responsable || ''}</div>
          </div>
          <div style={{textAlign:'right', flexShrink:0}}>
            {isRecurrente ? (
              <>
                <div style={{fontWeight:700, color:'var(--ok)', fontSize:15}}>
                  €{eur(nextCobro?.monto || 0)}<span style={{fontSize:10, fontWeight:400, color:'var(--text-4)'}}>/mes</span>
                </div>
                {nextCobro && (
                  <div style={{fontSize:10.5, marginTop:2, color: vencido ? 'var(--danger)' : esHoy ? 'var(--warn)' : 'var(--text-4)'}}>
                    {vencido ? `⚠ Vencido ${Math.abs(dias)}d` : esHoy ? '⚠ Hoy' : nextCobro.vence}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{fontWeight:700, fontSize:15}}>€{eur(c.importe || 0)}</div>
                <span className="chip gray" style={{marginTop:4, display:'inline-flex', fontSize:10}}>
                  <span className="dot"/>Cerrado
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:0}}>
          <div style={{marginLeft:'auto'}} onClick={e => e.stopPropagation()}>
            <RowMenu
              onEdit={() => setEditing(c)}
              onDelete={() => { if (confirm(`¿Eliminar "${c.nombre}"?`)) data.deleteCliente?.(c.id) }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes</p>
        </div>
        <div className="page-actions">
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nuevo cliente</button>
        </div>
      </div>

      <div className="grid-2" style={{marginBottom:16}}>
        <div className="card" style={{padding:'16px 20px'}}>
          <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', color:'var(--text-4)', letterSpacing:.5, marginBottom:6}}>↺ Ingresos recurrentes</div>
          <div style={{fontSize:26, fontWeight:700, color:'var(--ok)'}}>€{eur(mrr)}<span style={{fontSize:13, fontWeight:400, color:'var(--text-3)'}}>/mes</span></div>
          <div style={{fontSize:12, color:'var(--text-4)', marginTop:2}}>{recurrentes.length} cliente{recurrentes.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card" style={{padding:'16px 20px'}}>
          <div style={{fontSize:11, fontWeight:600, textTransform:'uppercase', color:'var(--text-4)', letterSpacing:.5, marginBottom:6}}>Proyectos cerrados</div>
          <div style={{fontSize:26, fontWeight:700}}>€{eur(totalProyectos)}</div>
          <div style={{fontSize:12, color:'var(--text-4)', marginTop:2}}>{proyectos.length} cliente{proyectos.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="grid-2" style={{alignItems:'start'}}>
        <div>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--ok)', marginBottom:10, display:'flex', alignItems:'center', gap:6}}>
            ↺ Recurrentes <span style={{fontWeight:400, color:'var(--text-4)'}}>· {recurrentes.length}</span>
          </div>
          {recurrentes.length === 0
            ? <div className="card" style={{padding:'24px 16px', textAlign:'center', color:'var(--text-4)', fontSize:13}}>Sin clientes recurrentes</div>
            : recurrentes.map(c => <ClientCard key={c.id} c={c} isRecurrente={true} />)
          }
        </div>

        <div>
          <div style={{fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, color:'var(--text-3)', marginBottom:10, display:'flex', alignItems:'center', gap:6}}>
            Cerrados <span style={{fontWeight:400, color:'var(--text-4)'}}>· {proyectos.length}</span>
          </div>
          {proyectos.length === 0
            ? <div className="card" style={{padding:'24px 16px', textAlign:'center', color:'var(--text-4)', fontSize:13}}>Sin proyectos cerrados</div>
            : proyectos.map(c => <ClientCard key={c.id} c={c} isRecurrente={false} />)
          }
        </div>
      </div>

      {(editing || creating) && (
        <ClienteModal
          cliente={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
          onDelete={id => data.deleteCliente?.(id)}
          resp={allResp}
        />
      )}
    </div>
  )
}

// ── SeñalPagadaModal ─────────────────────────────────────────────

function SeñalPagadaModal({ lead, onClose, onConfirm }) {
  const total  = parseFloat(lead.monto) || 0
  const [señal, setSeñal] = useState(Math.round(total / 2))
  const señalNum = parseFloat(señal) || 0
  const resto  = total - señalNum
  const pct    = total > 0 ? Math.round(señalNum / total * 100) : 0
  const invalid = señalNum <= 0 || señalNum >= total

  return (
    <Modal open title={`Señal cobrada — ${lead.empresa}`} onClose={onClose}
      onSave={() => !invalid && onConfirm(señalNum)} saveLabel="Confirmar señal">
      <div style={{padding:'14px 16px', background:'rgba(46,196,182,0.07)', border:'1px solid rgba(46,196,182,0.2)', borderRadius:10, marginBottom:4}}>
        <div style={{fontSize:12, color:'var(--text-3)', marginBottom:2}}>Total del proyecto</div>
        <div style={{fontSize:26, fontWeight:700}}>€{eur(total)}</div>
      </div>
      <F label="Importe de la señal (€)">
        <input type="number" min="1" max={total - 1} value={señal}
          onChange={e => setSeñal(e.target.value)} autoFocus
          style={invalid ? {borderColor:'var(--danger)'} : {}} />
      </F>
      {invalid && (
        <div style={{fontSize:12, color:'var(--danger)', marginTop:-6, marginBottom:4}}>
          {señalNum <= 0 ? 'La señal debe ser mayor que 0' : `La señal no puede ser igual o mayor al total (€${eur(total)})`}
        </div>
      )}
      <div style={{padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--line-2)', borderRadius:10}}>
        <div style={{display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:8}}>
          <span style={{color:'#2EC4B6', fontWeight:600}}>Cobras hoy: €{eur(señalNum)}</span>
          <span style={{color:'var(--text-3)'}}>Al entregar: €{eur(Math.max(0, resto))}</span>
        </div>
        <div style={{height:6, background:'rgba(255,255,255,0.06)', borderRadius:3}}>
          <div style={{width:`${Math.min(100, pct)}%`, height:'100%', background:'#2EC4B6', borderRadius:3, transition:'width 0.2s'}}/>
        </div>
        <div style={{fontSize:11, color:'var(--text-4)', marginTop:6}}>{pct}% cobrado ahora · {100-pct}% al cerrar</div>
      </div>
    </Modal>
  )
}

// ── CobraRestoModal ──────────────────────────────────────────────

function CobraRestoModal({ lead, onClose, onConfirm }) {
  const SERVICIOS = getServicios()
  const total        = parseFloat(lead.monto) || 0
  const señalCobrada = parseFloat(lead.señal_cobrada) || 0
  const restoAuto    = total - señalCobrada
  const defaultVence = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0,10) })()
  const [vence, setVence]               = useState(defaultVence)
  const [tipo, setTipo]                 = useState('Proyecto')
  const [crearProyecto, setCrearProyecto] = useState(false)

  return (
    <Modal open title={`Cobrar resto — ${lead.empresa}`} onClose={onClose}
      onSave={() => onConfirm({ vence_resto: vence, tipo, crearProyecto })} saveLabel="Cerrar como cobrado">
      <div style={{padding:'12px 14px', background:'rgba(46,196,182,0.07)', border:'1px solid rgba(46,196,182,0.2)', borderRadius:10, marginBottom:4}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
          <span style={{fontSize:12.5, color:'var(--text-3)'}}>Total proyecto</span>
          <span className="mono">€{eur(total)}</span>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
          <span style={{fontSize:12.5, color:'#2EC4B6'}}>Señal ya cobrada</span>
          <span className="mono" style={{color:'#2EC4B6'}}>€{eur(señalCobrada)}</span>
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:6, display:'flex', justifyContent:'space-between'}}>
          <span style={{fontSize:12.5, fontWeight:600}}>Resto a cobrar</span>
          <span className="mono" style={{fontWeight:700, color:'var(--ok)'}}>€{eur(restoAuto < 0 ? 0 : restoAuto)}</span>
        </div>
      </div>
      <F label="Fecha límite para cobrar el resto">
        <input type="date" value={vence} onChange={e => setVence(e.target.value)} />
      </F>
      <div className="form-2col">
        <F label="Tipo de cliente">
          <CustomSelect value={tipo} onChange={setTipo}
            options={[{value:'Proyecto',label:'Proyecto — pago único'},{value:'Recurrente',label:'Recurrente — cuota periódica'}]} />
        </F>
        <F label="¿Crear proyecto?">
          <CustomSelect value={crearProyecto?'si':'no'} onChange={v => setCrearProyecto(v==='si')}
            options={[{value:'no',label:'No por ahora'},{value:'si',label:'Sí — crear proyecto'}]} />
        </F>
      </div>
      <div style={{fontSize:11.5, color:'var(--text-4)', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8}}>
        Se creará una tarea «Cobrar resto · {lead.empresa}» con fecha {vence}.
      </div>
    </Modal>
  )
}

// ── Pipeline ─────────────────────────────────────────────────────

export function Pipeline({ data, openQuick, openItem, onItemOpened, currentUser }) {
  const leads = data?.leads || []
  const [view,     setView]     = useState('kanban')
  const [filter,   setFilter]   = useState('todos')
  const [filterResp, setFilterResp] = useState('todos')
  const [movingId,       setMovingId]       = useState(null)
  const [editing,        setEditing]        = useState(null)
  const [creating,       setCreating]       = useState(false)

  useEffect(() => {
    if (openItem?.type === 'Lead' && openItem.item) {
      const lead = leads.find(l => l.id === openItem.item.id)
      if (lead) { setEditing(lead); onItemOpened?.() }
    }
  }, [openItem])
  const [cobradoLead,    setCobradoLead]    = useState(null)
  const [señalLead,      setSeñalLead]      = useState(null)
  const [cobrarRestoLead,setCobrarRestoLead] = useState(null)
  const [touchDrag, setTouchDrag] = useState(null)
  const kanbanRef    = useRef(null)
  const touchDragRef = useRef(null)
  const moveCardRef  = useRef(null)

  const myIni   = currentUser?.rol !== 'Admin' ? currentUser?.iniciales : null
  const allResp = [...new Set([...(myIni ? [myIni] : []), ...leads.map(l => l.responsable).filter(Boolean)])]

  const activeLeads = leads.filter(l => !STAGES_CLOSED.includes(l.estado))
  const closedLeads = leads.filter(l =>  STAGES_CLOSED.includes(l.estado))
  const base        = filter === 'cerrados' ? closedLeads : activeLeads
  const applyRespFilter = (items) => filterResp === 'todos' ? items : items.filter(l => l.responsable === filterResp)

  const filteredBase = (filter === 'todos' || filter === 'cerrados') ? base : base.filter(l => l.temp === filter)
  const filtered    = applyRespFilter(filteredBase)

  const activeCols = PIPELINE_COLS.filter(l => !STAGES_CLOSED.includes(l)).map(label => ({
    label,
    color: STATE_COLORS[label]?.color || '#6B7590',
    items: applyRespFilter(leads.filter(l => l.estado === label)),
  }))
  const closedCols = STAGES_CLOSED.map(label => ({
    label,
    color: STATE_COLORS[label]?.color || '#6B7590',
    items: applyRespFilter(leads.filter(l => l.estado === label)),
  }))

  // Métricas de conversión
  const totalCreados  = leads.length
  const totalCobrados = leads.filter(l => l.estado === STAGE.COBRADO).length
  const convRate      = totalCreados > 0 ? Math.round(totalCobrados / totalCreados * 100) : 0

  const moveCard = (leadId, newEstado) => {
    const lead = leads.find(l => l.id === leadId)
    if (newEstado === STAGE.DENEGADO) {
      if (!confirm(`¿Mover "${lead?.empresa}" a Denegado? Esta acción es difícil de revertir.`)) return
    }
    if (newEstado === STAGE.SEÑAL) {
      if (lead) { setSeñalLead(lead); setMovingId(null); return }
    }
    if (newEstado === STAGE.COBRADO) {
      if (lead?.estado === STAGE.SEÑAL) {
        setCobrarRestoLead(lead); setMovingId(null); return
      }
      if (lead) { setCobradoLead({ ...lead, estado: STAGE.COBRADO }); setMovingId(null); return }
    }
    data.updateLead?.(leadId, { estado: newEstado })
    setMovingId(null)
  }

  moveCardRef.current = moveCard

  const handleCardTouchStart = (e, lead) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect  = e.currentTarget.getBoundingClientRect()
    touchDragRef.current = {
      leadId: lead.id,
      leadName: lead.empresa,
      leadEstado: lead.estado,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      ghostX: touch.clientX,
      ghostY: touch.clientY,
      targetCol: null,
      moved: false,
    }
  }

  useEffect(() => {
    const el = kanbanRef.current
    if (!el) return
    const onTouchMove = (e) => {
      const drag = touchDragRef.current
      if (!drag) return
      e.preventDefault()
      const touch = e.touches[0]
      const ghostX = touch.clientX - drag.offsetX
      const ghostY = touch.clientY - drag.offsetY
      const under  = document.elementFromPoint(touch.clientX, touch.clientY)
      const colEl  = under?.closest('[data-col]')
      const targetCol = colEl ? colEl.getAttribute('data-col') : null
      touchDragRef.current = { ...drag, ghostX, ghostY, targetCol, moved: true }
      setTouchDrag({ leadId: drag.leadId, leadName: drag.leadName, ghostX, ghostY, targetCol })
    }
    const onTouchEnd = () => {
      const drag = touchDragRef.current
      touchDragRef.current = null
      setTouchDrag(null)
      if (!drag?.moved) return
      if (drag.targetCol && drag.targetCol !== drag.leadEstado) {
        moveCardRef.current?.(drag.leadId, drag.targetCol)
      }
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend',    onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  const handleSeñalConfirm = (señalMonto) => {
    const lead = señalLead
    const servicio = lead.servicio || 'Servicio'
    const today = new Date().toISOString().slice(0,10)
    const total = parseFloat(lead.monto) || 0
    const resto = Math.max(0, total - señalMonto)

    // Cobro de la señal (ya pagada)
    data.addCobro?.({
      cliente: lead.empresa,
      concepto: `Señal · ${servicio}`,
      monto: señalMonto,
      vence: today,
      pagado: true,
      vencida: false,
      recurrente: false,
    })
    // Cobro del resto (pendiente) — aparece en "Por cobrar"
    if (resto > 0) {
      const venceResto = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0,10) })()
      data.addCobro?.({
        cliente: lead.empresa,
        concepto: `Resto · ${servicio}`,
        monto: resto,
        vence: venceResto,
        pagado: false,
        vencida: false,
        recurrente: false,
      })
    }
    data.updateLead?.(lead.id, {
      estado: STAGE.SEÑAL,
      señal_cobrada: señalMonto,
      señal_fecha: today,
    })
    setSeñalLead(null)
  }

  const handleRestoConfirm = ({ vence_resto, tipo, crearProyecto }) => {
    const lead = cobrarRestoLead
    data.updateLead?.(lead.id, {
      estado: STAGE.COBRADO,
      tipo,
      crearProyecto,
      vence_resto,
    })
    setCobrarRestoLead(null)
  }

  const totalAbierto = activeLeads.reduce((a,l) => {
    if (l.estado === STAGE.SEÑAL) return a + Math.max(0, (l.monto||0) - (parseFloat(l.señal_cobrada)||0))
    return a + (l.monto||0)
  }, 0)

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
          {view === 'lista' && (
            <button className="btn ghost" onClick={() => downloadCSV(
              filtered.map(l => ({ Empresa: l.empresa, Sector: l.sector||'', Ciudad: l.ciudad||'', Servicio: l.servicio||'', Estado: l.estado, Origen: l.origen||'', Responsable: l.responsable||'', Importe: l.monto||0, ProximoPaso: l.next||'' })),
              `leads-${new Date().toISOString().slice(0,10)}.csv`
            )}>↓ CSV</button>
          )}
          <button className="btn primary" onClick={() => setCreating(true)}><I.Plus size={13}/> Nuevo lead</button>
        </div>
      </div>

      {allResp.length > 1 && (
        <div style={{display:'flex', gap:6, marginBottom:10, flexWrap:'wrap'}}>
          {['todos', ...allResp].map(r => (
            <button key={r} className={`btn sm ${filterResp === r ? 'primary' : 'ghost'}`}
              onClick={() => setFilterResp(r)}>
              {r === 'todos' ? 'Todos' : r}
            </button>
          ))}
        </div>
      )}

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

      {view === 'kanban' && (
        <>
          <div className="pipe-summary">
            {[
              {label:'Abiertas',       v: activeLeads.length,                                   sub:'oportunidades activas'},
              {label:'Valor potencial',v: `€${eur(totalAbierto)}`,                              sub:'en el pipeline'},
              {label:'Cobradas',       v: totalCobrados,                                        sub:`${convRate}% conversión`},
              {label:'Denegadas',      v: leads.filter(l=>l.estado===STAGE.DENEGADO).length,   sub:'leads perdidos'},
            ].map((s,i)=>(
              <div key={i} className="stat" style={{padding:'14px 16px'}}>
                <div className="label" style={{fontSize:11}}>{s.label}</div>
                <div className="value" style={{fontSize:22, marginTop:6}}>{s.v}</div>
                <div className="foot">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="kanban" ref={kanbanRef}>
            {activeCols.map(col=>(
              <div className="kanban-col" key={col.label} data-col={col.label}
                style={touchDrag?.targetCol === col.label ? { outline: `2px solid ${col.color}`, borderRadius: 10 } : undefined}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('leadId'); if (id) moveCard(id, col.label) }}>
                <div className="kanban-col-head">
                  <div className="bar" style={{'--col-color': col.color}}/>
                  <span className="title">{col.label}</span>
                  <span className="count">{col.items.length}</span>
                  {col.items.length > 0 && (
                    <span style={{fontSize:10, color:'var(--text-4)', fontFamily:'var(--font-mono)', marginLeft:4}}>
                      €{eur(col.items.reduce((a,l) => a + (l.monto||0), 0))}
                    </span>
                  )}
                </div>
                {col.items.map(l=>{
                  const isSeñal      = l.estado === STAGE.SEÑAL
                  const señalCobrada = parseFloat(l.señal_cobrada) || 0
                  const total        = parseFloat(l.monto) || 0
                  const pct          = total > 0 ? Math.round(señalCobrada / total * 100) : 0
                  const diasDesde    = l.señal_fecha
                    ? Math.floor((Date.now() - new Date(l.señal_fecha)) / 86400000)
                    : 0
                  const stageTime    = getStageTime(l.id)
                  const diasEnEtapa  = stageTime ? Math.floor((Date.now() - new Date(stageTime)) / 86400000) : null
                  const diasInact    = diasSinActiv(l.id, l.created_at)
                  return (
                    <div className="kanban-card" key={l.id} draggable
                      onDragStart={e => e.dataTransfer.setData('leadId', l.id)}
                      onTouchStart={e => handleCardTouchStart(e, l)}
                      onClick={() => setEditing(l)}>
                      <div className="name">{l.empresa}</div>
                      <div className="sub">{l.servicio}</div>
                      {isSeñal && (
                        <div style={{marginTop:8}}>
                          <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4}}>
                            <span style={{color:'#2EC4B6'}}>Señal €{eur(señalCobrada)}</span>
                            <span style={{color:'var(--text-3)'}}>Resto €{eur(total-señalCobrada)}</span>
                          </div>
                          <div style={{height:4, background:'rgba(255,255,255,0.06)', borderRadius:2}}>
                            <div style={{width:`${pct}%`, height:'100%', background:'#2EC4B6', borderRadius:2}}/>
                          </div>
                          <div style={{fontSize:10.5, color:'var(--text-4)', marginTop:4, display:'flex', alignItems:'center', gap:6}}>
                            {diasDesde > 0 ? `Hace ${diasDesde}d` : 'Hoy'}
                            {diasDesde > 30 && <span style={{color:'#FF5A6A', fontWeight:600}}>⚠ +30d</span>}
                          </div>
                        </div>
                      )}
                      <div className="meta">
                        <div className="avatar xs">{l.responsable}</div>
                        <span>{l.ciudad}</span>
                        <span className="amount">€{eur(l.monto||0)}</span>
                      </div>
                      <div style={{display:'flex', gap:4, marginTop:5, flexWrap:'wrap'}}>
                        {diasEnEtapa !== null && (
                          <span style={{fontSize:9.5, padding:'2px 6px', borderRadius:4, background:'rgba(255,255,255,0.05)', color: diasEnEtapa > 21 ? '#FF5A6A' : diasEnEtapa > 7 ? '#FFB547' : 'var(--text-4)'}}>
                            {diasEnEtapa}d en etapa
                          </span>
                        )}
                        {diasInact > 7 && (
                          <span style={{fontSize:9.5, padding:'2px 6px', borderRadius:4, background:'rgba(255,90,106,0.1)', color:'#FF8FA0'}}>
                            ⏱ {diasInact}d sin contacto
                          </span>
                        )}
                      </div>
                      <button className="btn sm ghost" style={{marginTop:8,width:'100%',fontSize:11}}
                        onClick={e => { e.stopPropagation(); setMovingId(l.id) }}>
                        Mover →
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="kanban-closed">
            {closedCols.map(col=>(
              <div className="kanban-col" key={col.label} data-col={col.label}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('leadId'); if (id) moveCard(id, col.label) }}>
                <div className="kanban-col-head">
                  <div className="bar" style={{'--col-color': col.color}}/>
                  <span className="title">{col.label}</span>
                  <span className="count">{col.items.length}</span>
                  {col.items.length > 0 && (
                    <span style={{fontSize:10, color:'var(--text-4)', fontFamily:'var(--font-mono)', marginLeft:4}}>
                      €{eur(col.items.reduce((a,l) => a + (l.monto||0), 0))}
                    </span>
                  )}
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
                  </div>
                ))}
              </div>
            ))}
          </div>

          {touchDrag && (
            <div style={{
              position:'fixed', left:touchDrag.ghostX, top:touchDrag.ghostY,
              width:160, background:'var(--surface-2)', border:'1px solid var(--line-1)',
              borderRadius:10, padding:'10px 14px', pointerEvents:'none', zIndex:9999,
              opacity:0.9, transform:'rotate(2deg) scale(1.03)',
              boxShadow:'0 8px 24px rgba(0,0,0,0.4)', fontSize:13, fontWeight:600,
              color:'var(--text-0)',
            }}>
              {touchDrag.leadName}
              {touchDrag.targetCol && (
                <div style={{fontSize:11, color:STATE_COLORS[touchDrag.targetCol]?.color||'var(--text-3)', marginTop:4}}>
                  → {touchDrag.targetCol}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {view === 'lista' && (
        <div className="card">
          <div style={{overflowX:'auto', WebkitOverflowScrolling:'touch'}}>
          <table className="table">
            <thead>
              <tr><th>Empresa</th><th>Servicio</th><th>Estado</th><th>Próximo paso</th><th>Resp.</th><th style={{textAlign:'right'}}>Importe</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const sc = STATE_COLORS[l.estado] || { chip:'gray' }
                const tempColor = l.temp==='hot'?'#FF5A6A':l.temp==='warm'?'#FFB547':l.temp==='cold'?'#6B7590':'#3ECF8E'
                const tempLabel = l.temp==='hot'?'HOT':l.temp==='warm'?'TIBIO':l.temp==='cold'?'FRÍO':null
                return (
                  <tr key={l.id} style={{cursor:'pointer'}} onClick={() => setEditing(l)}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{width:8, height:8, borderRadius:'50%', background:tempColor, boxShadow:`0 0 8px ${tempColor}`, flexShrink:0}}/>
                        <div>
                          <div style={{display:'flex', alignItems:'center', gap:6}}>
                            <span className="primary">{l.empresa}</span>
                            {tempLabel && <span style={{fontSize:9.5, fontWeight:700, color:tempColor, background:`${tempColor}18`, padding:'1px 5px', borderRadius:3, letterSpacing:'0.04em'}}>{tempLabel}</span>}
                          </div>
                          <div className="muted" style={{fontSize:11}}>{l.ciudad}{l.sector ? ` · ${l.sector}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="muted small">{l.servicio}</td>
                    <td><span className={`chip ${sc.chip}`}><span className="dot"/>{l.estado}</span></td>
                    <td className="muted small" style={{maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.next || <span style={{color:'var(--text-4)'}}>—</span>}</td>
                    <td><div className="avatar sm">{l.responsable}</div></td>
                    <td className="mono" style={{textAlign:'right'}}>{l.monto ? `€${eur(l.monto)}` : <span className="muted">—</span>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex', gap:4, justifyContent:'flex-end', alignItems:'center'}}>
                        <button className="btn sm ghost" style={{fontSize:11, padding:'3px 8px', whiteSpace:'nowrap'}}
                          onClick={() => setMovingId(l.id)}>Mover →</button>
                        <RowMenu
                          onEdit={() => setEditing(l)}
                          onDelete={() => { if (confirm(`¿${STAGES_CLOSED.includes(l.estado) ? 'Quitar del pipeline' : 'Eliminar'} "${l.empresa}"?`)) data.deleteLead?.(l.id) }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center', padding:'32px 0', color:'var(--text-4)', fontSize:13}}>Sin leads en esta vista</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {(editing || creating) && (
        <LeadModal
          lead={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={handleSave}
          onDelete={id => { data.deleteLead?.(id); setEditing(null) }}
          resp={allResp}
        />
      )}

      {cobradoLead && (
        <LeadModal
          lead={cobradoLead}
          onClose={() => setCobradoLead(null)}
          onSave={(form) => { data.updateLead?.(form.id, form); setCobradoLead(null) }}
          onDelete={id => { data.deleteLead?.(id); setCobradoLead(null) }}
          resp={allResp}
        />
      )}

      {señalLead && (
        <SeñalPagadaModal
          lead={señalLead}
          onClose={() => setSeñalLead(null)}
          onConfirm={handleSeñalConfirm}
        />
      )}

      {cobrarRestoLead && (
        <CobraRestoModal
          lead={cobrarRestoLead}
          onClose={() => setCobrarRestoLead(null)}
          onConfirm={handleRestoConfirm}
        />
      )}
    </div>
  )
}
