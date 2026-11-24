import { router } from 'expo-router';
import type { Href } from 'expo-router';

/**
 * Go back if there is a screen to return to; otherwise (e.g. the page was
 * opened directly or reloaded on web) go to a sensible screen instead of
 * throwing "GO_BACK was not handled by any navigator".
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
