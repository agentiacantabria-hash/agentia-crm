import type { Metadata, Viewport } from 'next'
import { Manrope, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import PwaRegister from '@/components/PwaRegister'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Equilibria',
  description: 'Reserva tu clase en Equilibria, El Astillero',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Equilibria',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B1F4D',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} ${inter.variable} ${mono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <main className="min-h-screen pb-nav">
          {children}
        </main>
        <NavBar />
        <PwaRegister />
      </body>
    </html>
  )
}
