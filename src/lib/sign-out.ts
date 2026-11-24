import { router } from 'expo-router';

import { useAuth } from '@/stores/auth';
import { useOutbox } from '@/stores/outbox';
import { useSession } from '@/stores/session';
import { useViewMode } from '@/stores/view-mode';

import { queryClient } from './queries';
import { confirm } from './workout';

/** Sign out now: clears the session and cached data, returns to Welcome. */
export async function signOutNow() {
  await useAuth.getState().logout();
  useViewMode.getState().setMode('admin');
  queryClient.clear();
  router.replace('/welcome');
}

/**
 * Ask "Log out?" first (mentioning any in-progress or unsynced workouts),
 * then sign out. Returns true if the member logged out.
 */
export async function confirmSignOut() {
  const pending = useOutbox.getState().items.length;
  const active = useSession.getState().active;
  const notes = [
    active ? `Your workout in progress ("${active.title}") stays on this phone.` : '',
    pending ? `${pending} finished workout${pending > 1 ? 's' : ''} will sync when you log back in.` : '',
  ].filter(Boolean);
  const message = ['You will need to log in again to use FitFlow.', ...notes].join('\n\n');
  const ok = await confirm('Log out?', message, 'Log out', true, 'log-out-outline');
  if (ok) await signOutNow();
  return ok;
}
