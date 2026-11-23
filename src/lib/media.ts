import { API_ORIGIN } from './api';

const LOCAL_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i;

/**
 * Media uploaded through the admin dashboard is stored with the URL the API
 * was reached on (often http://localhost:4100/...). "localhost" on a phone
 * means the phone itself, so rewrite such URLs to the API origin the app uses
 * (the dev PC's LAN IP in development). Relative "/uploads/..." paths are
 * resolved the same way. Other absolute URLs (CDN, external) are untouched.
 */
export function mediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return `${API_ORIGIN}${trimmed}`;
  return trimmed.replace(LOCAL_HOSTS, API_ORIGIN);
}
