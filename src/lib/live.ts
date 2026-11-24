import { useEffect } from 'react';
import { AppState } from 'react-native';

import { showToast } from '@/stores/toast';

import { api, API_URL, tokens } from './api';
import { queryClient } from './queries';

const LIVE_URL = `${API_URL.replace(/^http/, 'ws')}/live`;

/**
 * Keeps a live connection to the API while signed in so that an admin
 * "Force logout" (or suspension / password reset) signs this device out
 * instantly. Reconnects with backoff; the minute-by-minute presence
 * heartbeat remains as a fallback.
 */
export function useLiveSession(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const schedule = () => {
      if (stopped || retry) return;
      const wait = Math.min(30_000, 1_000 * 2 ** attempt++);
      retry = setTimeout(() => {
        retry = null;
        connect();
      }, wait);
    };

    const connect = async () => {
      if (stopped || (ws && ws.readyState <= 1)) return;
      const token = tokens.current();
      if (!token) return schedule();
      const socket = new WebSocket(`${LIVE_URL}?token=${encodeURIComponent(token)}`);
      ws = socket;
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data));
          if (msg.type === 'signed_out') {
            stopped = true;
            tokens.expire(); // shows "Session ended" and returns to Welcome
          }
          if (msg.type === 'notification' || msg.type === 'friends_changed' || msg.type === 'notifications_changed') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['friends'] });
          }
          if (msg.type === 'notification' && msg.notification) {
            const n = msg.notification;
            showToast({
              title: n.title,
              body: n.type === 'friend_request' ? 'Tap to accept or reject' : n.body,
              avatarName: n.data?.fromName,
              icon: n.type === 'friend_accepted' ? 'people' : n.type === 'friend_rejected' ? 'person-remove' : 'person-add',
              href: '/notifications',
            });
          }
        } catch {
          // ignore malformed messages
        }
      };
      socket.onclose = async (e) => {
        if (ws === socket) ws = null;
        if (stopped) return;
        if (e.code === 4401) {
          // Access token expired or was revoked: any normal request refreshes it
          // (or ends the session if the refresh is rejected), then we retry.
          await api.post('/presence', { state: 'active' }).catch(() => undefined);
        }
        schedule();
      };
    };

    connect();
    // Coming back to the app: reconnect immediately if the socket dropped.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        attempt = 0;
        if (retry) {
          clearTimeout(retry);
          retry = null;
        }
        connect();
      }
    });

    return () => {
      stopped = true;
      sub.remove();
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, [enabled]);
}
