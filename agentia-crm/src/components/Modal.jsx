import React from 'react'
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
