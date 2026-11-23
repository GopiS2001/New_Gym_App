import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { useSession, LocalExercise } from '@/stores/session';
import type { ProgramWorkout } from './types';

type StartInput = { title: string; programWorkoutId?: number; templateId?: number; exercises: Omit<LocalExercise, 'key' | 'sets'>[] };

export function programWorkoutToSession(w: ProgramWorkout): StartInput {
  return {
    title: w.title,
    programWorkoutId: w.id,
    exercises: w.exercises.map((e) => ({
      exerciseId: e.exercise.id,
      name: e.exercise.name,
      imageUrl: e.exercise.imageUrl,
      loggingFields: e.exercise.exerciseType?.loggingFields ?? ['sets', 'reps', 'weight'],
      targetSets: e.sets,
      targetReps: e.reps,
      targetDuration: e.durationSeconds,
      restSeconds: e.restSeconds,
    })),
  };
}

export function confirm(title: string, message: string, confirmText: string, destructive = true): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? true);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ])
  );
}

/** Starts a workout, asking before replacing one that is in progress. */
export function useStartWorkout() {
  const router = useRouter();
  return async (input: StartInput) => {
    const { active, discard, start } = useSession.getState();
    if (active) {
      const ok = await confirm(
        'Workout in progress',
        `"${active.title}" isn't finished. Discard it and start "${input.title}"?`,
        'Discard & start'
      );
      if (!ok) {
        router.push('/session');
        return;
      }
      await discard();
    }
    start(input);
    router.push('/session');
  };
}

export function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtMinutes(seconds?: number | null) {
  if (!seconds) return '0 min';
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
}
