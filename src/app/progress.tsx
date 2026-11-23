import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { fmtMinutes } from '@/lib/workout';
import { AreaChart, BarStrip } from '@/components/charts';
import { useMeasurements, useProfile, useProgress, useSessions } from '@/lib/queries';
import { Button, Card, EmptyState, Header, Row, Skeleton, Text } from '@/components/ui';

type Tab = 'overview' | 'weight' | 'volume' | 'frequency';

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Progress (design screen 6). */
export default function Progress() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const month = useProgress('month');
  const week = useProgress('week');
  const measurements = useMeasurements();
  const sessions = useSessions();
  const { data: profile } = useProfile();

  const weights = useMemo(() => [...(measurements.data ?? [])].reverse(), [measurements.data]);
  const latest = weights[weights.length - 1];
  const prev = weights[weights.length - 2];
  const delta = latest && prev ? Math.round((Number(latest.value) - Number(prev.value)) * 10) / 10 : null;

  const sessionList = useMemo(() => (sessions.data?.pages.flatMap((p) => p.data) ?? []).slice().reverse(), [sessions.data]);
  const volumes = sessionList.map((s) => ({
    label: dayLabel(s.completedAt ?? s.startedAt),
    value: Math.round(
      s.exercises.reduce((v, e) => v + e.sets.reduce((a, x) => a + Number(x.weightValue ?? 0) * (x.weightUnit === 'LB' ? 0.4536 : 1) * (x.reps ?? 0), 0), 0)
    ),
  }));

  // Workouts per week for the last 8 weeks.
  const weekly = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    const now = new Date();
    for (let w = 7; w >= 0; w--) {
      const end = new Date(now.getTime() - w * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const count = sessionList.filter((s) => {
        const d = new Date(s.completedAt ?? s.startedAt);
        return d > start && d <= end;
      }).length;
      out.push({ label: w === 0 ? 'Now' : `-${w}w`, value: count });
    }
    return out;
  }, [sessionList]);

  const loading = month.isLoading || sessions.isLoading;
  const avgPerWeek = weekly.length ? (weekly.reduce((a, b) => a + b.value, 0) / weekly.length).toFixed(1) : '0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Progress" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {(['overview', 'weight', 'volume', 'frequency'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[styles.tab, tab === t && { backgroundColor: colors.accent }]}>
                <Text variant="caption" color={tab === t ? colors.accentText : colors.textSecondary} style={{ textTransform: 'capitalize', fontSize: 12 }}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          <Card style={{ minHeight: 240 }}>
            {loading ? (
              <Skeleton height={200} />
            ) : tab === 'overview' ? (
              month.data?.workouts ? (
                <>
                  <Text variant="h3" style={{ marginBottom: 4 }}>
                    Workouts this month
                  </Text>
                  <AreaChart data={(month.data?.days ?? []).map((d) => ({ label: dayLabel(d.date), value: d.workouts }))} unit="workouts" />
                </>
              ) : (
                <EmptyState icon="stats-chart" title="No workouts this month" message="Complete a workout to start your chart." />
              )
            ) : tab === 'weight' ? (
              weights.length >= 2 ? (
                <>
                  <Text variant="h3" style={{ marginBottom: 4 }}>
                    Body weight
                  </Text>
                  <AreaChart data={weights.map((m) => ({ label: dayLabel(m.measuredAt), value: Number(m.value) }))} unit={latest?.unit} formatValue={(v) => v.toFixed(1)} />
                </>
              ) : (
                <EmptyState icon="scale-outline" title="Log your weight" message="Add at least two weigh-ins to see a trend." action="Log weight" onAction={() => router.push('/settings/measurements')} />
              )
            ) : tab === 'volume' ? (
              volumes.some((v) => v.value > 0) ? (
                <>
                  <Text variant="h3" style={{ marginBottom: 4 }}>
                    Volume per workout
                  </Text>
                  <AreaChart data={volumes} unit="kg" formatValue={(v) => v.toLocaleString()} />
                </>
              ) : (
                <EmptyState icon="barbell-outline" title="No weighted sets yet" message="Volume = weight × reps across your sets." />
              )
            ) : (
              <>
                <Text variant="h3" style={{ marginBottom: 14 }}>
                  Workouts per week
                </Text>
                <BarStrip data={weekly} height={180} />
              </>
            )}
          </Card>

          <Row gap={12} style={{ marginTop: 14 }}>
            <Metric
              label="Weight"
              value={latest ? `${Number(latest.value)}${latest.unit}` : '—'}
              sub={delta != null ? `${delta > 0 ? '+' : ''}${delta}${latest?.unit}` : 'No trend yet'}
              subColor={delta != null ? (delta <= 0 ? colors.accent : colors.warning) : colors.muted}
              onPress={() => router.push('/settings/measurements')}
            />
            <Metric label="Active time" value={fmtMinutes(week.data?.totalDurationSeconds)} sub="this week" />
          </Row>
          <Row gap={12} style={{ marginTop: 12 }}>
            <Metric label="Work frequency" value={`${avgPerWeek} days`} sub="per week (8 wk avg)" subColor={colors.accent} />
            <Metric label="Volume" value={`${(month.data?.totalVolumeKg ?? 0).toLocaleString()}kg`} sub="this month" />
          </Row>
          <Row gap={12} style={{ marginTop: 12 }}>
            <Metric label="Workouts" value={String(month.data?.workouts ?? 0)} sub="this month" />
            <Metric label="All time" value={String(month.data?.allTimeWorkouts ?? 0)} sub={profile?.weeklyWorkoutDays ? `target ${profile.weeklyWorkoutDays}/week` : 'workouts'} />
          </Row>

          <Button title="Workout history" variant="secondary" icon="time-outline" size="md" onPress={() => router.push('/history')} style={{ marginTop: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value, sub, subColor = colors.muted, onPress }: { label: string; value: string; sub: string; subColor?: string; onPress?: () => void }) {
  return (
    <Card style={{ flex: 1, gap: 4 }} onPress={onPress} accessibilityLabel={`${label}: ${value}, ${sub}`}>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
      <Text variant="number">{value}</Text>
      <Text variant="smallStrong" color={subColor}>
        {sub}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginBottom: 16, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
