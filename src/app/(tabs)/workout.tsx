import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, View } from 'react-native';

import { api, Paginated } from '@/lib/api';
import { useSession } from '@/stores/session';
import { useOutbox } from '@/stores/outbox';
import { colors } from '@/theme/tokens';
import { BarStrip } from '@/components/charts';
import { Cover, difficultyLabel } from '@/components/content';
import type { ExerciseDetail } from '@/lib/types';
import { SessionRow } from '@/components/session-row';
import { useHome, useMyPrograms, useProgress, useSessions } from '@/lib/queries';
import { fmtMinutes, programWorkoutToSession, toSessionExercise, useStartWorkout } from '@/lib/workout';
import { Button, Card, EmptyState, FadeIn, Icon, Row, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';

type Template = {
  id: number;
  name: string;
  imageUrl: string | null;
  difficulty: string;
  daysPerWeek: number;
  split: string | null;
  exercises: { exerciseId: number; dayNumber: number; sets: number | null; reps: string | null; restSeconds: number | null; durationSeconds: number | null; exercise: { id: number; name: string } }[];
};

export default function WorkoutTab() {
  const router = useRouter();
  const active = useSession((s) => s.active);
  const pending = useOutbox((s) => s.items);
  const home = useHome();
  const week = useProgress('week');
  const programs = useMyPrograms();
  const sessions = useSessions();
  const templates = useQuery({ queryKey: ['templates'], queryFn: () => api.get<Paginated<Template>>('/workout-templates?limit=20') });
  const startWorkout = useStartWorkout();
  const [starting, setStarting] = useState<string | null>(null);

  const recent = sessions.data?.pages[0]?.data.slice(0, 4) ?? [];
  const today = home.data?.todaysWorkout;
  const enrollment = home.data?.currentProgram;

  const startToday = async () => {
    if (!enrollment || !today) return;
    setStarting('today');
    try {
      const p = await api.get<any>(`/programs/${enrollment.programId}`);
      const wk = p.weeks.flatMap((w: any) => w.workouts).find((w: any) => w.id === today.id);
      if (wk) await startWorkout(programWorkoutToSession(wk));
    } finally {
      setStarting(null);
    }
  };

  const startTemplate = async (t: Template) => {
    setStarting(`t${t.id}`);
    try {
      const day1 = t.exercises.filter((e) => e.dayNumber === 1);
      const details = await Promise.all(day1.map((e) => api.get<ExerciseDetail>(`/exercises/${e.exerciseId}`)));
      await startWorkout({
        title: t.name,
        templateId: t.id,
        exercises: details.map((d, i) => ({
          ...toSessionExercise(d),
          targetSets: day1[i].sets,
          targetReps: day1[i].reps,
          targetDuration: day1[i].durationSeconds,
          restSeconds: day1[i].restSeconds ?? 90,
        })),
      });
    } finally {
      setStarting(null);
    }
  };

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          tintColor={colors.accent}
          refreshing={sessions.isRefetching}
          onRefresh={() => {
            sessions.refetch();
            week.refetch();
            home.refetch();
            programs.refetch();
          }}
        />
      }
    >
      <Text variant="h1" style={{ marginTop: 12 }} accessibilityRole="header">
        Workout
      </Text>

      {active ? (
        <Card highlight style={{ marginTop: 16 }}>
          <Row>
            <Icon name="pulse" size={26} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.accent}>
                IN PROGRESS
              </Text>
              <Text variant="h3">{active.title}</Text>
              <Text variant="small" color={colors.muted}>
                {active.exercises.reduce((n, e) => n + e.sets.length, 0)} sets logged
              </Text>
            </View>
            <Button title="Continue" size="sm" full={false} onPress={() => router.push('/session')} />
          </Row>
        </Card>
      ) : (
        <View style={{ gap: 12, marginTop: 16 }}>
          {today && enrollment ? (
            <Card>
              <Text variant="caption" color={colors.accent}>
                TODAY · {enrollment.program.name.toUpperCase()}
              </Text>
              <Text variant="h2" style={{ marginTop: 4 }}>
                {today.title}
              </Text>
              <Text variant="small" color={colors.muted} style={{ marginBottom: 14 }}>
                {today.exercises.length} exercises{today.estimatedMinutes ? ` · ~${today.estimatedMinutes} min` : ''}
              </Text>
              <Row gap={10}>
                <Button title="Start" icon="play" size="md" onPress={startToday} loading={starting === 'today'} style={{ flex: 1 }} />
                <Button title="Preview" variant="secondary" size="md" full={false} onPress={() => router.push(`/program/${enrollment.programId}/workout/${today.id}`)} />
              </Row>
            </Card>
          ) : null}
          <Card onPress={() => startWorkout({ title: 'Quick workout', exercises: [] })} accessibilityLabel="Start empty workout">
            <Row>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="add" size={26} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Start empty workout</Text>
                <Text variant="small" color={colors.muted}>
                  Pick exercises as you go and log every set
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Row>
          </Card>
        </View>
      )}

      {/* This week */}
      <SectionHeader title="This week" action="Progress" onAction={() => router.push('/progress')} />
      <Card>
        {week.isLoading ? (
          <Skeleton height={120} />
        ) : (
          <>
            <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text variant="number">
                  {week.data?.workouts ?? 0}
                  <Text variant="body" color={colors.muted}>
                    {' '}
                    / {week.data?.weeklyTarget ?? '–'} workouts
                  </Text>
                </Text>
              </View>
              <Text variant="smallStrong" color={colors.accent}>
                {fmtMinutes(week.data?.totalDurationSeconds)}
              </Text>
            </Row>
            <BarStrip data={dayLabels.map((label, i) => ({ label, value: week.data?.days[i]?.workouts ?? 0 }))} height={100} />
          </>
        )}
      </Card>

      {/* Programs */}
      {!!programs.data?.filter((e) => e.status === 'ACTIVE').length && (
        <>
          <SectionHeader title="My programs" />
          <View style={{ gap: 10 }}>
            {programs.data
              .filter((e) => e.status === 'ACTIVE')
              .map((e) => (
                <Card key={e.id} onPress={() => router.push(`/program/${e.programId}`)} style={{ padding: 10 }} accessibilityLabel={e.program.name}>
                  <Row>
                    <Cover uri={e.program.imageUrl} icon="calendar" style={{ width: 64, height: 64 }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{e.program.name}</Text>
                      <Text variant="small" color={colors.muted}>
                        Week {e.currentWeek} · {e.completedWorkouts} workouts done
                      </Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={colors.muted} />
                  </Row>
                </Card>
              ))}
          </View>
        </>
      )}

      {/* Templates */}
      {!!templates.data?.data.length && (
        <>
          <SectionHeader title="Workout templates" />
          <FlatList
            horizontal
            data={templates.data.data}
            keyExtractor={(t) => String(t.id)}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => (
              <Card style={{ width: 220 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="small" color={colors.muted} style={{ marginBottom: 12 }}>
                  {[item.split, `${item.daysPerWeek}×/week`, difficultyLabel(item.difficulty)].filter(Boolean).join(' · ')}
                </Text>
                <Button title="Start day 1" size="sm" icon="play" onPress={() => startTemplate(item)} loading={starting === `t${item.id}`} />
              </Card>
            )}
          />
        </>
      )}

      {/* History */}
      <SectionHeader title="Recent workouts" action={recent.length ? 'History' : undefined} onAction={() => router.push('/history')} />
      {pending.map((p) => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <Row>
            <Icon name="cloud-upload-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{p.label}</Text>
              <Text variant="caption" color={colors.warning}>
                {p.lastError && p.attempts > 0 && !/offline/i.test(p.lastError) ? p.lastError : 'Pending sync'}
              </Text>
            </View>
          </Row>
        </Card>
      ))}
      {sessions.isLoading ? (
        <Skeleton height={70} />
      ) : recent.length ? (
        <View style={{ gap: 10 }}>
          {recent.map((s, i) => (
            <FadeIn key={s.id} delay={i * 40}>
              <SessionRow s={s} />
            </FadeIn>
          ))}
        </View>
      ) : (
        <EmptyState icon="time-outline" title="No workouts yet" message="Complete your first workout to see your progress." />
      )}
    </Screen>
  );
}
