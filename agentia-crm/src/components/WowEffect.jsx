import React, { useEffect, useRef } from 'react'

const EMOJIS_FULL    = ['💰','💵','💴','💶','💷','🤑','🪙','💎','🏆','⭐','✨','🎉','🎊','💸']
const EMOJIS_PARTIAL = ['💰','💵','🪙','💸','✨','🎉']
const C_PARTIAL      = ['#FFD700','#3ECF8E','#FFB547','#4F8BFF','#FFFFFF','#9A7BFF']

const DURATION   = 5000
const FADE_START = 3500

export function WowEffect({ type, cliente, onDone }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef(null)
  const isFull    = type === 'full'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const state = { particles: [], start: Date.now(), lastRain: 0, lastBurst: 0, raf: null }
    stateRef.current = state

    const EMOJIS = isFull ? EMOJIS_FULL : EMOJIS_PARTIAL

    const mkEmoji = (x, y, born, speedMult = 1, rain = false) => ({
      x, y,
      vx: rain ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 14 * speedMult,
      vy: rain ? Math.random() * 4 + 2 : (Math.random() * -14 - 4) * speedMult,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      size: Math.random() * (isFull ? 30 : 22) + (isFull ? 18 : 14),
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * (rain ? 4 : 12),
      gravity: rain ? 0.05 : 0.26,
      born,
    })

    // Para partial: mezcla emojis + confetti geométrico
    const mkConfetti = (x, y, born, speedMult = 1, rain = false) => ({
      x, y,
      vx: rain ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 14 * speedMult,
      vy: rain ? Math.random() * 4 + 2 : (Math.random() * -14 - 4) * speedMult,
      color: C_PARTIAL[Math.floor(Math.random() * C_PARTIAL.length)],
      size: Math.random() * 9 + 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * (rain ? 6 : 16),
      shape: rain ? (Math.random() > 0.5 ? 'rect' : 'circle')
                  : ['rect','rect','circle'][Math.floor(Math.random() * 3)],
      gravity: rain ? 0.05 : 0.26,
      born,
      isConfetti: true,
    })

    const mkParticle = (x, y, born, speedMult = 1, rain = false) => {
      if (isFull) return mkEmoji(x, y, born, speedMult, rain)
      // partial: 40% emojis, 60% confetti
      return Math.random() < 0.4
        ? mkEmoji(x, y, born, speedMult, rain)
        : mkConfetti(x, y, born, speedMult, rain)
    }

    const burst = (x, y, count, speedMult = 1, born = 0) => {
      for (let i = 0; i < count; i++) state.particles.push(mkParticle(x, y, born, speedMult, false))
    }

    const rain = (born) => {
      const n = isFull ? 10 : 5
      for (let i = 0; i < n; i++) {
        const x = Math.random() * canvas.width
        state.particles.push(mkParticle(x, -30, born, 1, true))
      }
    }

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

      if (elapsed - state.lastRain > (isFull ? 65 : 130) && elapsed < 3800) {
        state.lastRain = elapsed; rain(elapsed)
      }
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

        if (p.isConfetti) {
          ctx.fillStyle = p.color
          const s = p.size
          if      (p.shape === 'rect')   ctx.fillRect(-s / 2, -s / 4, s, s / 2)
          else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill() }
        } else {
          ctx.font = `${p.size}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.emoji, 0, 0)
        }

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
