import React, { useState, useEffect } from 'react'
import { I } from './Icons'
import { PIPELINE_COLS } from './data'
import { SelectOrText, CustomSelect } from './Modal'

function getServicios() {
  try {
    const s = JSON.parse(localStorage.getItem('agentia_servicios') || '[]')
    const activos = s.filter(x => x.activo !== false).map(x => x.n).filter(Boolean)
    return activos.length ? activos : ['Web premium', 'Automatización WhatsApp', 'Chatbot de reservas', 'Mantenimiento mensual']
  } catch { return ['Web premium', 'Automatización WhatsApp', 'Chatbot de reservas', 'Mantenimiento mensual'] }
}

function getResp() {
  try {
    const u = JSON.parse(localStorage.getItem('agentia_usuarios') || '[]')
    const activos = u.filter(x => x.estado === 'activo').map(x => {
      const ini = x.ini || (x.n||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?'
      return { label: `${x.n || ini} (${ini})`, value: ini }
    })
    return activos.length ? activos : [{ label: 'Admin', value: 'AD' }]
  } catch { return [{ label: 'Admin', value: 'AD' }] }
}

const ORIGENES = ['Instagram', 'LinkedIn', 'Referido', 'Formulario web', 'Otro']

const EMPTY = {
  empresa: '', servicio: '', contacto: '', origen: 'Instagram', origenCustom: '', notas: '',
  sector: '', ciudad: '', telefono: '', email: '', responsable: '',
  estado: 'Cliente Nuevo', next_contact: '', monto: '',
}

export function QuickLeadDrawer({ open, onClose, onSave }) {
  const [mode, setMode] = useState('quick')
  const [form, setForm] = useState(EMPTY)

  useEffect(() => { if (!open) { setForm(EMPTY); setMode('quick') } }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.empresa.trim()) return
    const servicios = getServicios()
    const resp = getResp()
    const origenFinal = form.origen === 'Otro' ? (form.origenCustom.trim() || 'Otro') : form.origen
    const nextText = form.next_contact
      ? `Contactar el ${new Date(form.next_contact + 'T00:00:00').toLocaleDateString('es-ES', { day:'numeric', month:'short' })}`
      : (form.notas || '').trim() || 'Primer contacto'
    // Solo campos que existen en la tabla leads de Supabase
    const lead = {
      empresa:     form.empresa.trim(),
      servicio:    form.servicio || servicios[0] || '',
      origen:      origenFinal,
      estado:      form.estado || 'Cliente Nuevo',
      monto:       parseFloat(form.monto) || 0,
      temp:        'cold',
      next:        nextText,
      notas:       form.notas || null,
      sector:      form.sector || null,
      ciudad:      form.ciudad || null,
      responsable: form.responsable || resp[0]?.value || '',
      contacto:    form.contacto || null,
      telefono:    form.telefono || null,
      email:       form.email    || null,
    }
    onSave?.(lead)
    onClose?.()
    setForm(EMPTY)
  }

  const servicios = getServicios()
  const resp = getResp()

  return (
    <>
      <div className={`drawer-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-head">
          <I.Sparkle size={18} style={{ color: 'var(--brand-2)' }} />
          <div>
            <h3>Nuevo lead</h3>
            <div className="sub">Captura lo esencial ahora — los detalles se completan después.</div>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose}><I.Close size={14} /></button>
        </div>

        <div style={{ padding: '12px 22px 0' }}>
          <div className="segmented">
            <button className={mode === 'quick' ? 'active' : ''} onClick={() => setMode('quick')}><I.Bolt size={12} /> Rápido · 15s</button>
            <button className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')}>Completo</button>
          </div>
        </div>

        <div className="drawer-body">
          {mode === 'quick' ? (
            <>
              <div className="field">
                <label className="lbl">Empresa</label>
                <input className="input" placeholder="Ej: Clínica Marbella" autoFocus value={form.empresa} onChange={e => set('empresa', e.target.value)} />
              </div>
              <div className="field">
                <label className="lbl">Servicio de interés</label>
                <SelectOrText value={form.servicio} onChange={v => set('servicio', v)} options={servicios} selectClass="select" inputClass="input" placeholder="Ej: Web + Chatbot…" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="lbl">Contacto</label>
                  <input className="input" placeholder="Teléfono o email" value={form.contacto} onChange={e => set('contacto', e.target.value)} />
                </div>
                <div className="field">
                  <label className="lbl">Origen</label>
                  <CustomSelect className="select" value={form.origen} onChange={v => set('origen', v)} options={ORIGENES} />
                </div>
              </div>
              {form.origen === 'Otro' && (
                <div className="field">
                  <label className="lbl">Especifica el origen</label>
                  <input className="input" placeholder="Ej: Feria, podcast, amigo…" value={form.origenCustom} onChange={e => set('origenCustom', e.target.value)} />
                </div>
              )}
              <div className="field">
                <label className="lbl">Notas rápidas</label>
                <textarea className="textarea" placeholder="Cualquier detalle que no quieras olvidar…" value={form.notas} onChange={e => set('notas', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(45,107,255,0.06)', border: '1px solid rgba(45,107,255,0.15)', borderRadius: 10 }}>
                <I.Sparkle size={16} style={{ color: 'var(--brand-2)' }} />
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Se asignará automáticamente a <b style={{ color: 'var(--text-0)' }}>ti</b> y entrará en estado <b style={{ color: 'var(--brand-3)' }}>Cliente Nuevo</b>.</div>
              </div>
            </>
          ) : (
            <>
              <div className="field-row">
                <div className="field"><label className="lbl">Empresa</label><input className="input" placeholder="Negocio" value={form.empresa} onChange={e => set('empresa', e.target.value)} /></div>
                <div className="field"><label className="lbl">Sector</label><input className="input" placeholder="Salud, Legal…" value={form.sector} onChange={e => set('sector', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label className="lbl">Ciudad</label><input className="input" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} /></div>
                <div className="field"><label className="lbl">Origen</label>
                  <CustomSelect className="select" value={form.origen} onChange={v => set('origen', v)} options={ORIGENES} />
                </div>
              </div>
              {form.origen === 'Otro' && (
                <div className="field">
                  <label className="lbl">Especifica el origen</label>
                  <input className="input" placeholder="Ej: Feria, podcast, amigo…" value={form.origenCustom} onChange={e => set('origenCustom', e.target.value)} />
                </div>
              )}
              <div className="field-row">
                <div className="field"><label className="lbl">Teléfono</label><input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></div>
                <div className="field"><label className="lbl">Email</label><input className="input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              </div>
              <div className="field-row">
                <div className="field"><label className="lbl">Responsable</label>
                  <CustomSelect className="select" value={form.responsable} onChange={v => set('responsable', v)} options={resp.map(r => ({ value: r.value, label: r.label }))} />
                </div>
              <div className="field-row">
                <div className="field"><label className="lbl">Servicio de interés</label>
                  <SelectOrText value={form.servicio} onChange={v => set('servicio', v)} options={servicios} selectClass="select" inputClass="input" placeholder="Ej: Web + Chatbot…" />
                </div>
                <div className="field"><label className="lbl">Importe (€)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={form.monto} onChange={e => set('monto', e.target.value)} />
                </div>
              </div>
              <div className="field-row">
                <div className="field"><label className="lbl">Estado</label>
                  <CustomSelect className="select" value={form.estado} onChange={v => set('estado', v)} options={PIPELINE_COLS} />
                </div>
                <div className="field"><label className="lbl">Próximo contacto</label><input className="input" type="date" value={form.next_contact} onChange={e => set('next_contact', e.target.value)} /></div>
              </div>
              <div className="field"><label className="lbl">Notas</label><textarea className="textarea" value={form.notas} onChange={e => set('notas', e.target.value)} /></div>
            </>
          )}
        </div>

        <div className="drawer-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={handleSave}><I.Check size={14} /> Crear lead</button>
        </div>
      </div>
    </>
  )
}
