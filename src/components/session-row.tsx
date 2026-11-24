import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { fmtMinutes } from '@/lib/workout';
import { colors, radius } from '@/theme/tokens';
import type { ServerSession } from '@/lib/types';

import { Card, Icon, Row, Text } from './ui';

export function SessionRow({ s }: { s: ServerSession }) {
  const router = useRouter();
  const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
  const date = new Date(s.completedAt ?? s.startedAt);
  return (
    <Pressable onPress={() => router.push(`/history/${s.id}`)} accessibilityRole="button" accessibilityLabel={s.title ?? 'Workout'}>
      <Card style={{ paddingVertical: 12 }}>
        <Row>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="caption" color={colors.muted}>
              {date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
            </Text>
            <Text variant="bodyStrong">{date.getDate()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {s.title ?? 'Workout'}
            </Text>
            <Text variant="caption" color={colors.muted}>
              {s.exercises.length} exercise{s.exercises.length === 1 ? '' : 's'} · {sets} set{sets === 1 ? '' : 's'} · {fmtMinutes(s.durationSeconds)}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.muted} />
        </Row>
      </Card>
    </Pressable>
  );
}
