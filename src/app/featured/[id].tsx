import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { colors } from '@/theme/tokens';
import type { MemberCollection } from '@/lib/types';
import { ExerciseListItem, ProgramCardView } from '@/components/content';
import { EmptyState, ErrorState, Header, Skeleton, Text } from '@/components/ui';

type Featured = MemberCollection & { description: string | null };

/** Admin-curated featured collection. */
export default function FeaturedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['featured', id], queryFn: () => api.get<Featured>(`/collections/${id}`), enabled: !!id });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title={data?.name ?? 'Collection'} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }}>
          {error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !data ? (
            <Skeleton height={120} />
          ) : (
            <>
              {!!data.description && (
                <Text variant="body" color={colors.textSecondary}>
                  {data.description}
                </Text>
              )}
              {data.programs.map((p) => (
                <ProgramCardView key={p.id} item={p} compact />
              ))}
              {data.exercises.map((e) => (
                <ExerciseListItem key={e.id} item={e as any} />
              ))}
              {!data.programs.length && !data.exercises.length && <EmptyState icon="star-outline" title="Nothing here yet" />}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
