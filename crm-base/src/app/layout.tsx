import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Relay CRM',
  description: 'Modern CRM for growing teams',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
