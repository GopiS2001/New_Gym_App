import { Redirect } from 'expo-router';

import { onboardingDone, useAuth } from '@/stores/auth';

/** Entry: route by session and onboarding state. */
export default function Index() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);

  if (status === 'guest') return <Redirect href="/welcome" />;
  // Offline cold start: user may be null but the session is kept.
  if (user && !onboardingDone(user)) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
