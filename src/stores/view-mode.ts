import { create } from 'zustand';

/** Admins can switch between the admin area and the member app ("App view"). */
export const useViewMode = create<{ mode: 'admin' | 'app'; setMode: (m: 'admin' | 'app') => void }>((set) => ({
  mode: 'admin',
  setMode: (mode) => set({ mode }),
}));
