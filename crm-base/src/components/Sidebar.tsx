'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  onClick?: () => void
}

function NavItem({ href, label, icon, active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150
        ${active
          ? 'bg-white/[0.08] text-white font-medium'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
        }`}
    >
      <span className={`w-[18px] h-[18px] flex-shrink-0 ${active ? 'text-indigo-400' : 'text-slate-600'}`}>
        {icon}
      </span>
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />}
    </Link>
  )
}

function DisabledNavItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 cursor-not-allowed select-none">
      <span className="w-[18px] h-[18px] flex-shrink-0 text-slate-700">{icon}</span>
      {label}
      <span className="ml-auto text-[10px] font-medium text-slate-600 bg-white/5 border border-white/[0.06]
        px-1.5 py-0.5 rounded-md leading-none">
        Soon
      </span>
    </div>
  )
}

interface SidebarProps {
  onNavigate?: () => void
  user?: { name: string; email: string; role: string }
}

export function Sidebar({ onNavigate, user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-shrink-0 h-screen bg-[#0F1117] flex flex-col border-r border-white/[0.05]">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-[15px] h-[15px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white tracking-tight leading-none">Relay</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-none">CRM Platform</p>
          </div>
        </div>
      </div>

      {/* Nav section */}
      <div className="px-4 pt-5 pb-1.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Workspace</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <NavItem
          href="/"
          label="Dashboard"
          active={pathname === '/'}
          onClick={onNavigate}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />
        <NavItem
          href="/contacts"
          label="Contacts"
          active={pathname.startsWith('/contacts')}
          onClick={onNavigate}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          }
        />
        <NavItem
          href="/deals"
          label="Deals"
          active={pathname.startsWith('/deals')}
          onClick={onNavigate}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <DisabledNavItem
          label="Companies"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />

        {/* Admin section — only for ADMIN role */}
        {user?.role === 'ADMIN' && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Admin</p>
            </div>
            <NavItem
              href="/admin/users"
              label="Users"
              active={pathname.startsWith('/admin/users')}
              onClick={onNavigate}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                  <path d="M20 8v6M17 11h6" />
                </svg>
              }
            />
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
        <NavItem
          href="/settings"
          label="Settings"
          active={pathname.startsWith('/settings')}
          onClick={onNavigate}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          }
        />
      </div>

      {/* User slot */}
      <div className="px-4 py-3.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-semibold text-indigo-300">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-slate-300 leading-none truncate">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-slate-600 mt-0.5 leading-none truncate">{user?.role ?? 'USER'}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
