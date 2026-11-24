import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, Paginated, qs } from './api';
import type {
  Catalog,
  Coach,
  ExerciseCard,
  ExerciseDetail,
  ExerciseHistory,
  Home,
  Library,
  MemberCollection,
  OnboardingOptions,
  ProgramCard,
  ProgramDetail,
  ProgressSummary,
  Profile,
  ServerSession,
} from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: (count, err: any) => err?.status !== 404 && err?.status !== 401 && count < 2,
    },
  },
});

// ---- reads -------------------------------------------------------------------

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api.get<Home>('/home') });

export const useOnboardingOptions = () =>
  useQuery({ queryKey: ['onboarding-options'], queryFn: () => api.get<OnboardingOptions>('/onboarding/options'), staleTime: 10 * 60_000 });

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/profile') });

export const useCategories = () =>
  useQuery({ queryKey: ['exercise-categories'], queryFn: () => api.get<Catalog[]>('/exercise-categories'), staleTime: 10 * 60_000 });

export const useReference = (path: 'equipment' | 'exercise-types' | 'muscles' | 'goals' | 'focus-areas') =>
  useQuery({ queryKey: ['ref', path], queryFn: () => api.get<Catalog[]>(`/${path}`), staleTime: 10 * 60_000 });

export type ExerciseFilters = {
  search?: string;
  category?: string;
  equipment?: string[];
  difficulty?: string[];
  type?: string[];
  muscle?: string[];
  sort?: 'recommended' | 'az' | 'recent' | 'popular';
};

export const useExercises = (f: ExerciseFilters) =>
  useInfiniteQuery({
    queryKey: ['exercises', f],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<Paginated<ExerciseCard>>(
        `/exercises${qs({ page: pageParam, limit: 20, search: f.search, category: f.category, equipment: f.equipment, difficulty: f.difficulty, type: f.type, muscle: f.muscle, sort: f.sort })}`
      ),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

export const useExercise = (id?: string) =>
  useQuery({ queryKey: ['exercise', id], queryFn: () => api.get<ExerciseDetail>(`/exercises/${id}`), enabled: !!id });

export const useExerciseHistory = (id?: string) =>
  useQuery({ queryKey: ['exercise-history', id], queryFn: () => api.get<ExerciseHistory>(`/exercises/${id}/history`), enabled: !!id });

export const useExercisePrograms = (id?: string) =>
  useQuery({ queryKey: ['exercise-programs', id], queryFn: () => api.get<ProgramCard[]>(`/exercises/${id}/programs`), enabled: !!id });

export const usePrograms = (f: { search?: string; goal?: string; difficulty?: string } = {}) =>
  useQuery({ queryKey: ['programs', f], queryFn: () => api.get<Paginated<ProgramCard>>(`/programs${qs({ limit: 50, ...f })}`) });

export const useProgram = (id?: string) =>
  useQuery({ queryKey: ['program', id], queryFn: () => api.get<ProgramDetail>(`/programs/${id}`), enabled: !!id });

export const useMyPrograms = () => useQuery({ queryKey: ['my-programs'], queryFn: () => api.get<any[]>('/programs/mine') });

export const useCoaches = () => useQuery({ queryKey: ['coaches'], queryFn: () => api.get<Coach[]>('/coaches') });
export const useCoach = (id?: string) => useQuery({ queryKey: ['coach', id], queryFn: () => api.get<Coach>(`/coaches/${id}`), enabled: !!id });

export const useFeatured = () =>
  useQuery({ queryKey: ['featured'], queryFn: () => api.get<(MemberCollection & { imageUrl: string | null; slug: string; isFeatured: boolean })[]>('/collections?featured=true') });

export const useLibrary = (enabled = true) => useQuery({ queryKey: ['library'], queryFn: () => api.get<Library>('/library'), enabled });

export const useSessions = () =>
  useInfiniteQuery({
    queryKey: ['sessions'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<Paginated<ServerSession>>(`/workout-sessions${qs({ page: pageParam, limit: 15, status: 'COMPLETED' })}`),
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

export const useSessionDetail = (id?: string) =>
  useQuery({ queryKey: ['session', id], queryFn: () => api.get<ServerSession>(`/workout-sessions/${id}`), enabled: !!id });

export const useProgress = (period: 'week' | 'month') =>
  useQuery({ queryKey: ['progress', period], queryFn: () => api.get<ProgressSummary>(`/workout-progress/summary?period=${period}`) });

export const useMeasurements = () =>
  useQuery({ queryKey: ['measurements'], queryFn: () => api.get<{ id: number; value: number; unit: string; measuredAt: string; measurementType: string }[]>('/profile/measurements?type=weight') });

// ---- writes ------------------------------------------------------------------

/** Optimistic save/unsave for exercises and programs. */
export function useToggleSave(kind: 'exercises' | 'programs') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: number; saved: boolean }) =>
      saved ? api.delete(`/library/${kind}/${id}`) : api.post(`/library/${kind}/${id}`),
    onMutate: async ({ id, saved }) => {
      const key = kind === 'exercises' ? ['exercise'] : ['program'];
      qc.setQueriesData({ queryKey: key }, (old: any) => (old && old.id === id ? { ...old, isSaved: !saved } : old));
      qc.setQueriesData({ queryKey: [kind] }, (old: any) => {
        if (!old) return old;
        const patch = (list: any[]) => list.map((x) => (x.id === id ? { ...x, isSaved: !saved } : x));
        if (old.pages) return { ...old, pages: old.pages.map((p: any) => ({ ...p, data: patch(p.data) })) };
        if (old.data) return { ...old, data: patch(old.data) };
        return old;
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: [kind] });
      qc.invalidateQueries({ queryKey: kind === 'exercises' ? ['exercise'] : ['program'] });
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}
