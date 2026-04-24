import React, { useState } from 'react'
import { I } from './Icons'

export function Modal({ open, onClose, title, children, onSave, saveLabel = 'Guardar', danger }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><I.Close size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onSave}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function F({ label, children }) {
  return <div className="form-row"><label>{label}</label>{children}</div>
}

export function SelectOrText({ value, onChange, options, placeholder = 'Escribe el valor…', selectClass, inputClass }) {
  const [custom, setCustom] = useState(() => Boolean(value && !options.includes(value)))
  if (custom) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className={inputClass}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{ flex: 1 }}
        />
        <button type="button" className="btn sm ghost"
          title="Volver al selector"
          onClick={() => { setCustom(false); onChange(options[0] || '') }}
          style={{ flexShrink: 0, padding: '0 10px', height: 34 }}>
          ↩
        </button>
      </div>
    )
  }
  return (
    <select
      className={selectClass}
      value={options.includes(value) ? value : options[0] || ''}
      onChange={e => {
        if (e.target.value === '__custom__') { setCustom(true); onChange('') }
        else onChange(e.target.value)
      }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value="__custom__">✏ Personalizado…</option>
    </select>
  )
}
