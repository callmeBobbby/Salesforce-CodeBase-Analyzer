// store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: any | null;
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: any) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: localStorage.getItem('token'),
  user: null,
  login: (token: string) => {
    localStorage.setItem('token', token);
    set({ isAuthenticated: true, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ isAuthenticated: false, token: null, user: null });
  },
  setUser: (user) => set({ user }),
}));

export default useAuthStore;