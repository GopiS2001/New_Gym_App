import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { useCoaches } from '@/lib/queries';
import { Cover } from '@/components/content';
import { Card, Chip, EmptyState, ErrorState, Header, Row, Skeleton, Text } from '@/components/ui';

export default function Coaches() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useCoaches();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Coaches" />
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 60 }}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/coach/${item.id}`)} accessibilityLabel={item.name}>
              <Row gap={14}>
                <Cover uri={item.imageUrl} icon="person" style={{ width: 72, height: 72 }} rounded={36} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3">{item.name}</Text>
                  {item.headline && (
                    <Text variant="small" color={colors.muted} numberOfLines={2}>
                      {item.headline}
                    </Text>
                  )}
                  <Row gap={6} style={{ flexWrap: 'wrap' }}>
                    {(item.specialities ?? []).slice(0, 2).map((s) => (
                      <Chip key={s} small label={s} />
                    ))}
                    {!!item.programCount && <Chip small label={`${item.programCount} programs`} selected />}
                  </Row>
                </View>
              </Row>
            </Card>
          )}
          ListEmptyComponent={
            isLoading ? (
              <Skeleton height={100} />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : (
              <EmptyState icon="people-outline" title="Coaches are coming soon" message="Meet the experts behind our programs here." />
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
