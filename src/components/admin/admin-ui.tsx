import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { IconName } from '@/components/ui';

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mediaUrl } from '@/lib/media';
import { colors, fonts, radius } from '@/theme/tokens';
import { haptic, Icon, IconButton, Text } from '@/components/ui';

import { useSidebar } from './sidebar';

/** Admin page shell: menu (or back) button, title, optional right action. */
export function AdminScreen({ title, back, right, children }: { title: string; back?: boolean; right?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const setOpen = useSidebar((s) => s.setOpen);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.header}>
          {back ? (
            <IconButton icon="chevron-back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/admin'))} />
          ) : (
            <IconButton
              icon="menu"
              label="Open menu"
              onPress={() => {
                haptic.select();
                setOpen(true);
              }}
            />
          )}
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {title}
          </Text>
          <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
        </View>
        {children}
      </SafeAreaView>
    </View>
  );
}

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  PUBLISHED: { fg: colors.accent, bg: 'rgba(200,241,53,0.14)' },
  ACTIVE: { fg: colors.accent, bg: 'rgba(200,241,53,0.14)' },
  DRAFT: { fg: colors.textSecondary, bg: colors.surface2 },
  INACTIVE: { fg: colors.textSecondary, bg: colors.surface2 },
  ARCHIVED: { fg: colors.warning, bg: 'rgba(255,184,0,0.14)' },
  SUSPENDED: { fg: colors.danger, bg: 'rgba(255,93,99,0.14)' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: c.bg }}>
      <Text variant="caption" color={c.fg} style={{ fontFamily: fonts.semibold }}>
        {status[0] + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

/** Lime on/off switch with a label for screen readers. */
export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: colors.surface3, true: colors.accent }}
      thumbColor={Platform.OS === 'android' ? (value ? '#FFFFFF' : colors.muted) : undefined}
      {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
    />
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {!!value && <IconButton icon="close" label="Clear search" size={30} onPress={() => onChange('')} />}
    </View>
  );
}

/** Thumbnail + title + subtitle + right-side controls; tap opens the item. */
export function AdminRow({
  title,
  subtitle,
  imageUri,
  icon,
  onPress,
  badge,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  icon: IconName;
  onPress?: () => void;
  badge?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}>
        <View style={styles.thumb}>
          {imageUri ? (
            <Image source={{ uri: mediaUrl(imageUri) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Icon name={icon} size={20} color="rgba(200,241,53,0.55)" />
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text variant="caption" color={colors.muted} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
          {badge}
        </View>
      </Pressable>
      {right}
    </View>
  );
}

export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.medium();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <Icon name="add" size={22} color={colors.accentText} />
      <Text variant="bodyStrong" color={colors.accentText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 52, height: 52, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
});
