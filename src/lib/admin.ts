import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Me } from './types';

import { useAuth } from '@/stores/auth';

import { api, qs, Paginated } from './api';

// ----------------------------------------------------------------------------
// Access

export const PERM = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  CONTENT_VIEW: 'content.view',
  CONTENT_MANAGE: 'content.manage',
  MEDIA_MANAGE: 'media.manage',
} as const;

export const isAdmin = (u?: Me | null) => u?.type === 'ADMIN';

/** UI-only check; the API enforces every permission on its side too. */
export function useCan() {
  const user = useAuth((s) => s.user);
  const perms = user?.permissions ?? [];
  return (p: string) => isAdmin(user) && perms.includes(p);
}

// ----------------------------------------------------------------------------
// Data

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** Paged admin list with search and optional status filter. */
export function useAdminList<T>(path: string, params: Record<string, string | undefined>) {
  return useInfiniteQuery({
    queryKey: ['admin', path, params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Paginated<T> & Record<string, unknown>>(`/admin/${path}${qs({ page: pageParam, limit: 25, ...params })}`),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

export function useAdminItem<T>(path: string, id?: string) {
  return useQuery({
    queryKey: ['admin', path, 'item', id],
    queryFn: () => api.get<T>(`/admin/${path}/${id}`),
    enabled: !!id && id !== 'new',
  });
}

/** Options for selects (reference data or other content), loaded once. */
export function useAdminOptions(path: string, enabled = true) {
  return useQuery({
    queryKey: ['admin-options', path],
    queryFn: async () => {
      const r = await api.get<Paginated<{ id: number; name: string; status?: string; isActive?: boolean }>>(`/admin/${path}${qs({ limit: 500 })}`);
      return r.data.map((o) => ({ id: o.id, name: o.name }));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Status / field toggles with an optimistic update of every cached list page. */
export function useAdminPatch(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, url, body }: { id: number; url?: string; body: Record<string, unknown> }) =>
      api.patch(`/admin/${path}/${id}${url ?? ''}`, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: ['admin', path] });
      qc.setQueriesData({ queryKey: ['admin', path] }, (old: any) =>
        old?.pages
          ? { ...old, pages: old.pages.map((p: any) => ({ ...p, data: p.data.map((r: any) => (r.id === id ? { ...r, ...body } : r)) })) }
          : old
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', path] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return (path: string) => {
    qc.invalidateQueries({ queryKey: ['admin', path] });
    qc.invalidateQueries({ queryKey: ['admin-options', path] });
    qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    // Member-facing content may have changed too.
    ['exercises', 'exercise', 'programs', 'program', 'coaches', 'featured', 'home'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

// ----------------------------------------------------------------------------
// Media

export type MediaFolder = 'exercises' | 'programs' | 'coaches' | 'collections' | 'categories' | 'general';

/** Pick a photo or video from the library and upload it to the media library; returns its public URL. */
export async function pickAndUpload(kind: 'image' | 'video', folder: MediaFolder): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'image' ? ['images'] : ['videos'],
    quality: 0.85,
    allowsEditing: kind === 'image' && Platform.OS !== 'web',
    aspect: kind === 'image' ? [4, 3] : undefined,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const type = asset.mimeType ?? (kind === 'image' ? 'image/jpeg' : 'video/mp4');
  const name = asset.fileName ?? `upload.${type.split('/')[1] ?? 'bin'}`;

  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append('file', new File([blob], name, { type }));
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('file', { uri: asset.uri, name, type } as unknown as Blob);
  }
  form.append('folder', folder);
  const uploaded = await api.upload<{ publicUrl: string }>('/admin/media', form);
  return uploaded.publicUrl;
}
