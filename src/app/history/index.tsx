import { useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { useSessions } from '@/lib/queries';
import { SessionRow } from '@/components/session-row';
import { EmptyState, ErrorState, Header, Skeleton } from '@/components/ui';

export default function History() {
  const q = useSessions();
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Workout history" />
        <FlatList
          data={items}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 60 }}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          renderItem={({ item }) => <SessionRow s={item} />}
          ListEmptyComponent={
            q.isLoading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={72} />
                ))}
              </View>
            ) : q.error ? (
              <ErrorState onRetry={() => q.refetch()} />
            ) : (
              <EmptyState icon="time-outline" title="No workouts yet" message="Complete your first workout to see your progress." />
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
