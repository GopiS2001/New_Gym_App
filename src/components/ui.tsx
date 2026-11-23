import type { ComponentProps, ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle, TextInputProps } from 'react-native';

import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts, radius, type, TypeVariant } from '@/theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ----------------------------------------------------------------------

export function Text({
  variant = 'body',
  color = colors.text,
  style,
  children,
  ...rest
}: ComponentProps<typeof RNText> & { variant?: TypeVariant; color?: string }) {
  return (
    <RNText style={[type[variant], { color }, style]} {...rest}>
      {children}
    </RNText>
  );
}

export function Icon({ name, size = 22, color = colors.text, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

export const haptic = {
  light: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  select: () => Platform.OS !== 'web' && Haptics.selectionAsync(),
};

// ----------------------------------------------------------------------

/** Full screen container: navy background with a soft accent glow. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  contentStyle,
  refreshControl,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: ComponentProps<typeof ScrollView>['refreshControl'];
  footer?: ReactNode;
}) {
  const pad = padded ? { paddingHorizontal: 20 } : null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={['rgba(200,241,53,0.07)', 'rgba(11,21,32,0)']}
        start={{ x: 0.9, y: 0 }}
        end={{ x: 0.2, y: 0.45 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[pad, { paddingBottom: 120 }, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
}

/** Centered title header with back button, as in the design's detail screens. */
export function Header({ title, right, back = true, onBack }: { title?: string; right?: ReactNode; back?: boolean; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <View style={{ width: 44 }}>
        {back && (
          <IconButton
            icon="chevron-back"
            label="Go back"
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          />
        )}
      </View>
      <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </Text>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

// ----------------------------------------------------------------------

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
  full?: boolean;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'lg', style, full = true }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? 'rgba(255,93,99,0.14)' : variant === 'secondary' ? colors.surface2 : 'transparent';
  const fg = variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;
  const height = size === 'lg' ? 56 : size === 'md' ? 46 : 36;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, full && { alignSelf: 'stretch' }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
        onPress={() => {
          haptic.light();
          onPress?.();
        }}
        style={[
          styles.button,
          {
            height,
            backgroundColor: bg,
            opacity: disabled ? 0.45 : 1,
            borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
            borderColor: colors.borderStrong,
            paddingHorizontal: size === 'sm' ? 14 : 22,
          },
          variant === 'primary' && !disabled && styles.glow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} />}
            <Text variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg} style={{ fontSize: size === 'lg' ? 17 : undefined }}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  active,
  size = 44,
  color,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  active?: boolean;
  size?: number;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        haptic.select();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: active ? colors.accent : colors.surface2, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Icon name={icon} size={size * 0.46} color={color ?? (active ? colors.accentText : colors.text)} />
    </Pressable>
  );
}

// ----------------------------------------------------------------------

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  highlight,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  highlight?: boolean;
}) {
  const body = (
    <LinearGradient
      colors={highlight ? ['rgba(200,241,53,0.16)', 'rgba(23,38,54,0.95)'] : ['rgba(30,48,67,0.75)', 'rgba(17,29,41,0.92)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, highlight && { borderColor: 'rgba(200,241,53,0.35)' }, style]}
    >
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {body}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  small?: boolean;
}) {
  const content = (
    <View style={[styles.chip, small && { paddingVertical: 4, paddingHorizontal: 10 }, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
      {icon && <Icon name={icon} size={14} color={selected ? colors.accentText : colors.textSecondary} />}
      <Text variant={small ? 'caption' : 'smallStrong'} color={selected ? colors.accentText : colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
    >
      {content}
    </Pressable>
  );
}

/** Square stat tile with icon, value and caption (design: "420 KCAL"). */
export function StatTile({ icon, value, label, tint = colors.accent, style }: { icon: IconName; value: string; label: string; tint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, gap: 6 }, style]}>
      <Icon name={icon} size={22} color={tint} />
      <Text variant="bodyStrong" style={{ fontSize: 17 }}>
        {value}
      </Text>
      <Text variant="caption" color={colors.muted} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="h3">{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text variant="smallStrong" color={colors.accent}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------

export function TextField({
  label,
  error,
  secure,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string; secure?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong" color={colors.textSecondary}>
        {label}
      </Text>
      <View style={[styles.input, focused && { borderColor: colors.accent }, !!error && { borderColor: colors.danger }]}>
        <TextInput
          placeholderTextColor={colors.muted}
          secureTextEntry={secure && !visible}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 }, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {secure && (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8} accessibilityLabel={visible ? 'Hide password' : 'Show password'}>
            <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text variant="small" color={colors.danger}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------

export function Skeleton({ height = 16, width = '100%', radius: r = 12, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width, borderRadius: r, backgroundColor: colors.surface2, opacity: pulse }, style]} />;
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 10 }}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.accent} />
      </View>
      <Text variant="h3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {message && (
        <Text variant="small" color={colors.muted} style={{ textAlign: 'center' }}>
          {message}
        </Text>
      )}
      {action && <Button title={action} onPress={onAction} size="md" full={false} style={{ marginTop: 8 }} />}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
      <Icon name="cloud-offline-outline" size={30} color={colors.warning} />
      <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
        {message ?? "Couldn't load this right now"}
      </Text>
      {onRetry && <Button title="Try again" icon="refresh" variant="secondary" size="sm" full={false} onPress={onRetry} />}
    </Card>
  );
}

/** Fade + rise entrance; respects nothing heavy so it stays fast. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

export function Row({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// ----------------------------------------------------------------------

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  button: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16, overflow: 'hidden' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDim,
  },
});
