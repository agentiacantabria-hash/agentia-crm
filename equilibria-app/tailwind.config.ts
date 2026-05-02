import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca — extraído del logo
        brand:        '#1E4DB7',
        'brand-deep': '#143A8C',
        'brand-soft': '#3D6FD9',
        'brand-tint': 'rgba(30, 77, 183, 0.08)',
        'brand-glow': 'rgba(30, 77, 183, 0.18)',

        // Neutros heredados
        navy:        '#0B1F4D',
        'navy-2':    '#15306B',
        'navy-deep': '#07153A',
        blue:        '#2E5BFF',
        paper:       '#F4EFE6',
        'paper-2':   '#ECE5D6',
        'paper-3':   '#E2D9C2',
        bone:        '#FBF8F2',
        ink:         '#0A1430',
        muted:       'rgba(11,31,77,0.62)',

        // Acentos secundarios suaves
        rose:    '#E8B4BC',
        amber:   '#E8C893',
        teal:    '#9BC4BC',

        // Colores por disciplina (intactos)
        pilates:   '#F9DE73',
        bodypower: '#B9A8DE',
        gap:       '#A2C6E6',
        espalda:   '#F4BDD2',
        trx:       '#E7B18D',
        hiit:      '#CBDFE0',
        funcional: '#A9DE84',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card-soft':  '0 2px 24px rgba(11, 31, 77, 0.06)',
        'card-hover': '0 8px 36px rgba(11, 31, 77, 0.12)',
        'brand':      '0 6px 28px rgba(30, 77, 183, 0.32)',
        'brand-lg':   '0 12px 40px rgba(30, 77, 183, 0.28)',
      },
      backgroundImage: {
        'hero-brand':  'radial-gradient(120% 80% at 0% 0%, rgba(30,77,183,0.18) 0%, rgba(30,77,183,0) 60%), radial-gradient(100% 60% at 100% 0%, rgba(46,91,255,0.1) 0%, rgba(46,91,255,0) 70%)',
        'hero-paper':  'radial-gradient(140% 100% at 50% 0%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)',
        'shimmer':     'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out':   { '0%': { opacity: '1', transform: 'translateY(0) scale(1)' }, '100%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' } },
        'slide-up':   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-down': { '0%': { opacity: '1', transform: 'translateY(0)' }, '100%': { opacity: '0', transform: 'translateY(20px)' } },
        'spring-in':  { '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' }, '60%': { transform: 'scale(1.02) translateY(-2px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
        'shimmer':    { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.85)', opacity: '0.7' }, '100%': { transform: 'scale(2)', opacity: '0' } },
        'pop':        { '0%': { transform: 'scale(0.92)' }, '50%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in':    'fade-in 0.3s ease-out',
        'fade-out':   'fade-out 0.25s ease-in forwards',
        'slide-up':   'slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slide-down 0.25s ease-in forwards',
        'spring-in':  'spring-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        'pop':        'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'silk':   'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}

export default config
