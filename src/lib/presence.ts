import { useEffect } from 'react';
import { AppState } from 'react-native';

import { api } from './api';

const HEARTBEAT_MS = 60_000; // server treats a member as online for 150 s after a beat

function send(state: 'active' | 'background') {
  // Fire-and-forget: presence must never surface errors to the member.
  api.post('/presence', { state }).catch(() => undefined);
}

/**
 * Tells the API the member has the app open (every minute while in the
 * foreground) and when it goes to the background, so admins can see who is
 * online right now.
 */
export function usePresence(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      send('active');
      timer ??= setInterval(() => send('active'), HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
      else if (next === 'background') {
        stop();
        send('background');
      }
    });

    return () => {
      sub.remove();
      stop();
    };
  }, [enabled]);
}
