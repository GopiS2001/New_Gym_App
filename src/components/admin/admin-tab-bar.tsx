import type { IconName } from "@/components/ui";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "expo-router";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/tokens";
import { useReducedMotion } from "@/lib/motion";
import { useCan, PERM } from "@/lib/admin";
import { haptic, Icon } from "@/components/ui";

import { useSidebar } from "./sidebar";

export const ADMIN_BAR_HEIGHT = 68;
const ICON_SIZE = 48;

type Tab = {
  key: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
  href?: string;
  perm?: string;
};

const TABS: Tab[] = [
  {
    key: "overview",
    label: "Overview",
    icon: "grid-outline",
    iconActive: "grid",
    href: "/admin",
    perm: PERM.DASHBOARD_VIEW,
  },
  {
    key: "members",
    label: "Members",
    icon: "person-outline",
    iconActive: "person",
    href: "/admin/members",
    perm: PERM.USERS_VIEW,
  },
  {
    key: "exercises",
    label: "Exercises",
    icon: "barbell-outline",
    iconActive: "barbell",
    href: "/admin/exercises",
    perm: PERM.CONTENT_VIEW,
  },
  {
    key: "programs",
    label: "Programs",
    icon: "calendar-outline",
    iconActive: "calendar",
    href: "/admin/programs",
    perm: PERM.CONTENT_VIEW,
  },
  { key: "more", label: "More", icon: "menu-outline", iconActive: "menu" },
];

/** Bottom offset shared with screens that float things above the bar. */
export function useAdminBarSpace() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 6, 6) + ADMIN_BAR_HEIGHT;
}

/** Same floating pill bar as the member app, for the admin's main sections. */
export function AdminTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const can = useCan();
  const insets = useSafeAreaInsets();
  const setOpen = useSidebar((s) => s.setOpen);

  // Only on top-level admin screens (lists / overview), not on forms or details.
  const depth = pathname.split("/").filter(Boolean).length;
  if (depth > 2) return null;

  const current =
    pathname === "/admin"
      ? "overview"
      : (TABS.find(
          (t) => t.href && t.href !== "/admin" && pathname.startsWith(t.href),
        )?.key ?? "more");

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom - 6, 6) }]}
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.filter((t) => !t.perm || can(t.perm)).map((t) => (
          <TabButton
            key={t.key}
            tab={t}
            focused={current === t.key}
            onPress={() => {
              if (!t.href) return setOpen(true);
              if (pathname !== t.href) router.replace(t.href as any);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  tab,
  focused,
  onPress,
}: {
  tab: Tab;
  focused: boolean;
  onPress: () => void;
}) {
  const reduce = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [press] = useState(() => new Animated.Value(1));
  const native = Platform.OS !== "web";

  useEffect(() => {
    if (reduce) pop.setValue(focused ? 1 : 0);
    else
      Animated.spring(pop, {
        toValue: focused ? 1 : 0,
        friction: 5,
        tension: 140,
        useNativeDriver: native,
      }).start();
  }, [focused, reduce, pop, native]);

  const scale = Animated.multiply(
    press,
    pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
  );
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      onPressIn={() =>
        !reduce &&
        Animated.spring(press, {
          toValue: 0.86,
          speed: 50,
          bounciness: 0,
          useNativeDriver: native,
        }).start()
      }
      onPressOut={() =>
        !reduce &&
        Animated.spring(press, {
          toValue: 1,
          speed: 30,
          bounciness: 8,
          useNativeDriver: native,
        }).start()
      }
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      style={styles.item}
    >
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [
              { scale },
              {
                translateY: pop.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
          focused ? { backgroundColor: colors.accent, borderWidth: 0 } : null,
        ]}
      >
        <Icon
          name={focused ? tab.iconActive : tab.icon}
          size={21}
          color={focused ? colors.accentText : colors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 20, right: 20 },
  bar: {
    height: ADMIN_BAR_HEIGHT,
    borderRadius: ADMIN_BAR_HEIGHT / 2,
    flexDirection: "row",
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  item: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
