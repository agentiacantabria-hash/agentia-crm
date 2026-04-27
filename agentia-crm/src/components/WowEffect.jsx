import React, { useEffect, useMemo } from 'react'

const EMOJIS_FULL    = ['💰','💵','💴','💶','🤑','🪙','💎','💸']
const EMOJIS_PARTIAL = ['💰','💵','💸','🪙']

const DURATION = 4000

function Drop({ emoji, size, x, delay, dur, rot }) {
  const ref = React.useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const anim = el.animate([
      { transform: `translateY(-80px) rotate(0deg)`,              opacity: 0   },
      { transform: `translateY(-40px) rotate(${rot * 0.1}deg)`,   opacity: 1,  offset: 0.08 },
      { transform: `translateY(60vh)  rotate(${rot * 0.7}deg)`,   opacity: 0.9, offset: 0.75 },
      { transform: `translateY(100vh) rotate(${rot}deg)`,         opacity: 0   },
    ], {
      duration: dur,
      delay,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'both',
    })
    return () => anim.cancel()
  }, []) // eslint-disable-line

  return (
    <span ref={ref} style={{
      position: 'fixed',
      left: `${x}%`,
      top: 0,
      fontSize: `${size}px`,
      lineHeight: 1,
      willChange: 'transform, opacity',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      {emoji}
    </span>
  )
}

export function WowEffect({ type, cliente, onDone }) {
  const isFull = type === 'full'
  const EMOJIS = isFull ? EMOJIS_FULL : EMOJIS_PARTIAL
  const n      = isFull ? 65 : 45

  const drops = useMemo(() => Array.from({ length: n }, (_, i) => ({
    id:    i,
    emoji: EMOJIS[i % EMOJIS.length],
    size:  Math.floor(Math.random() * 14 + 18),
    x:     Math.random() * 90 + 2,
    delay: 500 + i * 160 + Math.random() * 120,
    dur:   Math.random() * 800 + 1800,
    rot:   (Math.random() - 0.5) * 120,
  })), []) // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), DURATION)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  return (
    <div className="wow-overlay">
      {drops.map(d => <Drop key={d.id} {...d} />)}
      <div className="wow-card">
        <div style={{ fontSize: isFull ? '72px' : '58px', lineHeight: 1, marginBottom: 12 }}>
          {isFull ? '🏆' : '💰'}
        </div>
        <div className="wow-title" style={{
          color:    isFull ? '#FFD700' : '#3ECF8E',
          fontSize: isFull ? 40 : 28,
          textShadow: isFull
            ? '0 0 40px rgba(255,215,0,0.6), 0 4px 20px rgba(0,0,0,0.9)'
            : '0 0 30px rgba(62,207,142,0.6), 0 4px 16px rgba(0,0,0,0.9)',
        }}>
          {isFull ? '¡TODO COBRADO!' : '¡PAGO RECIBIDO!'}
        </div>
        {cliente && <div className="wow-cliente">{cliente}</div>}
        {isFull && <div className="wow-sub">🎉 ¡Proyecto cerrado!</div>}
      </div>
    </div>
  )
}
