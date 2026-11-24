import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Me } from './types';

import { useAuth } from '@/stores/auth';

import { api, qs, Paginated } from './api';

export type Relation = 'none' | 'friends' | 'request_sent' | 'request_received';

export type Person = {
  id: number;
  name: string;
  avatarUrl: string | null;
  friendCount: number;
  online: boolean;
  relation: Relation;
  requestId: number | null;
  friendsSince?: string;
};

export type FriendRequestItem = { id: number; createdAt: string; person: Person };

export type AppNotification = {
  id: number;
  type: 'friend_request' | 'friend_accepted' | string;
  title: string;
  body: string | null;
  data: { requestId?: number; fromUserId?: number; userId?: number; fromName?: string; fromAvatarUrl?: string | null } | null;
  readAt: string | null;
  createdAt: string;
  requestStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | null;
};

/** The Super Admin never takes part in friends. */
export const canUseFriends = (u?: Me | null) => !!u && u.role?.key !== 'super_admin';

export function useCanUseFriends() {
  return canUseFriends(useAuth((s) => s.user));
}

// ---- reads --------------------------------------------------------------------

export function usePeople(search: string) {
  const enabled = useCanUseFriends();
  return useInfiniteQuery({
    queryKey: ['friends', 'people', search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Paginated<Person>>(`/friends/people${qs({ page: pageParam, limit: 30, search })}`),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled,
  });
}

export function useFriends() {
  const enabled = useCanUseFriends();
  return useQuery({ queryKey: ['friends', 'list'], queryFn: () => api.get<{ friendCount: number; data: Person[] }>('/friends'), enabled });
}

export function useFriendRequests() {
  const enabled = useCanUseFriends();
  return useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () => api.get<{ incoming: FriendRequestItem[]; outgoing: FriendRequestItem[] }>('/friends/requests'),
    enabled,
  });
}

export function useNotifications() {
  const authed = useAuth((s) => s.status === 'authed');
  return useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ unread: number; data: AppNotification[] }>('/notifications'), enabled: authed });
}

export function useUnreadCount() {
  const authed = useAuth((s) => s.status === 'authed');
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get<{ unread: number }>('/notifications/unread-count'),
    enabled: authed,
    refetchInterval: 60_000,
  });
}

// ---- writes -------------------------------------------------------------------

type Action =
  | { kind: 'send'; person: Person }
  | { kind: 'accept'; person: Person; requestId: number }
  | { kind: 'reject'; person: Person; requestId: number }
  | { kind: 'cancel'; person: Person; requestId: number }
  | { kind: 'remove'; person: Person };

const nextRelation: Record<Action['kind'], Relation> = { send: 'request_sent', accept: 'friends', reject: 'none', cancel: 'none', remove: 'none' };

/** Every friend action, with an instant (optimistic) update of the people list. */
export function useFriendAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: Action) => {
      switch (a.kind) {
        case 'send':
          return api.post<{ relation: Relation; requestId?: number }>('/friends/requests', { userId: a.person.id });
        case 'accept':
          return api.post<{ relation: Relation }>(`/friends/requests/${a.requestId}/accept`);
        case 'reject':
          return api.post<{ relation: Relation }>(`/friends/requests/${a.requestId}/reject`);
        case 'cancel':
          return api.delete<{ relation: Relation }>(`/friends/requests/${a.requestId}`);
        case 'remove':
          return api.delete<{ relation: Relation }>(`/friends/${a.person.id}`);
      }
    },
    onMutate: async (a) => {
      await qc.cancelQueries({ queryKey: ['friends', 'people'] });
      qc.setQueriesData({ queryKey: ['friends', 'people'] }, (old: any) =>
        old?.pages
          ? {
              ...old,
              pages: old.pages.map((p: any) => ({
                ...p,
                data: p.data.map((x: Person) => (x.id === a.person.id ? { ...x, relation: nextRelation[a.kind] } : x)),
              })),
            }
          : old
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
