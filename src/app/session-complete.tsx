import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { fmtMinutes } from '@/lib/workout';
import { Button, Card, haptic, Icon, Row, StatTile, Text } from '@/components/ui';

/** Workout completed (design screen 5). */
export default function SessionComplete() {
  const router = useRouter();
  const p = useLocalSearchParams<{ title: string; duration: string; exercises: string; sets: string; volume: string; rating: string; synced: string; name: string }>();
  const pop = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptic.success();
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(shine, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
  }, [pop, shine]);

  const rating = Number(p.rating) || 0;
  const volume = Number(p.volume) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, paddingHorizontal: 20 }}>
        <Text variant="h3" style={{ textAlign: 'center', marginTop: 12 }}>
          Great Work
        </Text>

        <View style={{ alignItems: 'center', marginTop: 26 }}>
          <Animated.View
            style={[
              styles.glow,
              { transform: [{ rotate: shine.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Icon name="trophy" size={120} color="#FFD233" />
          </Animated.View>
        </View>

        <Text variant="h2" color={colors.accent} style={{ textAlign: 'center', marginTop: 16 }}>
          Workout Completed
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {p.title}
        </Text>

        <View style={{ marginTop: 26 }}>
          <Text variant="h2">Great Job{p.name ? `, ${p.name}` : ''}!</Text>
          <Text variant="body" color={colors.textSecondary}>
            You crushed your workout today.
          </Text>
        </View>

        <Text variant="h3" style={{ marginTop: 22, marginBottom: 12 }}>
          Today&apos;s results
        </Text>
        <Row gap={10}>
          <StatTile style={{ flex: 1 }} icon="layers" tint={colors.danger} value={String(p.sets ?? 0)} label="SETS" />
          <StatTile style={{ flex: 1 }} icon="time" tint={colors.info} value={fmtMinutes(Number(p.duration))} label="ACTIVE TIME" />
          <StatTile style={{ flex: 1 }} icon="barbell" tint={colors.warning} value={String(p.exercises ?? 0)} label="EXERCISES" />
        </Row>
        {volume > 0 && (
          <Card style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Total volume
            </Text>
            <Text variant="bodyStrong">{volume.toLocaleString()} kg</Text>
          </Card>
        )}

        {rating > 0 && (
          <View style={{ alignItems: 'center', marginTop: 20, gap: 6 }}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Workout Rate
            </Text>
            <Row gap={6} style={{ justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Icon key={n} name={n <= rating ? 'star' : 'star-outline'} size={22} color={n <= rating ? '#FFD233' : colors.muted} />
              ))}
            </Row>
          </View>
        )}

        {p.synced === '0' && (
          <Card style={{ marginTop: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="cloud-upload-outline" size={20} color={colors.warning} />
            <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              You&apos;re offline. This workout is saved on your phone and will sync automatically.
            </Text>
          </Card>
        )}

        <View style={{ flex: 1 }} />
        <Button title="Done" onPress={() => router.replace('/(tabs)')} />
        <Button title="View progress" variant="ghost" size="md" onPress={() => router.replace('/progress')} style={{ marginTop: 8 }} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(200,241,53,0.35)',
    backgroundColor: 'rgba(200,241,53,0.06)',
  },
});
