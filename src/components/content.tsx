import type { StyleProp, ViewStyle } from 'react-native';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToggleSave } from '@/lib/queries';
import { colors, radius } from '@/theme/tokens';
import type { Difficulty, ExerciseCard, ProgramCard } from '@/lib/types';

import { Card, Chip, haptic, Icon, IconName, Text } from './ui';

// ----------------------------------------------------------------------

export const difficultyLabel = (d?: Difficulty | string | null) => (d ? d[0] + d.slice(1).toLowerCase() : '');

/** Image with a branded fallback when content has no photo yet. */
export function Cover({
  uri,
  style,
  icon = 'barbell',
  rounded = radius.md,
  children,
}: {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  rounded?: number;
  children?: React.ReactNode;
}) {
  return (
    <View style={[{ borderRadius: rounded, overflow: 'hidden', backgroundColor: colors.surface2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
      ) : (
        <LinearGradient colors={[colors.surface3, colors.bgDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.center]}>
          <Icon name={icon} size={34} color="rgba(200,241,53,0.35)" />
        </LinearGradient>
      )}
      {children}
    </View>
  );
}

export function SaveButton({ saved, onPress, small }: { saved?: boolean; onPress: () => void; small?: boolean }) {
  const size = small ? 34 : 40;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from library' : 'Save to library'}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => {
        haptic.medium();
        onPress();
      }}
      style={[styles.save, { width: size, height: size, borderRadius: size / 2 }, saved && { backgroundColor: colors.accent }]}
    >
      <Icon name={saved ? 'bookmark' : 'bookmark-outline'} size={small ? 16 : 18} color={saved ? colors.accentText : colors.text} />
    </Pressable>
  );
}

// ----------------------------------------------------------------------

export function ExerciseTile({ item, width }: { item: ExerciseCard; width?: number }) {
  const router = useRouter();
  const save = useToggleSave('exercises');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${difficultyLabel(item.difficulty)}`}
      onPress={() => router.push(`/exercise/${item.id}`)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
    >
      <Cover uri={item.imageUrl} style={{ height: 150 }} rounded={radius.lg}>
        <LinearGradient colors={['transparent', 'rgba(7,14,22,0.85)']} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <SaveButton small saved={item.isSaved} onPress={() => save.mutate({ id: item.id, saved: !!item.isSaved })} />
        </View>
        <View style={{ position: 'absolute', left: 10, bottom: 10, right: 10 }}>
          <Text variant="caption" color={colors.accent} numberOfLines={1}>
            {item.categories.map((c) => c.name).join(' · ') || item.exerciseType.name}
          </Text>
        </View>
      </Cover>
      <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 8 }}>
        {item.name}
      </Text>
      <Text variant="small" color={colors.muted} numberOfLines={1}>
        {[item.equipment[0]?.name, difficultyLabel(item.difficulty)].filter(Boolean).join(' • ')}
      </Text>
    </Pressable>
  );
}

export function ExerciseListItem({ item, right, onPress }: { item: ExerciseCard; right?: React.ReactNode; onPress?: () => void }) {
  const router = useRouter();
  const save = useToggleSave('exercises');
  return (
    <Card onPress={onPress ?? (() => router.push(`/exercise/${item.id}`))} accessibilityLabel={item.name} style={{ padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Cover uri={item.imageUrl} style={{ width: 72, height: 72 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="small" color={colors.muted} numberOfLines={1}>
            {[item.categories[0]?.name, item.equipment.map((e) => e.name).join(', ')].filter(Boolean).join(' • ')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip small label={difficultyLabel(item.difficulty)} />
            {item.shortDescription ? null : <Chip small label={item.exerciseType.name} />}
          </View>
        </View>
        {right ?? <SaveButton small saved={item.isSaved} onPress={() => save.mutate({ id: item.id, saved: !!item.isSaved })} />}
      </View>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function ProgramCardView({
  item,
  width,
  compact,
}: {
  item: Pick<ProgramCard, 'id' | 'name' | 'imageUrl' | 'difficulty' | 'durationWeeks' | 'daysPerWeek'> & { goal?: { name: string } | null; coach?: { name: string } | null };
  width?: number;
  compact?: boolean;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} program, ${item.durationWeeks} weeks`}
      onPress={() => router.push(`/program/${item.id}`)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.88 : 1 }]}
    >
      <Cover uri={item.imageUrl} icon="calendar" style={{ height: compact ? 150 : 190 }} rounded={radius.xl}>
        <LinearGradient colors={['rgba(7,14,22,0.05)', 'rgba(7,14,22,0.92)']} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14, gap: 6 }}>
          {item.goal && (
            <Text variant="caption" color={colors.accent}>
              {item.goal.name.toUpperCase()}
            </Text>
          )}
          <Text variant="h3" numberOfLines={2}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Chip small label={`${item.durationWeeks} weeks`} />
            <Chip small label={`${item.daysPerWeek}× / week`} />
            <Chip small label={difficultyLabel(item.difficulty)} />
          </View>
        </View>
      </Cover>
    </Pressable>
  );
}

/** Numbered exercise row (design: "1: Squats   3/12"). */
export function NumberedRow({ index, title, meta, onPress, done }: { index: number; title: string; meta?: string; onPress?: () => void; done?: boolean }) {
  return (
    <Card onPress={onPress} style={{ paddingVertical: 14 }} accessibilityLabel={`${index}. ${title} ${meta ?? ''}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text variant="bodyStrong" color={done ? colors.accent : colors.textSecondary} style={{ width: 22 }}>
          {index}:
        </Text>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </Text>
        {done && <Icon name="checkmark-circle" size={18} color={colors.accent} />}
        {meta && (
          <Text variant="smallStrong" color={colors.textSecondary}>
            {meta}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,21,32,0.7)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
