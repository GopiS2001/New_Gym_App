import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, TextInput, View } from 'react-native';

import { goBack } from '@/lib/nav';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import { useExercises } from '@/lib/queries';
import { useSession } from '@/stores/session';
import { toSessionExercise } from '@/lib/workout';
import { colors, fonts, radius } from '@/theme/tokens';
import { ExerciseListItem } from '@/components/content';
import type { ExerciseDetail } from '@/lib/types';
import { EmptyState, Header, Icon, IconButton, Skeleton } from '@/components/ui';

/** Modal: add an exercise to the active workout. */
export default function PickExercise() {
  const addExercise = useSession((s) => s.addExercise);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [adding, setAdding] = useState<number | null>(null);
  const query = useExercises({ search: debounced || undefined, sort: 'az' });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  const pick = async (id: number) => {
    setAdding(id);
    try {
      const ex = await api.get<ExerciseDetail>(`/exercises/${id}`);
      addExercise(toSessionExercise(ex));
      goBack('/workout');
    } finally {
      setAdding(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Add exercise" />
        <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Icon name="search" size={18} color={colors.muted} />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises"
              placeholderTextColor={colors.muted}
              style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
              accessibilityLabel="Search exercises"
            />
          </View>
        </View>
        <FlatList
          data={items}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => query.hasNextPage && query.fetchNextPage()}
          renderItem={({ item }) => (
            <ExerciseListItem
              item={item}
              onPress={() => pick(item.id)}
              right={<IconButton icon={adding === item.id ? 'hourglass' : 'add'} label={`Add ${item.name}`} active onPress={() => pick(item.id)} size={38} />}
            />
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={92} />
                ))}
              </View>
            ) : (
              <EmptyState icon="search" title="No exercises found" message="Try a different search." />
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
