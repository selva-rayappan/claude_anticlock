'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { logout } from '@/app/actions/auth'

interface MobileHeaderProps {
  user?: { name: string; email: string; role: string }
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      {/* Fixed top bar */}
      <div className="fixed inset-x-0 top-0 z-30 h-14 bg-[#0F1117] flex items-center px-4 gap-3 border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-[6px] bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-white tracking-tight">Relay CRM</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="p-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </form>
      </div>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3.5 right-3 z-10 p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <Sidebar user={user} onNavigate={() => setOpen(false)} />
      </div>
    </div>
  )
}
