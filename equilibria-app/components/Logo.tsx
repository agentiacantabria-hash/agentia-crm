/**
 * Logo de Equilibria — usa la PNG en /public/icons/icon-512.png que
 * tú subes manualmente. `glow` añade un halo suave detrás (para fondos
 * cobalto). `inverted` no se usa todavía pero lo dejo para light mode.
 */
type Props = {
  size?: number
  className?: string
  glow?: boolean
}

export default function Logo({ size = 64, className = '', glow = false }: Props) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {glow && (
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 65%)', transform: 'scale(1.4)' }}/>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-512.png"
        alt="Equilibria"
        width={size}
        height={size}
        className="relative"
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  )
}
