'use client'

import { redirect } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import Link from 'next/link'

const navItems = [
  { href: '/tenants', label: 'Tenants' },
  { href: '/monitoring', label: 'Monitoring' },
]

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user || user.role !== 'PLATFORM_ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Platform Admin
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`/platform${item.href}`}
              className="rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
