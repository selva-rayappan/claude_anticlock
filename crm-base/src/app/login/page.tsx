'use client'

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">

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
            <p className="text-[11px] text-slate-500 mt-0.5 leading-none">Sign in to continue</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7">

          <h1 className="text-[17px] font-semibold text-white mb-1">Welcome back</h1>
          <p className="text-[13px] text-slate-500 mb-6">Enter your credentials to access the dashboard.</p>

          <form action={action} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                Username
              </label>
              <input
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                placeholder="admin"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60
                  transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10]
                  text-sm text-white placeholder:text-slate-600
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60
                  transition-colors"
              />
            </div>

            {/* Error */}
            {state?.error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-[12px] text-rose-400">{state.error}</p>
              </div>
            )}

            {/* Submit */}
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
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
