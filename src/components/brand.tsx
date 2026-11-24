import { Image } from 'expo-image';
import { View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { Text } from './ui';

const MARK = require('../../assets/images/logo-mark.png');
const LOGO = require('../../assets/images/logo.png');
/** Emblem width / height (logo-mark.png is 256x135). */
const MARK_RATIO = 256 / 135;
/** Full logo width / height (logo.png is 900x685). */
const LOGO_RATIO = 900 / 685;

/** FitFlow wordmark: the flexing emblem + "FitFlow". */
export function Brand({ size = 22 }: { size?: number }) {
  const markH = size * 1.35;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }} accessibilityRole="header" accessibilityLabel="FitFlow">
      <Image source={MARK} style={{ width: markH * MARK_RATIO, height: markH }} contentFit="contain" />
      <Text style={{ fontFamily: fonts.extrabold, fontSize: size, color: colors.text, letterSpacing: -0.3 }}>
        Fit<Text style={{ fontFamily: fonts.extrabold, fontSize: size, color: colors.accent }}>Flow</Text>
      </Text>
    </View>
  );
}

/** The full FitFlow logo (emblem, wordmark and tagline). */
export function Logo({ width = 220 }: { width?: number }) {
  return <Image source={LOGO} style={{ width, height: width / LOGO_RATIO }} contentFit="contain" accessibilityLabel="FitFlow — Train, Track, Transform" />;
}
