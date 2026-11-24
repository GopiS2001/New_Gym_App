import type { IconName } from '@/components/ui';

import { useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { useUnreadCount } from '@/lib/social';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useOutbox } from '@/stores/outbox';
import { useSession } from '@/stores/session';
import { colors, radius } from '@/theme/tokens';
import { formatTime12 } from '@/lib/reminders';
import { mediaUrl } from '@/lib/media';
import { ProgressRing } from '@/components/charts';
import { Cover, difficultyLabel, ExerciseTile, ProgramCardView } from '@/components/content';
import { useHome, useProfile, useProgress, useInvalidate } from '@/lib/queries';
import { fmtMinutes, greeting, programWorkoutToSession, useStartWorkout } from '@/lib/workout';
import type { ProgramDetail } from '@/lib/types';
import { Button, Card, ErrorState, FadeIn, Icon, IconButton, Row, Screen, SectionHeader, Skeleton, StatTile, Text } from '@/components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch, isRefetching } = useHome();
  const { data: week } = useProgress('week');
  const { data: profile } = useProfile();
  const active = useSession((s) => s.active);
  const pending = useOutbox((s) => s.items.length);
  const invalidate = useInvalidate();
  const startWorkout = useStartWorkout();
  const [starting, setStarting] = useState(false);

  const firstName = data?.greeting.name ?? user?.name?.split(' ')[0] ?? '';
  const w = data?.weeklyProgress;
  const program = data?.currentProgram;
  const today = data?.todaysWorkout;

  const startToday = async () => {
    if (!program || !today) return;
    setStarting(true);
    try {
      const detail = await api.get<ProgramDetail>(`/programs/${program.programId}`);
      const wk = detail.weeks.flatMap((x) => x.workouts).find((x) => x.id === today.id);
      if (wk) await startWorkout(programWorkoutToSession(wk));
    } finally {
      setStarting(false);
    }
  };

  const tasks: { icon: IconName; title: string; sub: string; right?: string; done?: boolean; onPress?: () => void }[] = [];
  if (today) tasks.push({ icon: 'barbell', title: today.title, sub: `${today.exercises.length} exercises`, right: profile?.reminders.time ? formatTime12(profile.reminders.time) : undefined, onPress: () => router.push(`/program/${program?.programId}/workout/${today.id}`) });
  if (w) {
    const left = Math.max(0, w.target - w.completed);
    tasks.push({ icon: 'flag', title: left ? `${left} more workout${left > 1 ? 's' : ''} this week` : 'Weekly goal reached', sub: `${w.completed} of ${w.target} done`, done: !left, onPress: () => router.push('/progress') });
  }
  tasks.push({
    icon: 'scale',
    title: 'Log body weight',
    sub: profile?.latestWeight ? `Last: ${profile.latestWeight.value} ${profile.latestWeight.unit}` : 'Track your progress',
    onPress: () => router.push('/settings/measurements'),
  });

  return (
    <Screen
      refreshControl={
        <RefreshControl
          tintColor={colors.accent}
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
            invalidate('progress', 'profile');
          }}
        />
      }
    >
      {/* Header */}
      <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <Row gap={10}>
          <Pressable onPress={() => router.push('/(tabs)/profile')} accessibilityLabel="Your profile" style={styles.avatar}>
            {data?.greeting.avatarUrl ? (
              <Image source={{ uri: mediaUrl(data.greeting.avatarUrl) ?? undefined }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text variant="bodyStrong" color={colors.accentText}>
                {firstName[0]?.toUpperCase() ?? '•'}
              </Text>
            )}
          </Pressable>
          <View>
            <Text variant="caption" color={colors.muted}>
              {greeting()}
            </Text>
            <Text variant="h3">{firstName || 'Athlete'}</Text>
          </View>
        </Row>
        <Row gap={8}>
          <IconButton icon="search" label="Search exercises" onPress={() => router.push('/exercises/all')} />
          <BellButton onPress={() => router.push('/notifications')} />
        </Row>
      </Row>

      {pending > 0 && (
        <Card style={{ marginTop: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="cloud-upload-outline" size={20} color={colors.warning} />
          <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
            {pending} workout{pending > 1 ? 's' : ''} waiting to sync — we&apos;ll upload when you&apos;re online.
          </Text>
        </Card>
      )}

      {active && (
        <FadeIn>
          <Card highlight onPress={() => router.push('/session')} style={{ marginTop: 16 }} accessibilityLabel="Continue workout">
            <Row>
              <View style={styles.pulseDot} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.accent}>
                  WORKOUT IN PROGRESS
                </Text>
                <Text variant="bodyStrong">{active.title}</Text>
              </View>
              <Text variant="smallStrong" color={colors.accent}>
                Continue
              </Text>
              <Icon name="chevron-forward" size={18} color={colors.accent} />
            </Row>
          </Card>
        </FadeIn>
      )}

      {/* Today's progress */}
      <SectionHeader title="Today's progress" />
      {isLoading ? (
        <Row gap={10}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={96} style={{ flex: 1 }} />
          ))}
        </Row>
      ) : (
        <FadeIn>
          <Row gap={10}>
            <StatTile style={{ flex: 1 }} icon="flame" tint={colors.danger} value={String(w?.weekStreak ?? 0)} label="STREAK" />
            <StatTile style={{ flex: 1 }} icon="layers" tint={colors.info} value={String(week?.totalSets ?? 0)} label="SETS" />
            <StatTile style={{ flex: 1 }} icon="time" tint={colors.accent} value={fmtMinutes(week?.totalDurationSeconds).replace(' min', 'm')} label="ACTIVE" />
            <StatTile style={{ flex: 1 }} icon="barbell" tint={colors.warning} value={`${w?.completed ?? 0}/${w?.target ?? 0}`} label="WORKOUTS" />
          </Row>
        </FadeIn>
      )}

      {error && (
        <View style={{ marginTop: 16 }}>
          <ErrorState message="We couldn't refresh your dashboard." onRetry={() => refetch()} />
        </View>
      )}

      {/* Today's workout */}
      {isLoading ? (
        <Skeleton height={170} style={{ marginTop: 20 }} radius={radius.xl} />
      ) : program && today ? (
        <FadeIn delay={80}>
          <Card style={styles.todayCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Today&apos;s Workout
              </Text>
              <Text variant="h2" numberOfLines={2}>
                {today.title}
              </Text>
              <Text variant="small" color={colors.muted}>
                {[today.estimatedMinutes && `${today.estimatedMinutes} min`, program.program.name].filter(Boolean).join(' • ')}
              </Text>
              <Button title="Start Workout" size="sm" full={false} onPress={startToday} loading={starting} style={{ marginTop: 12, alignSelf: 'flex-start' }} />
            </View>
            <ProgressRing value={program.progressPercent ?? 0} sublabel="Completed" size={92} />
          </Card>
        </FadeIn>
      ) : data?.recommendedProgram ? (
        <FadeIn delay={80}>
          <SectionHeader title="Recommended for you" action="All programs" onAction={() => router.push('/programs')} />
          <ProgramCardView item={data.recommendedProgram} />
        </FadeIn>
      ) : (
        <Card style={{ marginTop: 20 }}>
          <Text variant="h3">Start your first workout</Text>
          <Text variant="small" color={colors.muted} style={{ marginTop: 4, marginBottom: 14 }}>
            Build a quick session from any exercises and log your sets.
          </Text>
          <Button title="Start empty workout" size="md" onPress={() => startWorkout({ title: 'Quick workout', exercises: [] })} />
        </Card>
      )}

      {/* Quick actions */}
      <SectionHeader title="Quick actions" />
      <Row gap={10} style={{ justifyContent: 'space-between' }}>
        <QuickAction icon="play" label="Start Workout" onPress={() => (active ? router.push('/session') : startWorkout({ title: 'Quick workout', exercises: [] }))} />
        <QuickAction icon="compass" label="Explore" onPress={() => router.push('/(tabs)/explore')} />
        <QuickAction icon="time" label="History" onPress={() => router.push('/history')} />
        <QuickAction icon="stats-chart" label="Progress" onPress={() => router.push('/progress')} />
      </Row>

      {/* My tasks */}
      <SectionHeader title="My Task" />
      <View style={{ gap: 10 }}>
        {tasks.map((t) => (
          <Card key={t.title} onPress={t.onPress} style={{ paddingVertical: 12 }} accessibilityLabel={t.title}>
            <Row>
              <View style={[styles.taskDot, t.done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                {t.done && <Icon name="checkmark" size={12} color={colors.accentText} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {t.title}
                </Text>
                <Text variant="caption" color={colors.muted}>
                  {t.sub}
                </Text>
              </View>
              {t.right && (
                <Text variant="smallStrong" color={colors.textSecondary}>
                  {t.right}
                </Text>
              )}
            </Row>
          </Card>
        ))}
      </View>

      {/* Recommendations */}
      {!!data?.recommendedExercises.length && (
        <>
          <SectionHeader title="Exercises for you" action="See all" onAction={() => router.push('/exercises/all')} />
          <FlatList
            horizontal
            data={data.recommendedExercises}
            keyExtractor={(e) => String(e.id)}
            renderItem={({ item }) => <ExerciseTile item={item} width={160} />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        </>
      )}

      {!!data?.recentlyViewed.length && (
        <>
          <SectionHeader title="Recently viewed" />
          <View style={{ gap: 10 }}>
            {data.recentlyViewed.slice(0, 4).map((e) => (
              <Card key={e.id} onPress={() => router.push(`/exercise/${e.id}`)} style={{ padding: 10 }} accessibilityLabel={e.name}>
                <Row>
                  <Cover uri={e.imageUrl} style={{ width: 52, height: 52 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{e.name}</Text>
                    <Text variant="caption" color={colors.muted}>
                      {difficultyLabel(e.difficulty)}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.muted} />
                </Row>
              </Card>
            ))}
          </View>
        </>
      )}

      {data && (
        <Card highlight style={{ marginTop: 26, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Icon name="sparkles" size={26} color={colors.accent} />
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {data.motivation}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', gap: 8, flex: 1 }}>
      <View style={styles.quick}>
        <Icon name={icon} size={22} color={colors.accent} />
      </View>
      <Text variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface3,
  },
  todayCard: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: radius.xl },
  quick: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});

/** Bell with the unread-notification count. */
function BellButton({ onPress }: { onPress: () => void }) {
  const { data } = useUnreadCount();
  const n = data?.unread ?? 0;
  return (
    <View>
      <IconButton icon={n ? 'notifications' : 'notifications-outline'} label={n ? `Notifications, ${n} unread` : 'Notifications'} onPress={onPress} />
      {n > 0 && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="caption" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 12 }}>
            {n > 9 ? '9+' : n}
          </Text>
        </View>
      )}
    </View>
  );
}
