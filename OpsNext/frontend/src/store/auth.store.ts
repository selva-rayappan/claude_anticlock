import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId: string;
  tier: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
      hasAnyRole: (roles) => roles.some((r) => get().user?.roles.includes(r)) ?? false,
    }),
    {
      name: 'opsnext-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
