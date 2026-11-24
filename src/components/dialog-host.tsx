import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/lib/motion';
import { useDialog } from '@/stores/dialog';
import { colors, radius } from '@/theme/tokens';

import { haptic, Icon, Text } from './ui';

const TONES = {
  accent: { fg: colors.accent, soft: 'rgba(200,241,53,0.14)', button: colors.accent, buttonText: colors.accentText },
  danger: { fg: colors.danger, soft: 'rgba(255,93,99,0.14)', button: colors.danger, buttonText: '#FFFFFF' },
  info: { fg: '#5AC8FA', soft: 'rgba(90,200,250,0.14)', button: colors.accent, buttonText: colors.accentText },
} as const;

/** Renders the current app dialog (mounted once in the root layout). */
export function DialogHost() {
  const current = useDialog((s) => s.current);
  const close = useDialog((s) => s.close);
  const reduce = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!current) return;
    anim.setValue(reduce ? 1 : 0);
    if (!reduce) {
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    if (current.tone === 'danger') haptic.medium();
  }, [current, reduce, anim]);

  if (!current) return null;
  const tone = TONES[current.tone ?? 'accent'];
  const cancellable = !!current.cancelText;

  const finish = (ok: boolean) => {
    if (reduce) return close(ok);
    Animated.timing(anim, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => close(ok));
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => finish(false)}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: anim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => cancellable && finish(false)}
          accessibilityRole="button"
          accessibilityLabel={cancellable ? "Close dialog" : undefined}
          importantForAccessibility="no"
        />
      </Animated.View>
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          {current.icon && (
            <View style={[styles.icon, { backgroundColor: tone.soft }]}>
              <Icon name={current.icon} size={28} color={tone.fg} />
            </View>
          )}
          <Text variant="h3" style={{ textAlign: 'center' }} accessibilityRole="header">
            {current.title}
          </Text>
          {!!current.message && (
            <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              {current.message}
            </Text>
          )}
          <View style={styles.buttons}>
            {cancellable && (
              <DialogButton label={current.cancelText!} onPress={() => finish(false)} bg={colors.surface2} fg={colors.text} bordered />
            )}
            <DialogButton label={current.confirmText ?? 'OK'} onPress={() => finish(true)} bg={tone.button} fg={tone.buttonText} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DialogButton({ label, onPress, bg, fg, bordered }: { label: string; onPress: () => void; bg: string; fg: string; bordered?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, transform: [{ scale: pressed ? 0.96 : 1 }] },
        bordered && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      <Text variant="bodyStrong" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 10,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 12 },
  button: { flex: 1, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
