import { create } from 'zustand';

import { api } from '@/lib/api';
import { KEYS, store } from '@/lib/storage';
import type { OnboardingAnswers } from '@/lib/types';

type Draft = { step: number; answers: OnboardingAnswers };

type OnboardingState = Draft & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setAnswers: (patch: Partial<OnboardingAnswers>) => void;
  goTo: (step: number) => void;
  /** Saves to the server too when signed in (resume on any device). */
  syncRemote: (stepKey: string) => Promise<void>;
  reset: () => Promise<void>;
};

/**
 * Onboarding answers are saved locally after every step so the flow resumes
 * after an app restart, and to the server draft once an account exists.
 */
export const useOnboarding = create<OnboardingState>((set, get) => ({
  step: 0,
  answers: {},
  hydrated: false,

  hydrate: async () => {
    const draft = await store.get<Draft>(KEYS.onboarding);
    set({ ...(draft ?? {}), hydrated: true });
  },

  setAnswers: (patch) => {
    const answers = { ...get().answers, ...patch };
    set({ answers });
    store.set(KEYS.onboarding, { step: get().step, answers });
  },

  goTo: (step) => {
    set({ step });
    store.set(KEYS.onboarding, { step, answers: get().answers });
  },

  syncRemote: async (stepKey) => {
    try {
      await api.put('/onboarding', { step: stepKey, answers: get().answers });
    } catch {
      // Local draft is the fallback; it is re-sent on completion.
    }
  },

  reset: async () => {
    set({ step: 0, answers: {} });
    await store.remove(KEYS.onboarding);
  },
}));
