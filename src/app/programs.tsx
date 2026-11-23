import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { ProgramCardView } from '@/components/content';
import { useMyPrograms, usePrograms, useReference } from '@/lib/queries';
import { Chip, EmptyState, ErrorState, Header, Skeleton, Text } from '@/components/ui';

export default function Programs() {
  const goals = useReference('goals');
  const [goal, setGoal] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = usePrograms({ goal, difficulty });
  const mine = useMyPrograms();
  const activeIds = new Set((mine.data ?? []).filter((e) => e.status === 'ACTIVE').map((e) => e.programId));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Programs" />
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 }}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Chip label="All goals" selected={!goal} onPress={() => setGoal(undefined)} />
                {goals.data?.map((g) => (
                  <Chip key={g.id} label={g.name} selected={goal === g.slug} onPress={() => setGoal(goal === g.slug ? undefined : g.slug)} />
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
                  <Chip key={d} small label={d[0] + d.slice(1).toLowerCase()} selected={difficulty === d} onPress={() => setDifficulty(difficulty === d ? undefined : d)} />
                ))}
              </ScrollView>
            </View>
          }
          renderItem={({ item }) => (
            <View>
              <ProgramCardView item={item} />
              {activeIds.has(item.id) && (
                <Text variant="caption" color={colors.accent} style={{ marginTop: 6, marginLeft: 4 }}>
                  ● You&apos;re following this program
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={{ gap: 16 }}>
                <Skeleton height={190} radius={24} />
                <Skeleton height={190} radius={24} />
              </View>
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : (
              <EmptyState icon="calendar-outline" title="No programs found" message={goal || difficulty ? 'Try another filter.' : 'New programs are coming soon.'} />
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
