import { create } from 'zustand';

import { api, ApiError } from '@/lib/api';
import { KEYS, store, uid } from '@/lib/storage';
import type { ServerSession } from '@/lib/types';

import { useOutbox } from './outbox';

export type LocalSet = {
  clientId: string;
  setNumber: number;
  reps?: number | null;
  weightValue?: number | null;
  weightUnit?: 'KG' | 'LB' | null;
  durationSeconds?: number | null;
  distanceValue?: number | null;
  distanceUnit?: 'KM' | 'MI' | 'M' | null;
  rpe?: number | null;
  calories?: number | null;
  notes?: string | null;
  completedAt: string;
};

export type LocalExercise = {
  key: string;
  exerciseId: number;
  name: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  loggingFields: string[];
  targetSets: number | null;
  targetReps: string | null;
  targetDuration: number | null;
  restSeconds: number | null;
  instructions?: string[];
  categoryLabel?: string;
  sets: LocalSet[];
};

export type LocalSession = {
  clientId: string;
  title: string;
  programId?: number;
  programWorkoutId?: number;
  templateId?: number;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  currentIndex: number;
  restEndsAt: number | null;
  restTotal: number;
  exercises: LocalExercise[];
};

export type FinishResult = {
  synced: boolean;
  session: ServerSession | null;
  summary: { title: string; durationSeconds: number; exercises: number; sets: number; volumeKg: number };
};

type SessionState = {
  active: LocalSession | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: (input: { title: string; programWorkoutId?: number; templateId?: number; exercises: Omit<LocalExercise, 'key' | 'sets'>[] }) => void;
  addExercise: (ex: Omit<LocalExercise, 'key' | 'sets'>) => void;
  removeExercise: (key: string) => void;
  setCurrent: (index: number) => void;
  logSet: (key: string, set: Omit<LocalSet, 'clientId' | 'setNumber' | 'completedAt'>) => void;
  deleteSet: (key: string, clientId: string) => void;
  startRest: (seconds: number) => void;
  skipRest: () => void;
  pause: () => void;
  resume: () => void;
  elapsedSeconds: () => number;
  finish: (notes?: string) => Promise<FinishResult>;
  discard: () => Promise<void>;
};

const persist = (s: LocalSession | null) => (s ? store.set(KEYS.activeSession, s) : store.remove(KEYS.activeSession));

/**
 * The active workout lives on the device (persisted after every change) so an
 * app restart or lost connection never loses a set. On finish the whole
 * session is uploaded once via the idempotent /workout-sessions/sync endpoint,
 * or queued in the outbox when offline.
 */
export const useSession = create<SessionState>((set, get) => {
  const update = (fn: (s: LocalSession) => LocalSession) => {
    const cur = get().active;
    if (!cur) return;
    const next = fn(cur);
    set({ active: next });
    persist(next);
  };

  return {
    active: null,
    hydrated: false,

    hydrate: async () => {
      set({ active: await store.get<LocalSession>(KEYS.activeSession), hydrated: true });
    },

    start: ({ title, programWorkoutId, templateId, exercises }) => {
      const s: LocalSession = {
        clientId: `ws-${uid()}`,
        title,
        programWorkoutId,
        templateId,
        startedAt: new Date().toISOString(),
        pausedAt: null,
        pausedSeconds: 0,
        currentIndex: 0,
        restEndsAt: null,
        restTotal: 0,
        exercises: exercises.map((e) => ({ ...e, key: uid(), sets: [] })),
      };
      set({ active: s });
      persist(s);
    },

    addExercise: (ex) => update((s) => ({ ...s, exercises: [...s.exercises, { ...ex, key: uid(), sets: [] }], currentIndex: s.exercises.length })),

    removeExercise: (key) =>
      update((s) => {
        const exercises = s.exercises.filter((e) => e.key !== key);
        return { ...s, exercises, currentIndex: Math.min(s.currentIndex, Math.max(0, exercises.length - 1)) };
      }),

    setCurrent: (index) => update((s) => ({ ...s, currentIndex: Math.max(0, Math.min(index, s.exercises.length - 1)) })),

    logSet: (key, data) =>
      update((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.key === key
            ? { ...e, sets: [...e.sets, { ...data, clientId: `set-${uid()}`, setNumber: e.sets.length + 1, completedAt: new Date().toISOString() }] }
            : e
        ),
      })),

    deleteSet: (key, clientId) =>
      update((s) => ({
        ...s,
        exercises: s.exercises.map((e) =>
          e.key === key ? { ...e, sets: e.sets.filter((x) => x.clientId !== clientId).map((x, i) => ({ ...x, setNumber: i + 1 })) } : e
        ),
      })),

    startRest: (seconds) => update((s) => ({ ...s, restEndsAt: Date.now() + seconds * 1000, restTotal: seconds })),
    skipRest: () => update((s) => ({ ...s, restEndsAt: null, restTotal: 0 })),

    pause: () => update((s) => (s.pausedAt ? s : { ...s, pausedAt: new Date().toISOString(), restEndsAt: null })),
    resume: () =>
      update((s) =>
        s.pausedAt ? { ...s, pausedAt: null, pausedSeconds: s.pausedSeconds + Math.round((Date.now() - new Date(s.pausedAt).getTime()) / 1000) } : s
      ),

    elapsedSeconds: () => {
      const s = get().active;
      if (!s) return 0;
      const end = s.pausedAt ? new Date(s.pausedAt).getTime() : Date.now();
      return Math.max(0, Math.round((end - new Date(s.startedAt).getTime()) / 1000) - s.pausedSeconds);
    },

    finish: async (notes) => {
      const s = get().active;
      if (!s) throw new Error('No active workout');
      const durationSeconds = get().elapsedSeconds();
      const logged = s.exercises.filter((e) => e.sets.length);
      const body = {
        clientId: s.clientId,
        title: s.title,
        programWorkoutId: s.programWorkoutId,
        templateId: s.templateId,
        startedAt: s.startedAt,
        completedAt: new Date().toISOString(),
        durationSeconds,
        status: 'COMPLETED',
        notes: notes || undefined,
        exercises: logged.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets.map(({ clientId, ...rest }) => ({ clientId, ...rest })),
        })),
      };

      const summary = {
        title: s.title,
        durationSeconds,
        exercises: logged.length,
        sets: logged.reduce((n, e) => n + e.sets.length, 0),
        volumeKg: Math.round(
          logged.reduce(
            (v, e) => v + e.sets.reduce((a, x) => a + (x.weightValue ?? 0) * (x.weightUnit === 'LB' ? 0.4536 : 1) * (x.reps ?? 0), 0),
            0
          )
        ),
      };

      let result: FinishResult;
      try {
        const res = await api.post<{ duplicate: boolean; session: ServerSession }>('/workout-sessions/sync', body);
        result = { synced: true, session: res.session, summary };
      } catch (e) {
        const err = e as ApiError;
        if (err.status && err.status < 500 && err.status !== 401) throw err; // real validation problem — keep the workout
        await useOutbox.getState().enqueue({ id: s.clientId, method: 'POST', path: '/workout-sessions/sync', body, label: s.title });
        result = { synced: false, session: null, summary };
      }

      set({ active: null });
      await persist(null);
      return result;
    },

    discard: async () => {
      set({ active: null });
      await persist(null);
    },
  };
});
