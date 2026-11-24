import { Redirect } from 'expo-router';

import { isAdmin } from '@/lib/admin';
import { useViewMode } from '@/stores/view-mode';
import { onboardingDone, useAuth } from '@/stores/auth';

/** Entry: route by session and onboarding state. */
export default function Index() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const mode = useViewMode((s) => s.mode);

  if (status === 'guest') return <Redirect href="/welcome" />;
  // Admin accounts get the admin area instead of the member app.
  if (isAdmin(user) && mode === 'admin') return <Redirect href="/admin" />;
  // Offline cold start: user may be null but the session is kept.
  if (user && !onboardingDone(user)) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
