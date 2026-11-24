import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { KEYS, secure } from './storage';

// ----------------------------------------------------------------------
// Base URL

function resolveBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  const port = process.env.EXPO_PUBLIC_API_PORT || '4100';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  }
  // In development the dev server host is the machine running the API.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:${port}`;
}

export const API_ORIGIN = resolveBaseUrl();
export const API_URL = `${API_ORIGIN}/api/v1`;

// ----------------------------------------------------------------------

export class ApiError extends Error {
  status: number;

  details?: { field: string; message: string }[] | Record<string, unknown>;

  constructor(message: string, status: number, details?: ApiError['details']) {
    super(message);
    this.status = status;
    this.details = details;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

let accessToken: string | null = null;
let refreshing: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokens = {
  async load() {
    accessToken = await secure.get(KEYS.access);
    return { accessToken, refreshToken: await secure.get(KEYS.refresh) };
  },
  async save(access: string, refresh: string) {
    accessToken = access;
    await secure.set(KEYS.access, access);
    await secure.set(KEYS.refresh, refresh);
  },
  async clear() {
    accessToken = null;
    await secure.remove(KEYS.access);
    await secure.remove(KEYS.refresh);
  },
  onExpired(cb: () => void) {
    onSessionExpired = cb;
  },
  /** Current access token (for the live connection). */
  current() {
    return accessToken;
  },
  /** The server ended this session (e.g. admin force logout): sign out now. */
  async expire() {
    await tokens.clear();
    onSessionExpired?.();
  },
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await secure.get(KEYS.refresh);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // A definitive rejection ends the session; network errors keep it.
      if (res.status === 401) await tokens.clear();
      return null;
    }
    const data = await res.json();
    await tokens.save(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

type Options = { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal };

/** JSON request with bearer auth and one transparent token refresh on 401. */
export async function request<T>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (accessToken && opts.auth !== false) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch {
    throw new ApiError("You're offline or the server can't be reached.", 0);
  }

  if (res.status === 401 && !retried && opts.auth !== false && !path.startsWith('/auth/')) {
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const token = await refreshing;
    if (token) return request<T>(path, opts, true);
    if (!(await secure.get(KEYS.refresh))) onSessionExpired?.();
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Something went wrong. Please try again.', res.status, data?.details);
  }
  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ?? {} }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  /** multipart/form-data upload (e.g. admin media). */
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

export function qs(params: Record<string, string | number | boolean | undefined | null | (string | number)[]>) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export type Paginated<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong';
}
