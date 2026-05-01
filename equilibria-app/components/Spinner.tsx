/**
 * Spinner inline pequeño para usar dentro de botones primarios mientras
 * cargan. Tamaño por defecto (16px) encaja con texto base.
 */
export default function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`inline-block animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" opacity="0.95" />
    </svg>
  )
}

/**
 * Skeleton loading bloque genérico con shimmer suave. Pasar `className`
 * con dimensiones tailwind (h-4 w-32 etc.).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-ink/5 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
        }}
      />
    </div>
  )
}
