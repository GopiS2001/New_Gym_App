import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useOnboarding } from '@/stores/onboarding';
import { colors, fonts } from '@/theme/tokens';
import { Brand } from '@/components/brand';
import { Button, Icon, Text } from '@/components/ui';

/**
 * Welcome (design screen 1). The hero is a motion composition in the design's
 * palette; replace it with brand photography via <HeroArtwork /> when supplied.
 */
export default function Welcome() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const step = useOnboarding((s) => s.step);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [intro]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <HeroArtwork height={height * 0.62} />
      <LinearGradient
        colors={['rgba(7,14,22,0)', 'rgba(7,14,22,0.75)', colors.bgDeep]}
        locations={[0.3, 0.55, 0.72]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, paddingHorizontal: 24 }}>
        <Brand />
        <View style={{ flex: 1 }} />
        <Animated.View
          style={{ opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }], gap: 10, alignItems: 'center' }}
        >
          <Text variant="display" style={{ textAlign: 'center' }}>
            <Text variant="display" color={colors.accent}>
              Train Smarter.
            </Text>{' '}
            Live Stronger
          </Text>
          <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
            Your personalized fitness journey, all in one place.
          </Text>
          <View style={{ height: 28 }} />
          <Button title={step > 0 ? 'Continue setup' : 'Join Free'} icon="arrow-forward" onPress={() => router.push('/onboarding')} />
          <Pressable onPress={() => router.push('/login')} hitSlop={10} accessibilityRole="link" style={{ paddingVertical: 14 }}>
            <Text variant="body" color={colors.textSecondary}>
              Already have an account?{' '}
              <Text variant="bodyStrong" color={colors.accent}>
                Log in
              </Text>
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function HeroArtwork({ height }: { height: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 3200, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [pulse, float]);

  const ring = (delay: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5 - delay * 0.15, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6 + delay * 0.2, 1.6 + delay * 0.2] }) }],
  });
  const lift = { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] };

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={['#13263A', colors.bgDeep]} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.ring, ring(i)]} />
      ))}
      <Animated.View style={[styles.core, lift]}>
        <Icon name="barbell" size={96} color={colors.accent} />
      </Animated.View>
      <Animated.View style={[styles.floatCard, { top: height * 0.2, left: 24 }, lift]}>
        <Icon name="flame" size={18} color={colors.warning} />
        <View>
          <Text variant="smallStrong">Workout streak</Text>
          <Text variant="caption" color={colors.muted}>
            4 weeks in a row
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.floatCard, { top: height * 0.55, right: 24 }, lift]}>
        <View style={styles.badge}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.accentText }}>85%</Text>
        </View>
        <View>
          <Text variant="smallStrong">Full Body Strength</Text>
          <Text variant="caption" color={colors.muted}>
            45 min · Intermediate
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(200,241,53,0.10)',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  core: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,29,41,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.4)',
  },
  floatCard: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(23,38,54,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
