import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/stores/toast';
import { useReducedMotion } from '@/lib/motion';
import { colors, radius } from '@/theme/tokens';

import { haptic, Icon, Text } from './ui';

const SHOW_MS = 4500;

/** Slide-down banner for live notifications (e.g. a new friend request). */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const hide = useToast((s) => s.hide);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [y] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!current) return;
    haptic.success();
    const native = Platform.OS !== 'web';
    y.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.spring(y, { toValue: 1, friction: 8, tension: 80, useNativeDriver: native }).start();
    const t = setTimeout(() => {
      if (reduce) return hide();
      Animated.timing(y, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => hide());
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [current, reduce, y, hide]);

  if (!current) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] },
      ]}
    >
      <Pressable
        onPress={() => {
          hide();
          if (current.href) router.push(current.href as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${current.title}. ${current.body ?? ''}`}
        accessibilityLiveRegion="polite"
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.avatar}>
          {current.avatarName ? (
            <Text variant="bodyStrong" color={colors.accentText}>
              {current.avatarName[0]?.toUpperCase()}
            </Text>
          ) : (
            <Icon name={current.icon ?? 'notifications'} size={18} color={colors.accentText} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {current.title}
          </Text>
          {!!current.body && (
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {current.body}
            </Text>
          )}
        </View>
        <Icon name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 1000, elevation: 30 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
