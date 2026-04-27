import React, { useEffect } from 'react'

export function WowEffect({ type, cliente, onDone }) {
  const isFull = type === 'full'

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 3000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  return (
    <div className="wow-overlay">
      <div className="wow-card">
        <div style={{ fontSize: isFull ? '72px' : '58px', lineHeight: 1, marginBottom: 12 }}>
          {isFull ? '🏆' : '💰'}
        </div>
        <div className="wow-title" style={{
          color:    isFull ? '#FFD700' : '#3ECF8E',
          fontSize: isFull ? 40 : 28,
        }}>
          {isFull ? '¡TODO COBRADO!' : '¡PAGO RECIBIDO!'}
        </div>
        {cliente && <div className="wow-cliente">{cliente}</div>}
        {isFull && <div className="wow-sub">🎉 ¡Proyecto cerrado!</div>}
      </div>
    </div>
  )
}
