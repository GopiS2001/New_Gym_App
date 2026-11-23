import type { IconName } from '@/components/ui';

import { Tabs, Redirect } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/stores/auth';
import { colors } from '@/theme/tokens';
import { Icon } from '@/components/ui';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'explore', title: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', iconActive: 'barbell' },
  { name: 'library', title: 'Library', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { name: 'profile', title: 'You', icon: 'person-outline', iconActive: 'person' },
];

/** Floating pill tab bar with circular icons (design reference). */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const status = useAuth((s) => s.status);
  if (status === 'guest') return <Redirect href="/welcome" />;

  return (
    <Tabs
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
          bottom: Math.max(insets.bottom, 12),
          height: 68,
          borderRadius: 34,
          backgroundColor: 'rgba(17,29,41,0.96)',
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.border,
          borderTopColor: colors.border,
          paddingBottom: 0,
          paddingTop: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarItemStyle: { height: 66, justifyContent: 'center', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 0 : 12 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? colors.accent : colors.surface2,
                  borderWidth: focused ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Icon name={focused ? t.iconActive : t.icon} size={21} color={focused ? colors.accentText : colors.textSecondary} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
