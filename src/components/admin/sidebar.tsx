import type { IconName } from '@/components/ui';

import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/stores/auth';
import { colors, radius } from '@/theme/tokens';
import { useCan, PERM } from '@/lib/admin';
import { useReducedMotion } from '@/lib/motion';
import { confirmSignOut } from '@/lib/sign-out';
import { ADMIN_MODULES } from '@/lib/admin-modules';
import { Brand } from '@/components/brand';
import { haptic, Icon, Text } from '@/components/ui';

export const useSidebar = create<{ open: boolean; setOpen: (v: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

type Item = { href: string; label: string; icon: IconName; perm?: string };

/** Slide-in admin menu (mounted once in the admin layout). */
export function AdminSidebar() {
  const open = useSidebar((s) => s.open);
  const setOpen = useSidebar((s) => s.setOpen);
  const user = useAuth((s) => s.user);
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const panel = Math.min(310, Math.round(Math.min(width, 440) * 0.82));
  const [x] = useState(() => new Animated.Value(0));
  const [visible, setVisible] = useState(open);

  // Keep the modal mounted until the close animation has finished.
  if (open && !visible) setVisible(true);

  useEffect(() => {
    if (!visible) return;
    const to = open ? 1 : 0;
    if (reduce) {
      x.setValue(to);
      if (!open) setVisible(false);
      return;
    }
    Animated.timing(x, { toValue: to, duration: open ? 260 : 200, easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.quad), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, visible, reduce, x]);

  const items: Item[] = [
    { href: '/admin', label: 'Overview', icon: 'grid', perm: PERM.DASHBOARD_VIEW },
    { href: '/admin/members', label: 'Members', icon: 'person', perm: PERM.USERS_VIEW },
    ...ADMIN_MODULES.map((m) => ({ href: `/admin/${m.key}`, label: m.title, icon: m.icon, perm: PERM.CONTENT_VIEW })),
  ].filter((i) => !i.perm || can(i.perm));

  const go = (href: string) => {
    haptic.select();
    setOpen(false);
    if (pathname !== href) router.replace(href as any);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => setOpen(false)}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: x }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          styles.panel,
          { width: panel, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12 },
          { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-panel - 20, 0] }) }] },
        ]}
      >
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <Brand />
          <View style={styles.me}>
            <View style={styles.avatar}>
              <Text variant="bodyStrong" color={colors.accentText}>
                {(user?.name ?? 'A')[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {user?.name}
              </Text>
              <Text variant="caption" color={colors.accent} numberOfLines={1}>
                {user?.role?.name ?? 'Admin'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
          <Text variant="caption" color={colors.muted} style={{ paddingHorizontal: 12, marginTop: 6, marginBottom: 4 }}>
            MANAGE
          </Text>
          {items.map((i) => {
            const active = i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
            return (
              <Pressable
                key={i.href}
                onPress={() => go(i.href)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && !active && { backgroundColor: colors.surface2 }]}
              >
                <Icon name={active ? i.icon : (`${i.icon}-outline` as IconName)} size={20} color={active ? colors.accentText : colors.textSecondary} />
                <Text variant="bodyStrong" color={active ? colors.accentText : colors.text} style={{ flex: 1 }}>
                  {i.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 12, gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
          <Pressable
            onPress={() => {
              setOpen(false);
              confirmSignOut();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.item, pressed && { backgroundColor: 'rgba(255,93,99,0.12)' }]}
          >
            <Icon name="log-out-outline" size={20} color={colors.danger} />
            <Text variant="bodyStrong" color={colors.danger}>
              Log out
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  me: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, height: 50, borderRadius: radius.pill },
  itemActive: { backgroundColor: colors.accent },
});
