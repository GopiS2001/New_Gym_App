import type { IconName } from '@/components/ui';

import { create } from 'zustand';

export type Toast = { id: number; title: string; body?: string | null; icon?: IconName; avatarName?: string; href?: string };

let seq = 0;

/** One banner at a time; a new one replaces the current. */
export const useToast = create<{ current: Toast | null; show: (t: Omit<Toast, 'id'>) => void; hide: () => void }>((set) => ({
  current: null,
  show: (t) => set({ current: { ...t, id: ++seq } }),
  hide: () => set({ current: null }),
}));

export const showToast = (t: Omit<Toast, 'id'>) => useToast.getState().show(t);
