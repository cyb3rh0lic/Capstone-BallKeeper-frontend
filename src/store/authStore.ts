import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type User = {
  id: number;
  name: string;
  email: string;
  admin: boolean;
};

type AuthState = {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
};

// persist 미들웨어를 사용해 localStorage에 자동 저장
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      isAdmin: () => get().user?.admin === true,
    }),
    {
      name: 'ballkeeper-auth-storage', // localStorage에 저장될 키 이름
    }
  )
);