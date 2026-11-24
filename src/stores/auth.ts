import { showDialog } from './dialog';
import { create } from 'zustand';

import { api, tokens } from '@/lib/api';
import type { AuthResponse, Me, OnboardingAnswers } from '@/lib/types';

type Status = 'loading' | 'guest' | 'authed';

type AuthState = {
  status: Status;
  user: Me | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<Me>;
  register: (input: { name: string; email: string; password: string; confirmPassword: string; acceptTerms: true; onboarding?: OnboardingAnswers }) => Promise<Me>;
  refreshMe: () => Promise<Me | null>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  bootstrap: async () => {
    tokens.onExpired(() => {
      const wasSignedIn = get().status === 'authed';
      set({ status: 'guest', user: null });
      // e.g. an admin used "Force logout", or the session expired.
      if (wasSignedIn) {
        showDialog({
          title: 'Session ended',
          message: "You've been signed out. Please log in again to keep training.",
          icon: 'time-outline',
          tone: 'info',
          confirmText: 'OK',
        });
      }
    });
    const { accessToken, refreshToken } = await tokens.load();
    if (!accessToken && !refreshToken) {
      set({ status: 'guest' });
      return;
    }
    try {
      const me = await api.get<Me>('/auth/me');
      set({ status: 'authed', user: me });
    } catch (e: any) {
      if (e?.status === 0) {
        // Offline: keep the stored session so cached screens remain usable.
        set({ status: 'authed' });
      } else {
        await tokens.clear();
        set({ status: 'guest', user: null });
      }
    }
  },

  login: async (email, password) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    await tokens.save(res.accessToken, res.refreshToken);
    const me = await api.get<Me>('/auth/me');
    set({ status: 'authed', user: me });
    return me;
  },

  register: async (input) => {
    const res = await api.post<AuthResponse>('/auth/register', input);
    await tokens.save(res.accessToken, res.refreshToken);
    const me = await api.get<Me>('/auth/me');
    set({ status: 'authed', user: me });
    return me;
  },

  refreshMe: async () => {
    try {
      const me = await api.get<Me>('/auth/me');
      set({ user: me });
      return me;
    } catch {
      return get().user;
    }
  },

  logout: async () => {
    const { refreshToken } = await tokens.load();
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore — local session is cleared regardless
    }
    await tokens.clear();
    set({ status: 'guest', user: null });
  },
}));

export const onboardingDone = (me: Me | null) => me?.onboarding?.onboardingStatus === 'COMPLETED';
