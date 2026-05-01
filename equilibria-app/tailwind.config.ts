import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:    '#0B1F4D',
        'navy-2':'#15306B',
        'navy-deep': '#07153A',
        blue:    '#2E5BFF',
        paper:   '#F4EFE6',
        'paper-2': '#ECE5D6',
        bone:    '#FBF8F2',
        ink:     '#0A1430',
        muted:   'rgba(11,31,77,0.62)',
        // Colores por disciplina
        pilates:   '#F9DE73',
        bodypower: '#B9A8DE',
        gap:       '#A2C6E6',
        espalda:   '#F4BDD2',
        trx:       '#E7B18D',
        hiit:      '#CBDFE0',
        funcional: '#A9DE84',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
