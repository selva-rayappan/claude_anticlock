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
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null, token?: string | null) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user, token = null) =>
        set((state) => ({
          user,
          isAuthenticated: !!user,
          token: token !== undefined ? token : state.token,
        })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
      hasAnyRole: (roles) => roles.some((r) => get().user?.roles.includes(r)) ?? false,
    }),
    {
      name: 'opsnext-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
