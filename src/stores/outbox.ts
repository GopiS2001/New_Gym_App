import { create } from 'zustand';

import { ApiError, request } from '@/lib/api';
import { KEYS, store } from '@/lib/storage';

export type OutboxItem = {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  label: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

type OutboxState = {
  items: OutboxItem[];
  syncing: boolean;
  hydrate: () => Promise<void>;
  enqueue: (item: Omit<OutboxItem, 'createdAt' | 'attempts'>) => Promise<void>;
  flush: () => Promise<number>;
};

/**
 * Durable queue for writes made offline (e.g. finished workouts). Every
 * request carries an idempotency key (clientId) so retries never duplicate.
 */
export const useOutbox = create<OutboxState>((set, get) => ({
  items: [],
  syncing: false,

  hydrate: async () => {
    set({ items: (await store.get<OutboxItem[]>(KEYS.outbox)) ?? [] });
  },

  enqueue: async (item) => {
    const items = [...get().items.filter((i) => i.id !== item.id), { ...item, createdAt: new Date().toISOString(), attempts: 0 }];
    set({ items });
    await store.set(KEYS.outbox, items);
  },

  flush: async () => {
    if (get().syncing || !get().items.length) return 0;
    set({ syncing: true });
    let sent = 0;
    try {
      for (const item of [...get().items]) {
        try {
          await request(item.path, { method: item.method, body: item.body ?? {} });
          sent++;
          const items = get().items.filter((i) => i.id !== item.id);
          set({ items });
          await store.set(KEYS.outbox, items);
        } catch (e) {
          const err = e as ApiError;
          if (err.status === 0 || err.status >= 500 || err.status === 401) {
            // Offline / server trouble / session refresh pending: retry later.
            const items = get().items.map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1, lastError: err.message } : i));
            set({ items });
            await store.set(KEYS.outbox, items);
            break;
          }
          // A validation error will never succeed: keep it visible but flagged.
          const items = get().items.map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1, lastError: err.message } : i));
          set({ items });
          await store.set(KEYS.outbox, items);
        }
      }
    } finally {
      set({ syncing: false });
    }
    return sent;
  },
}));
