import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { goBack } from '@/lib/nav';
import { api, errorMessage } from '@/lib/api';
import { colors, radius } from '@/theme/tokens';
import { ProgressRing } from '@/components/charts';
import { useProgram, useToggleSave } from '@/lib/queries';
import { confirm, programWorkoutToSession, useStartWorkout } from '@/lib/workout';
import { Cover, difficultyLabel, NumberedRow, SaveButton } from '@/components/content';
import { Button, Card, Chip, ErrorState, FadeIn, Icon, IconButton, Row, Skeleton, StatTile, Text } from '@/components/ui';

type Tab = 'overview' | 'schedule' | 'exercises';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: p, isLoading, error, refetch } = useProgram(id);
  const save = useToggleSave('programs');
  const startWorkout = useStartWorkout();
  const [tab, setTab] = useState<Tab>('overview');
  const [week, setWeek] = useState(0);
  const [busy, setBusy] = useState(false);

  const enrollment = p?.enrollment?.status === 'ACTIVE' ? p.enrollment : null;
  const allWorkouts = p?.weeks.flatMap((w) => w.workouts.map((wo) => ({ ...wo, weekNumber: w.weekNumber }))) ?? [];
  const nextWorkout = enrollment
    ? (allWorkouts.find((w) => w.weekNumber === enrollment.currentWeek && w.dayNumber >= enrollment.currentDay) ?? allWorkouts.find((w) => w.weekNumber > enrollment.currentWeek))
    : allWorkouts[0];

  const follow = async () => {
    if (!p) return;
    setBusy(true);
    try {
      await api.post(`/programs/${p.id}/enroll`);
      await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ['home'] }), qc.invalidateQueries({ queryKey: ['my-programs'] })]);
    } catch (e) {
      console.warn(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!p || !(await confirm('Stop following?', 'Your logged workouts stay in your history.', 'Stop following'))) return;
    await api.patch(`/programs/${p.id}/enrollment`, { status: 'ABANDONED' });
    await Promise.all([refetch(), qc.invalidateQueries({ queryKey: ['home'] })]);
  };

  if (error)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => goBack('/programs')} />
        <View style={{ marginTop: 40 }}>
          <ErrorState message={(error as any)?.status === 404 ? 'This program is no longer available.' : errorMessage(error)} onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Cover uri={p?.imageUrl} icon="calendar" style={{ height: 320 }} rounded={0}>
          <LinearGradient colors={['rgba(11,21,32,0.5)', 'transparent', colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 16, right: 16, top: 0 }}>
            <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
              <IconButton icon="chevron-back" label="Back" onPress={() => goBack('/programs')} />
              {p && <SaveButton saved={p.isSaved} onPress={() => save.mutate({ id: p.id, saved: p.isSaved })} />}
            </Row>
          </SafeAreaView>
        </Cover>

        <View style={{ paddingHorizontal: 20, marginTop: -50 }}>
          {isLoading || !p ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={30} width="70%" />
              <Skeleton height={90} />
            </View>
          ) : (
            <FadeIn>
              {p.goal && (
                <Text variant="caption" color={colors.accent}>
                  {p.goal.name.toUpperCase()}
                </Text>
              )}
              <Text variant="h1" style={{ marginTop: 4 }}>
                {p.name}
              </Text>
              {p.coach && (
                <Pressable onPress={() => router.push(`/coach/${p.coach!.id}`)} accessibilityRole="link">
                  <Text variant="small" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    by <Text variant="smallStrong">{p.coach.name}</Text>
                  </Text>
                </Pressable>
              )}

              <Row gap={10} style={{ marginTop: 18 }}>
                <StatTile style={{ flex: 1 }} icon="calendar" value={`${p.durationWeeks}`} label="WEEKS" />
                <StatTile style={{ flex: 1 }} icon="repeat" value={`${p.daysPerWeek}×`} label="PER WEEK" />
                <StatTile style={{ flex: 1 }} icon="speedometer" value={difficultyLabel(p.difficulty)} label="LEVEL" />
                <StatTile style={{ flex: 1 }} icon="barbell" value={String(p.totalWorkouts)} label="WORKOUTS" />
              </Row>

              {enrollment && (
                <Card highlight style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <ProgressRing value={enrollment.progressPercent ?? 0} size={70} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">You&apos;re following this program</Text>
                    <Text variant="small" color={colors.muted}>
                      Week {enrollment.currentWeek} · {enrollment.completedWorkouts} of {p.totalWorkouts} workouts done
                    </Text>
                  </View>
                </Card>
              )}

              <View style={styles.tabs} accessibilityRole="tablist">
                {(['overview', 'schedule', 'exercises'] as Tab[]).map((t) => (
                  <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[styles.tab, tab === t && { backgroundColor: colors.accent }]}>
                    <Text variant="smallStrong" color={tab === t ? colors.accentText : colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'overview' && (
                <View style={{ gap: 18 }}>
                  <Text variant="body" color={colors.textSecondary}>
                    {p.description || p.shortDescription}
                  </Text>
                  {p.targetAudience && (
                    <View>
                      <Text variant="h3" style={{ marginBottom: 6 }}>
                        Who it&apos;s for
                      </Text>
                      <Text variant="body" color={colors.textSecondary}>
                        {p.targetAudience}
                      </Text>
                    </View>
                  )}
                  {!!p.equipment.length && (
                    <View>
                      <Text variant="h3" style={{ marginBottom: 10 }}>
                        Equipment
                      </Text>
                      <Row gap={8} style={{ flexWrap: 'wrap' }}>
                        {p.equipment.map((e) => (
                          <Chip key={e.id} small label={e.name} />
                        ))}
                      </Row>
                    </View>
                  )}
                  {enrollment && (
                    <Button title="Stop following" variant="ghost" size="md" onPress={leave} />
                  )}
                </View>
              )}

              {(tab === 'schedule' || tab === 'exercises') && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
                    {p.weeks.map((w, i) => (
                      <Chip key={w.id} label={`Week ${w.weekNumber}`} selected={week === i} onPress={() => setWeek(i)} />
                    ))}
                  </ScrollView>
                  {tab === 'schedule' ? (
                    <View style={{ gap: 10 }}>
                      {p.weeks[week]?.workouts.map((wo) => {
                        const done =
                          !!enrollment &&
                          (p.weeks[week].weekNumber < enrollment.currentWeek || (p.weeks[week].weekNumber === enrollment.currentWeek && wo.dayNumber < enrollment.currentDay));
                        return (
                          <Card key={wo.id} onPress={() => router.push(`/program/${p.id}/workout/${wo.id}`)} accessibilityLabel={wo.title}>
                            <Row>
                              <View style={[styles.day, done && { backgroundColor: colors.accent }]}>
                                <Text variant="caption" color={done ? colors.accentText : colors.accent}>
                                  {DAYS[wo.dayNumber - 1]}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text variant="bodyStrong">{wo.title}</Text>
                                <Text variant="caption" color={colors.muted}>
                                  {wo.exercises.length} exercises{wo.estimatedMinutes ? ` · ~${wo.estimatedMinutes} min` : ''}
                                </Text>
                              </View>
                              <Icon name={done ? 'checkmark-circle' : 'chevron-forward'} size={20} color={done ? colors.accent : colors.muted} />
                            </Row>
                          </Card>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={{ gap: 18 }}>
                      {p.weeks[week]?.workouts.map((wo) => (
                        <View key={wo.id} style={{ gap: 8 }}>
                          <Text variant="h3">{wo.title}</Text>
                          {wo.exercises.map((e, i) => (
                            <NumberedRow
                              key={e.id}
                              index={i + 1}
                              title={e.exercise.name}
                              meta={[e.sets, e.reps].filter(Boolean).join('/') || (e.durationSeconds ? `${e.durationSeconds}s` : undefined)}
                              onPress={() => router.push(`/exercise/${e.exercise.id}`)}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </FadeIn>
          )}
        </View>
      </ScrollView>

      {p && p.isAvailable && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            {enrollment && nextWorkout ? (
              <Button title={`Continue · ${nextWorkout.title}`} icon="play" onPress={() => startWorkout(programWorkoutToSession(nextWorkout))} />
            ) : (
              <Button title="Start Program" icon="flash" loading={busy} onPress={follow} />
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: 22, marginBottom: 18, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  day: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,21,32,0.96)', borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 12 },
});
