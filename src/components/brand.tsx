import { View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { Icon, Text } from './ui';

/** FitFlow wordmark from the design reference. */
export function Brand({ size = 22 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }} accessibilityRole="header" accessibilityLabel="FitFlow">
      <Icon name="flash" size={size} color={colors.accent} style={{ transform: [{ skewX: '-12deg' }] }} />
      <Text style={{ fontFamily: fonts.extrabold, fontSize: size, color: colors.text, letterSpacing: -0.3 }}>
        Fit<Text style={{ fontFamily: fonts.extrabold, fontSize: size, color: colors.accent }}>Flow</Text>
      </Text>
    </View>
  );
}
