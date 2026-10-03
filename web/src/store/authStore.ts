import { create } from 'zustand';

type Role = 'citizen' | 'reviewer' | 'authority';

interface AuthState {
  role: Role;
  token: string | null;
  setRole: (role: Role) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: 'citizen',
  token: 'dummy-token',
  setRole: (role) => set({ role }),
  setToken: (token) => set({ token }),
}));
