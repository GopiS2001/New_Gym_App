import type { IconName } from '@/components/ui';

import { create } from 'zustand';

export type DialogTone = 'accent' | 'danger' | 'info';

export type DialogOptions = {
  title: string;
  message?: string;
  icon?: IconName;
  tone?: DialogTone;
  confirmText?: string;
  /** Omit for a single-button notice. */
  cancelText?: string;
};

type Open = DialogOptions & { id: number; resolve: (ok: boolean) => void };

type DialogState = {
  current: Open | null;
  queue: Open[];
  show: (o: DialogOptions) => Promise<boolean>;
  close: (ok: boolean) => void;
};

let seq = 0;

/** One app-styled dialog at a time; later requests wait their turn. */
export const useDialog = create<DialogState>((set, get) => ({
  current: null,
  queue: [],
  show: (o) =>
    new Promise<boolean>((resolve) => {
      const item = { ...o, id: ++seq, resolve };
      if (get().current) set({ queue: [...get().queue, item] });
      else set({ current: item });
    }),
  close: (ok) => {
    const { current, queue } = get();
    current?.resolve(ok);
    set({ current: queue[0] ?? null, queue: queue.slice(1) });
  },
}));

/** Shows the styled dialog; resolves true when the main button is pressed. */
export const showDialog = (o: DialogOptions) => useDialog.getState().show(o);
