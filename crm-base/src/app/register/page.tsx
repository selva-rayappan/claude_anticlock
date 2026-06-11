'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { register } from '@/app/actions/auth'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, null)

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">

        {/* Brand */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[10px] bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-white tracking-tight leading-none">Relay CRM</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-none">Create your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7">
          <h1 className="text-[17px] font-semibold text-white mb-1">Get started</h1>
          <p className="text-[13px] text-slate-500 mb-6">Create an account to access the CRM.</p>

          {/* Google OAuth */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg
              bg-white/[0.06] border border-white/[0.10] text-sm text-slate-200
              hover:bg-white/[0.10] transition-colors mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          <form action={action} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Full Name</label>
              <input
                name="name"
                type="text"
                autoComplete="name"
                autoFocus
                required
                placeholder="Your name"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Password</label>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Min. 8 characters"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Confirm Password</label>
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-colors"
              />
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-[12px] text-rose-400">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium
                hover:bg-indigo-500 active:bg-indigo-700 transition-colors
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 mt-2"
            >
              {pending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Creating account…
                </>
              ) : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[12px] text-slate-600 mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
