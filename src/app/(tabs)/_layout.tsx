import type { IconName } from '@/components/ui';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { Tabs, Redirect } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/stores/auth';
import { colors } from '@/theme/tokens';
import { haptic, Icon } from '@/components/ui';

const BAR_HEIGHT = 68;
const ICON_SIZE = 48;

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'library', title: 'Library', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { name: 'profile', title: 'You', icon: 'person-outline', iconActive: 'person' },
];

/**
 * Tab button drawn by us so the circle is centred in the full height of the
 * pill on every platform (the default item top-aligns its icon).
 */
function TabButton({ tab, props }: { tab: (typeof TABS)[number]; props: BottomTabBarButtonProps }) {
  const focused = !!props['aria-selected'];
  return (
    <Pressable
      onPress={(e) => {
        haptic.select();
        props.onPress?.(e as any);
      }}
      onLongPress={props.onLongPress as any}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.title}
      style={{ flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ICON_SIZE / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.accent : colors.surface2,
          borderWidth: focused ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Icon name={focused ? tab.iconActive : tab.icon} size={21} color={focused ? colors.accentText : colors.textSecondary} />
      </View>
    </Pressable>
  );
}

/** Floating pill tab bar with circular icons (design reference). */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const status = useAuth((s) => s.status);
  if (status === 'guest') return <Redirect href="/welcome" />;

  return (
    <Tabs
      // The bar floats above the system inset itself, so don't pad inside it.
      safeAreaInsets={{ bottom: 0, top: 0, left: 0, right: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          position: 'absolute',
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
          shadowColor: '#000',
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
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarButton: (props) => <TabButton tab={t} props={props} />,
          }}
        />
      ))}
    </Tabs>
  );
}
