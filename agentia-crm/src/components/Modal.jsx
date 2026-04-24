import React, { useState, useRef, useEffect } from 'react'
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

function Dropdown({ open, options, value, onPick, onMouseDownOutside }) {
  if (!open) return null
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
      background: '#0F1520', border: '1px solid var(--line-2)', borderRadius: 8,
      maxHeight: 200, overflowY: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const active = v === value
        return (
          <div key={v}
            onMouseDown={e => { e.preventDefault(); onPick(v) }}
            style={{
              padding: '8px 12px', cursor: 'pointer', fontSize: 13,
              background: active ? 'rgba(45,107,255,0.15)' : 'transparent',
              color: active ? 'var(--brand-2)' : 'var(--text-1)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(45,107,255,0.15)' : 'transparent' }}
          >{l}</div>
        )
      })}
    </div>
  )
}

export function CustomSelect({ value, onChange, options, className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const norm = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  const current = norm.find(o => o.value === value) || norm[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={className || 'cs-trigger'}
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <span>{current?.label}</span>
        <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 6 }}>▾</span>
      </div>
      <Dropdown open={open} options={options} value={value} onPick={v => { onChange(v); setOpen(false) }} />
    </div>
  )
}

export function SelectOrText({ value, onChange, options, placeholder = 'Escribe el valor…', selectClass, inputClass }) {
  const [custom, setCustom] = useState(() => Boolean(value && !options.includes(value)))
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (custom) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          className={inputClass || selectClass}
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

  const displayed = options.includes(value) ? value : (options[0] || '')

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={selectClass || 'cs-trigger'}
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}>
        <span>{displayed}</span>
        <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 6 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999,
          background: '#0F1520', border: '1px solid var(--line-2)', borderRadius: 8,
          maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {options.map(o => (
            <div key={o}
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false) }}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                background: o === displayed ? 'rgba(45,107,255,0.15)' : 'transparent',
                color: o === displayed ? 'var(--brand-2)' : 'var(--text-1)',
              }}
              onMouseEnter={e => { if (o !== displayed) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = o === displayed ? 'rgba(45,107,255,0.15)' : 'transparent' }}
            >{o}</div>
          ))}
          <div
            onMouseDown={e => { e.preventDefault(); setCustom(true); onChange(''); setOpen(false) }}
            style={{
              padding: '8px 12px', cursor: 'pointer', fontSize: 13,
              color: 'var(--text-3)', borderTop: '1px solid var(--line-1)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >✏ Personalizado…</div>
        </div>
      )}
    </div>
  )
}
