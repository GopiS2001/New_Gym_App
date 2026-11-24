import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { useProgram } from '@/lib/queries';
import { NumberedRow } from '@/components/content';
import { programWorkoutToSession, useStartWorkout } from '@/lib/workout';
import { Button, ErrorState, Header, Row, Skeleton, StatTile, Text } from '@/components/ui';

/** Workout overview before starting (design screen 3). */
export default function WorkoutOverview() {
  const { id, workoutId } = useLocalSearchParams<{ id: string; workoutId: string }>();
  const router = useRouter();
  const { data: p, isLoading, error, refetch } = useProgram(id);
  const startWorkout = useStartWorkout();
  const workout = p?.weeks.flatMap((w) => w.workouts).find((w) => String(w.id) === workoutId);

  const totalSets = workout?.exercises.reduce((n, e) => n + (e.sets ?? 0), 0) ?? 0;
  const minutes = workout?.estimatedMinutes ?? Math.round(((workout?.exercises.reduce((s, e) => s + (e.sets ?? 3) * ((e.restSeconds ?? 60) + 40), 0) ?? 0) / 60));
  const level = p?.difficulty ? p.difficulty[0] + p.difficulty.slice(1).toLowerCase() : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <Header title={workout?.title ?? 'Workout'} />
        {error ? (
          <View style={{ padding: 20 }}>
            <ErrorState onRetry={() => refetch()} />
          </View>
        ) : isLoading || !workout ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Skeleton height={80} />
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 30 }}>
              <Row gap={10}>
                <StatTile style={{ flex: 1 }} icon="time-outline" value={`${minutes}`} label="MIN" />
                <StatTile style={{ flex: 1 }} icon="stats-chart-outline" value={level} label="LEVEL" />
                <StatTile style={{ flex: 1 }} icon="layers-outline" value={String(totalSets)} label="SETS" />
                <StatTile style={{ flex: 1 }} icon="barbell-outline" value={String(workout.exercises.length)} label="EXERCISES" />
              </Row>
              {!!workout.description && (
                <Text variant="body" color={colors.textSecondary} style={{ marginTop: 16 }}>
                  {workout.description}
                </Text>
              )}
              <Text variant="h3" style={{ marginTop: 24, marginBottom: 12 }}>
                Exercises
              </Text>
              <View style={{ gap: 10 }}>
                {workout.exercises.map((e, i) => (
                  <NumberedRow
                    key={e.id}
                    index={i + 1}
                    title={e.exercise.name}
                    meta={[e.sets, e.reps].filter(Boolean).join('/') || (e.durationSeconds ? `${e.durationSeconds}s` : undefined)}
                    onPress={() => router.push(`/exercise/${e.exercise.id}`)}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Button title="Start Workout" icon="play" onPress={() => startWorkout(programWorkoutToSession(workout))} />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
