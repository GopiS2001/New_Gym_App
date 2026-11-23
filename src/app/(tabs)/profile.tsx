import type { IconName } from '@/components/ui';

import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/stores/auth';
import { colors, radius } from '@/theme/tokens';
import { DAY_LABELS } from '@/lib/reminders';
import { useProfile, useProgress } from '@/lib/queries';
import { Card, ErrorState, Icon, Row, Screen, SectionHeader, Skeleton, StatTile, Text } from '@/components/ui';

export default function ProfileTab() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { data: p, isLoading, error, refetch } = useProfile();
  const month = useProgress('month');

  const items: { icon: IconName; title: string; value?: string; href: string }[] = [
    { icon: 'flag-outline', title: 'Fitness goal', value: p?.goal?.name, href: '/settings/preferences' },
    { icon: 'body-outline', title: 'Focus areas', value: p?.focusAreas.map((f) => f.name).join(', '), href: '/settings/preferences' },
    { icon: 'trending-up-outline', title: 'Training experience', value: p?.experienceLevel?.name, href: '/settings/preferences' },
    { icon: 'calendar-outline', title: 'Weekly target', value: p?.weeklyWorkoutDays ? `${p.weeklyWorkoutDays} days` : undefined, href: '/settings/preferences' },
    { icon: 'barbell-outline', title: 'Equipment', value: p?.equipment.length ? `${p.equipment.length} items` : undefined, href: '/settings/preferences' },
  ];
  const settings: { icon: IconName; title: string; value?: string; href: string }[] = [
    { icon: 'scale-outline', title: 'Body measurements', value: p?.latestWeight ? `${p.latestWeight.value} ${p.latestWeight.unit}` : undefined, href: '/settings/measurements' },
    {
      icon: 'notifications-outline',
      title: 'Workout reminders',
      value: p?.reminders.enabled ? `${p.reminders.days.map((d) => DAY_LABELS[d]).join(', ')} · ${p.reminders.time ?? ''}` : 'Off',
      href: '/settings/reminders',
    },
    { icon: 'options-outline', title: 'Units & preferences', value: p ? `${p.preferredWeightUnit.toLowerCase()} · ${p.preferredDistanceUnit.toLowerCase()}` : undefined, href: '/settings/preferences' },
    { icon: 'shield-checkmark-outline', title: 'Account & privacy', href: '/settings/account' },
  ];

  return (
    <Screen>
      <Text variant="h1" style={{ marginTop: 12 }} accessibilityRole="header">
        You
      </Text>
      {error ? (
        <View style={{ marginTop: 16 }}>
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : (
        <>
          <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }} onPress={() => router.push('/settings/account')} accessibilityLabel="Edit profile">
            <View style={styles.avatar}>
              {p?.avatarUrl ? (
                <Image source={{ uri: p.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text variant="h2" color={colors.accentText}>
                  {(p?.name ?? user?.name ?? '?')[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              {isLoading ? <Skeleton height={20} width="60%" /> : <Text variant="h3">{p?.name}</Text>}
              <Text variant="small" color={colors.muted}>
                {p?.email ?? user?.email}
              </Text>
              {p && !p.emailVerified && (
                <Text variant="caption" color={colors.warning}>
                  Email not verified
                </Text>
              )}
            </View>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Card>

          <Row gap={10} style={{ marginTop: 14 }}>
            <StatTile style={{ flex: 1 }} icon="barbell" value={String(month.data?.allTimeWorkouts ?? 0)} label="WORKOUTS" />
            <StatTile style={{ flex: 1 }} icon="calendar" value={String(month.data?.workouts ?? 0)} label="THIS MONTH" />
            <StatTile style={{ flex: 1 }} icon="flash" tint={colors.warning} value={`${Math.round((month.data?.totalVolumeKg ?? 0) / 1000)}t`} label="VOLUME" />
          </Row>

          <SectionHeader title="My plan" />
          <List items={items} onPress={(h) => router.push(h as any)} loading={isLoading} />
          <SectionHeader title="Settings" />
          <List items={settings} onPress={(h) => router.push(h as any)} loading={isLoading} />
          <Card onPress={() => router.push('/progress')} style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel="View progress">
            <Icon name="stats-chart" size={22} color={colors.accent} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              View progress
            </Text>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </>
      )}
    </Screen>
  );
}

function List({ items, onPress, loading }: { items: { icon: IconName; title: string; value?: string; href: string }[]; onPress: (href: string) => void; loading?: boolean }) {
  return (
    <Card style={{ padding: 0 }}>
      {items.map((it, i) => (
        <Pressable
          key={it.title}
          onPress={() => onPress(it.href)}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}${it.value ? `: ${it.value}` : ''}`}
          style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surface2 }]}
        >
          <Icon name={it.icon} size={20} color={colors.accent} />
          <Text variant="body" style={{ flex: 1 }}>
            {it.title}
          </Text>
          {loading ? (
            <Skeleton height={12} width={60} />
          ) : (
            <Text variant="small" color={colors.muted} numberOfLines={1} style={{ maxWidth: 150 }}>
              {it.value ?? ''}
            </Text>
          )}
          <Icon name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderRadius: radius.lg },
});
