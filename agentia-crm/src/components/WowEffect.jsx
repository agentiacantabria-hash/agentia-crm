import React, { useEffect, useRef } from 'react'

const C_PARTIAL = ['#FFD700','#3ECF8E','#FFB547','#4F8BFF','#FFFFFF','#9A7BFF']
const C_FULL    = ['#FFD700','#FF5A6A','#3ECF8E','#4F8BFF','#9A7BFF','#FFB547','#FF69B4','#00CED1','#FFFFFF','#FF4500']

const DURATION   = 5000
const FADE_START = 3500

export function WowEffect({ type, cliente, onDone }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const isFull    = type === 'full'
  const COLORS    = isFull ? C_FULL : C_PARTIAL

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const state = { particles: [], start: Date.now(), lastRain: 0, lastBurst: 0, raf: null }
    stateRef.current = state

    const mkParticle = (x, y, born, speedMult = 1, rain = false) => ({
      x, y,
      vx: rain ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 14 * speedMult,
      vy: rain ? Math.random() * 4 + 2 : (Math.random() * -14 - 4) * speedMult,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * (isFull ? 13 : 9) + 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * (rain ? 6 : 16),
      shape: rain ? (Math.random() > 0.5 ? 'rect' : 'circle')
                  : ['rect','rect','circle','star'][Math.floor(Math.random() * 4)],
      gravity: rain ? 0.05 : 0.26,
      born,
    })

    const burst = (x, y, count, speedMult = 1, born = 0) => {
      for (let i = 0; i < count; i++) state.particles.push(mkParticle(x, y, born, speedMult, false))
    }

    const rain = (born) => {
      const n = isFull ? 12 : 6
      for (let i = 0; i < n; i++) {
        const x = Math.random() * canvas.width
        state.particles.push(mkParticle(x, -30, born, 1, true))
      }
    }

    const drawStar = (r) => {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const a  = (Math.PI * 2 / 5) * i - Math.PI / 2
        const a2 = a + Math.PI / 5
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        ctx.lineTo(Math.cos(a2) * r * 0.38, Math.sin(a2) * r * 0.38)
      }
      ctx.closePath()
      ctx.fill()
    }

    // Bursts iniciales
    const cx = canvas.width / 2, cy = canvas.height / 2
    burst(cx, cy, isFull ? 120 : 60, isFull ? 2.4 : 1.5, 0)
    if (isFull) {
      setTimeout(() => burst(cx * 0.25, cy * 0.35, 55, 1.8, 350), 350)
      setTimeout(() => burst(cx * 1.75, cy * 0.35, 55, 1.8, 650), 650)
      setTimeout(() => burst(cx, cy * 1.5, 65, 2.0, 950), 950)
      setTimeout(() => burst(cx, cy, 90, 3.0, 1200), 1200)
    }

    const animate = () => {
      const elapsed = Date.now() - state.start

      if (elapsed >= DURATION) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDone?.()
        return
      }

      // lluvia continua
      if (elapsed - state.lastRain > (isFull ? 65 : 130) && elapsed < 3800) {
        state.lastRain = elapsed; rain(elapsed)
      }
      // bursts aleatorios para full
      if (isFull && elapsed > 500 && elapsed < 2800 && elapsed - state.lastBurst > 700) {
        state.lastBurst = elapsed
        burst(
          canvas.width  * (0.15 + Math.random() * 0.7),
          canvas.height * (0.1  + Math.random() * 0.5),
          35, 1.6, elapsed
        )
      }

      const gFade = elapsed > FADE_START ? 1 - (elapsed - FADE_START) / (DURATION - FADE_START) : 1

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { particles } = state
      for (let i = particles.length - 1; i >= 0; i--) {
        const p  = particles[i]
        p.x     += p.vx; p.y += p.vy
        p.vy    += p.gravity; p.vx *= 0.993
        p.rot   += p.rotV

        const age = (elapsed - p.born) / 1000
        const op  = Math.max(0, 1 - age / 4.5) * gFade
        if (op <= 0 || p.y > canvas.height + 70) { particles.splice(i, 1); continue }

        ctx.save()
        ctx.globalAlpha = op
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot * Math.PI / 180)
        ctx.fillStyle = p.color
        const s = p.size
        if      (p.shape === 'rect')   ctx.fillRect(-s / 2, -s / 4, s, s / 2)
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill() }
        else                           drawStar(s / 2)
        ctx.restore()
      }

      state.raf = requestAnimationFrame(animate)
    }
    state.raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(state.raf)
      window.removeEventListener('resize', resize)
    }
  }, []) // eslint-disable-line

  return (
    <div className="wow-overlay">
      <canvas ref={canvasRef} className="wow-canvas" />

      <div className="wow-card" style={{ animationName: 'wowPop' }}>
        <div className={isFull ? 'wow-icon wow-trophy' : 'wow-icon wow-money'}>
          {isFull ? '🏆' : '💰'}
        </div>
        <div className="wow-title" style={{
          color:      isFull ? '#FFD700' : '#3ECF8E',
          fontSize:   isFull ? 44 : 30,
          textShadow: isFull
            ? '0 0 80px rgba(255,215,0,1), 0 0 40px rgba(255,215,0,0.7), 0 4px 24px rgba(0,0,0,0.9)'
            : '0 0 50px rgba(62,207,142,0.9), 0 4px 16px rgba(0,0,0,0.9)',
        }}>
          {isFull ? '¡TODO COBRADO!' : '¡PAGO RECIBIDO!'}
        </div>
        {cliente && <div className="wow-cliente">{cliente}</div>}
        {isFull && <div className="wow-sub">🎉 ¡Proyecto cerrado!</div>}
      </div>
    </div>
  )
}
