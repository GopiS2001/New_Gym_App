import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { fmtMinutes } from '@/lib/workout';
import { useSessionDetail } from '@/lib/queries';
import { Cover } from '@/components/content';
import { Card, ErrorState, Header, Row, Skeleton, StatTile, Text } from '@/components/ui';

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: s, isLoading, error, refetch } = useSessionDetail(id);
  const sets = s?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0;
  const volume = Math.round(
    s?.exercises.reduce((v, e) => v + e.sets.reduce((a, x) => a + Number(x.weightValue ?? 0) * (x.weightUnit === 'LB' ? 0.4536 : 1) * (x.reps ?? 0), 0), 0) ?? 0
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title={s?.title ?? 'Workout'} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 60, gap: 14 }}>
          {error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !s ? (
            <>
              <Skeleton height={90} />
              <Skeleton height={140} />
            </>
          ) : (
            <>
              <Text variant="small" color={colors.muted}>
                {new Date(s.completedAt ?? s.startedAt).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                {s.program ? ` · ${s.program.name}` : ''}
              </Text>
              <Row gap={10}>
                <StatTile style={{ flex: 1 }} icon="time" value={fmtMinutes(s.durationSeconds)} label="DURATION" />
                <StatTile style={{ flex: 1 }} icon="layers" value={String(sets)} label="SETS" />
                <StatTile style={{ flex: 1 }} icon="barbell" value={volume ? `${volume}` : '—'} label="VOLUME KG" />
              </Row>
              {!!s.notes && (
                <Card>
                  <Text variant="small" color={colors.textSecondary}>
                    {s.notes}
                  </Text>
                </Card>
              )}
              {s.exercises.map((e) => (
                <Card key={e.id} onPress={() => router.push(`/exercise/${e.exercise.id}`)} accessibilityLabel={e.exercise.name}>
                  <Row style={{ marginBottom: 10 }}>
                    <Cover uri={e.exercise.imageUrl} style={{ width: 44, height: 44 }} />
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      {e.exercise.name}
                    </Text>
                  </Row>
                  {e.sets.map((x) => (
                    <Row key={x.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text variant="small" color={colors.muted}>
                        Set {x.setNumber}
                      </Text>
                      <Text variant="smallStrong">
                        {[x.reps != null && `${x.reps} reps`, x.weightValue != null && `${Number(x.weightValue)} ${x.weightUnit?.toLowerCase()}`, x.durationSeconds != null && `${x.durationSeconds}s`, x.distanceValue != null && `${Number(x.distanceValue)} km`, x.rpe != null && `RPE ${Number(x.rpe)}`]
                          .filter(Boolean)
                          .join(' · ') || 'Done'}
                      </Text>
                    </Row>
                  ))}
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
