import { useMemo, useState } from 'react';
import { useDebouncedValue } from '@/lib/hooks';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme/tokens';
import { ExerciseTile } from '@/components/content';
import { ExerciseFilters, useCategories, useExercises, useReference } from '@/lib/queries';
import { Button, Chip, EmptyState, ErrorState, Header, Icon, IconButton, Row, Skeleton, Text } from '@/components/ui';

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'az', label: 'A–Z' },
  { value: 'recent', label: 'Recently added' },
  { value: 'popular', label: 'Most saved' },
] as const;

const DIFFS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

/** Exercise listing for a category (or "all"), with search, filters and sort. */
export default function ExerciseList() {
  const { category, q } = useLocalSearchParams<{ category: string; q?: string }>();
  const categories = useCategories();
  const current = categories.data?.find((c) => c.slug === category);
  const [search, setSearch] = useState(q ?? '');
  const debounced = useDebouncedValue(search, 350);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<Pick<ExerciseFilters, 'equipment' | 'difficulty' | 'type' | 'muscle'>>({});
  const [sort, setSort] = useState<ExerciseFilters['sort']>('recommended');

  const query = useExercises({
    search: debounced || undefined,
    category: category && category !== 'all' ? category : undefined,
    sort,
    ...filters,
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);
  const total = query.data?.pages[0]?.meta.total ?? 0;
  const activeFilters = Object.values(filters).reduce((n, v) => n + (v?.length ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title={current?.name ?? 'All exercises'} />
        <FlatList
          data={items}
          keyExtractor={(e) => String(e.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 14 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, gap: 18 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListHeaderComponent={
            <View style={{ gap: 14, marginBottom: 4 }}>
              {current?.description && (
                <Text variant="body" color={colors.textSecondary}>
                  {current.description}
                </Text>
              )}
              <Row gap={10}>
                <View style={styles.search}>
                  <Icon name="search" size={18} color={colors.muted} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search"
                    placeholderTextColor={colors.muted}
                    style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
                    accessibilityLabel="Search exercises"
                    returnKeyType="search"
                  />
                  {!!search && (
                    <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                      <Icon name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  )}
                </View>
                <View>
                  <IconButton icon="options" label="Filters" active={activeFilters > 0} onPress={() => setSheet(true)} size={48} />
                  {activeFilters > 0 && (
                    <View style={styles.badge}>
                      <Text variant="caption" color={colors.accentText}>
                        {activeFilters}
                      </Text>
                    </View>
                  )}
                </View>
              </Row>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {SORTS.map((s) => (
                  <Chip key={s.value} label={s.label} selected={sort === s.value} onPress={() => setSort(s.value)} />
                ))}
              </ScrollView>
              {!query.isLoading && (
                <Text variant="small" color={colors.muted}>
                  {total} exercise{total === 1 ? '' : 's'}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1, maxWidth: '48%' }}>
              <ExerciseTile item={item} />
            </View>
          )}
          ListEmptyComponent={
            query.isLoading ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ width: '47%', gap: 8 }}>
                    <Skeleton height={150} />
                    <Skeleton height={14} width="70%" />
                  </View>
                ))}
              </View>
            ) : query.error ? (
              <ErrorState onRetry={() => query.refetch()} />
            ) : (
              <EmptyState
                icon="search"
                title="No exercises found"
                message={activeFilters || search ? 'Try clearing your filters or search.' : 'Exercises for this category are coming soon.'}
                action={activeFilters || search ? 'Clear filters' : undefined}
                onAction={() => {
                  setFilters({});
                  setSearch('');
                }}
              />
            )
          }
          ListFooterComponent={query.isFetchingNextPage ? <Skeleton height={40} style={{ marginTop: 10 }} /> : null}
        />
      </SafeAreaView>
      <FilterSheet visible={sheet} value={filters} onClose={() => setSheet(false)} onApply={(f) => setFilters(f)} />
    </View>
  );
}

function FilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: Pick<ExerciseFilters, 'equipment' | 'difficulty' | 'type' | 'muscle'>;
  onClose: () => void;
  onApply: (f: Pick<ExerciseFilters, 'equipment' | 'difficulty' | 'type' | 'muscle'>) => void;
}) {
  const equipment = useReference('equipment');
  const types = useReference('exercise-types');
  const muscles = useReference('muscles');
  const [draft, setDraft] = useState(value);

  const toggle = (key: keyof typeof draft, v: string) => {
    const list = draft[key] ?? [];
    setDraft({ ...draft, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };

  const group = (title: string, key: keyof typeof draft, options: { value: string; label: string }[]) => (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <Text variant="h3">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={!!draft[key]?.includes(o.value)} onPress={() => toggle(key, o.value)} />
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setDraft(value)}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <Text variant="h2">Filters</Text>
          <Pressable onPress={() => setDraft({})} hitSlop={8} accessibilityRole="button">
            <Text variant="smallStrong" color={colors.accent}>
              Reset
            </Text>
          </Pressable>
        </Row>
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {group('Difficulty', 'difficulty', DIFFS)}
          {group('Equipment', 'equipment', (equipment.data ?? []).map((e) => ({ value: e.slug, label: e.name })))}
          {group('Exercise type', 'type', (types.data ?? []).map((e) => ({ value: e.slug, label: e.name })))}
          {group('Muscle', 'muscle', (muscles.data ?? []).map((e) => ({ value: e.slug, label: e.name })))}
        </ScrollView>
        <Button
          title="Show results"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          style={{ marginTop: 8 }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.surface3, marginBottom: 14 },
});
