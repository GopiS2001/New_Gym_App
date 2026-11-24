import type { IconName } from "@/components/ui";
import type { BottomTabBarButtonProps } from "expo-router/build/react-navigation/bottom-tabs/types";

import { Tabs, Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/stores/auth";
import { colors } from "@/theme/tokens";
import { haptic, Icon, Text } from "@/components/ui";
import { canUseFriends, useFriendRequests } from "@/lib/social";
import { useReducedMotion } from "@/lib/motion";
import { confirmSignOut } from "@/lib/sign-out";
import { isAdmin } from "@/lib/admin";
import { useViewMode } from "@/stores/view-mode";
import { ViewSwitch } from "@/components/admin/view-switch";

const BAR_HEIGHT = 68;
const ICON_SIZE = 46;

const TABS: {
  name: string;
  title: string;
  icon: IconName;
  iconActive: IconName;
}[] = [
  { name: "index", title: "Home", icon: "home-outline", iconActive: "home" },
  {
    name: "explore",
    title: "Explore",
    icon: "compass-outline",
    iconActive: "compass",
  },
  {
    name: "workout",
    title: "Workout",
    icon: "barbell-outline",
    iconActive: "barbell",
  },
  {
    name: "friends",
    title: "Friends",
    icon: "people-outline",
    iconActive: "people",
  },
  {
    name: "library",
    title: "Library",
    icon: "bookmark-outline",
    iconActive: "bookmark",
  },
  {
    name: "profile",
    title: "You",
    icon: "person-outline",
    iconActive: "person",
  },
];

/**
 * Tab button drawn by us so the circle is centred in the full height of the
 * pill on every platform (the default item top-aligns its icon).
 */
function TabButton({
  tab,
  props,
}: {
  tab: (typeof TABS)[number];
  props: BottomTabBarButtonProps;
}) {
  const focused = !!props["aria-selected"];
  const reduce = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [press] = useState(() => new Animated.Value(1));

  // Spring the circle when it becomes the active tab.
  useEffect(() => {
    if (reduce) {
      pop.setValue(focused ? 1 : 0);
      return;
    }
    Animated.spring(pop, {
      toValue: focused ? 1 : 0,
      friction: 5,
      tension: 140,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [focused, reduce, pop]);

  const scale = Animated.multiply(
    press,
    pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
  );
  const lift = pop.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  return (
    <Pressable
      onPress={(e) => {
        haptic.select();
        props.onPress?.(e as any);
      }}
      onLongPress={(e) => {
        // Long-press the last tab ("You") for a quick "Log out?".
        if (tab.name === "profile") {
          haptic.medium();
          confirmSignOut();
        } else props.onLongPress?.(e as any);
      }}
      delayLongPress={450}
      onPressIn={() =>
        !reduce &&
        Animated.spring(press, {
          toValue: 0.86,
          speed: 50,
          bounciness: 0,
          useNativeDriver: Platform.OS !== "web",
        }).start()
      }
      onPressOut={() =>
        !reduce &&
        Animated.spring(press, {
          toValue: 1,
          speed: 30,
          bounciness: 8,
          useNativeDriver: Platform.OS !== "web",
        }).start()
      }
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
      accessibilityHint={
        tab.name === "profile" ? "Long press to log out" : undefined
      }
      accessibilityActions={
        tab.name === "profile"
          ? [{ name: "longpress", label: "Log out" }]
          : undefined
      }
      onAccessibilityAction={(e) => {
        if (tab.name === "profile" && e.nativeEvent.actionName === "longpress")
          confirmSignOut();
      }}
      style={{
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }, { translateY: lift }],
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? colors.accent : colors.surface2,
          borderWidth: focused ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Icon
          name={focused ? tab.iconActive : tab.icon}
          size={21}
          color={focused ? colors.accentText : colors.textSecondary}
        />
        {tab.name === "friends" && <RequestsBadge />}
      </Animated.View>
    </Pressable>
  );
}

/** Floating pill tab bar with circular icons (design reference). */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const mode = useViewMode((s) => s.mode);
  if (status === "guest") return <Redirect href="/welcome" />;
  if (isAdmin(user) && mode === "admin") return <Redirect href="/admin" />;

  return (
    <>
      <Tabs
        // The bar floats above the system inset itself, so don't pad inside it.
        safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          // Screens shift slightly and cross-fade when switching tabs.
          animation: "shift",
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarStyle: {
            position: "absolute",
            left: 20,
            right: 20,
            marginHorizontal: 20,
            bottom: Math.max(insets.bottom - 6, 6),
            height: BAR_HEIGHT,
            borderRadius: BAR_HEIGHT / 2,
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: colors.border,
            borderTopColor: colors.border,
            paddingTop: 0,
            paddingBottom: 0,
            paddingHorizontal: 8,
            elevation: 12,
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
          },
          tabBarItemStyle: { height: BAR_HEIGHT - 2, padding: 0 },
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={
              // The Super Admin doesn't use friends: hide that tab for them.
              t.name === "friends" && !canUseFriends(user)
                ? { href: null }
                : {
                    title: t.title,
                    tabBarAccessibilityLabel: t.title,
                    tabBarButton: (props) => <TabButton tab={t} props={props} />,
                  }
            }
          />
        ))}
      </Tabs>
      {/* Admins previewing the member app can switch back here. */}
      {isAdmin(user) && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            alignItems: "center",
            bottom: Math.max(insets.bottom - 6, 6) + BAR_HEIGHT + 12,
          }}
        >
          <ViewSwitch compact />
        </View>
      )}
    </>
  );
}

/** Count of new friend requests on the Friends tab icon. */
function RequestsBadge() {
  const { data } = useFriendRequests();
  const n = data?.incoming.length ?? 0;
  if (!n) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: colors.danger,
        borderWidth: 2,
        borderColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel={`${n} new friend requests`}
    >
      <Text variant="caption" color="#FFFFFF" style={{ fontSize: 10, lineHeight: 12 }}>
        {n > 9 ? "9+" : n}
      </Text>
    </View>
  );
}
