import type { IconName } from '@/components/ui';

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';
import { Cover, ProgramCardView } from '@/components/content';
import { useCategories, useCoaches, useFeatured, usePrograms } from '@/lib/queries';
import { ErrorState, FadeIn, Icon, Screen, SectionHeader, Skeleton, Text } from '@/components/ui';

const CATEGORY_ICONS: Record<string, IconName> = {
  chest: 'shield',
  back: 'git-merge',
  biceps: 'hand-left',
  triceps: 'hand-right',
  shoulders: 'triangle',
  abs: 'grid',
  legs: 'walk',
  glutes: 'ellipse',
  'full-body': 'body',
  cardio: 'heart',
};

export default function Explore() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const categories = useCategories();
  const programs = usePrograms();
  const coaches = useCoaches();
  const featured = useFeatured();

  return (
    <Screen>
      <Text variant="h1" style={{ marginTop: 12 }} accessibilityRole="header">
        Explore
      </Text>
      <Text variant="body" color={colors.textSecondary}>
        Programs, exercises and coaches
      </Text>

      <View style={styles.search}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={() => router.push({ pathname: '/exercises/[category]', params: { category: 'all', q: search } })}
          style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
          accessibilityLabel="Search exercises"
        />
      </View>

      {/* Discovery areas */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <AreaCard icon="calendar" title="Programs" caption={`${programs.data?.meta.total ?? '–'} plans`} onPress={() => router.push('/programs')} />
        <AreaCard icon="barbell" title="Exercises" caption="Library" onPress={() => router.push('/exercises/all')} accent />
        <AreaCard icon="people" title="Coaches" caption={`${coaches.data?.length ?? '–'} experts`} onPress={() => router.push('/coaches')} />
      </View>

      {/* Categories */}
      <SectionHeader title="Exercise categories" action="All exercises" onAction={() => router.push('/exercises/all')} />
      {categories.error ? (
        <ErrorState onRetry={() => categories.refetch()} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {categories.isLoading
            ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={92} width="31%" />)
            : categories.data?.map((c, i) => (
                <FadeIn key={c.id} delay={i * 30} style={{ width: '31%', flexGrow: 1 }}>
                  <Pressable
                    onPress={() => router.push(`/exercises/${c.slug}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name} exercises`}
                    style={({ pressed }) => [styles.category, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    {c.imageUrl ? (
                      <Cover uri={c.imageUrl} style={StyleSheet.absoluteFill} rounded={0} />
                    ) : (
                      <Icon name={CATEGORY_ICONS[c.slug] ?? 'fitness'} size={26} color={colors.accent} />
                    )}
                    {c.imageUrl && <LinearGradient colors={['transparent', 'rgba(7,14,22,0.85)']} style={StyleSheet.absoluteFill} />}
                    <Text variant="smallStrong" style={c.imageUrl ? { position: 'absolute', bottom: 8, left: 10 } : { marginTop: 6 }}>
                      {c.name}
                    </Text>
                  </Pressable>
                </FadeIn>
              ))}
        </View>
      )}

      {/* Featured collections */}
      {!!featured.data?.length && (
        <>
          <SectionHeader title="Featured" />
          <FlatList
            horizontal
            data={featured.data}
            keyExtractor={(c) => String(c.id)}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/featured/${item.id}`)} accessibilityRole="button" accessibilityLabel={item.name} style={{ width: 240 }}>
                <Cover uri={item.imageUrl} icon="star" style={{ height: 130 }} rounded={radius.lg}>
                  <LinearGradient colors={['transparent', 'rgba(7,14,22,0.9)']} style={StyleSheet.absoluteFill} />
                  <View style={{ position: 'absolute', left: 12, bottom: 10, right: 12 }}>
                    <Text variant="bodyStrong">{item.name}</Text>
                    <Text variant="caption" color={colors.muted}>
                      {item.exercises.length} exercises · {item.programs.length} programs
                    </Text>
                  </View>
                </Cover>
              </Pressable>
            )}
          />
        </>
      )}

      {/* Programs */}
      <SectionHeader title="Popular programs" action="See all" onAction={() => router.push('/programs')} />
      {programs.isLoading ? (
        <Skeleton height={190} radius={radius.xl} />
      ) : programs.data?.data.length ? (
        <FlatList
          horizontal
          data={programs.data.data.slice(0, 6)}
          keyExtractor={(p) => String(p.id)}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          renderItem={({ item }) => <ProgramCardView item={item} width={290} compact />}
        />
      ) : (
        <Text variant="small" color={colors.muted}>
          New programs are coming soon.
        </Text>
      )}
    </Screen>
  );
}

function AreaCard({ icon, title, caption, onPress, accent }: { icon: IconName; title: string; caption: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient
        colors={accent ? [colors.accent, '#9BC21C'] : [colors.surface3, colors.surface]}
        style={[styles.area, accent && { borderColor: colors.accent }]}
      >
        <Icon name={icon} size={24} color={accent ? colors.accentText : colors.accent} />
        <Text variant="bodyStrong" color={accent ? colors.accentText : colors.text} style={{ marginTop: 18 }}>
          {title}
        </Text>
        <Text variant="caption" color={accent ? 'rgba(11,21,32,0.7)' : colors.muted}>
          {caption}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  area: { borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border, minHeight: 120 },
  category: {
    height: 92,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
