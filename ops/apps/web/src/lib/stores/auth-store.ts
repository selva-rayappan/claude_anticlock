import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  role: 'PLATFORM_ADMIN' | 'ADMIN' | 'MEMBER' | 'READ_ONLY'
  tenantId: string | null
  displayName: string
}

interface AuthState {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
