import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useReducedMotion } from "@/lib/motion";
import { useOnboarding } from "@/stores/onboarding";
import { colors } from "@/theme/tokens";
import { Brand } from "@/components/brand";
import { Button, Text } from "@/components/ui";

/** Welcome (design screen 1) over a full-screen brand photo slideshow. */
export default function Welcome() {
  const router = useRouter();
  const step = useOnboarding((s) => s.step);
  const intro = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [intro]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDeep }}>
      <PhotoBackground />
      {/* Darken the photos: light at the top, solid behind the text and buttons. */}
      <LinearGradient
        colors={["rgba(7,14,22,0.55)", "rgba(7,14,22,0.25)", "rgba(7,14,22,0.8)", colors.bgDeep]}
        locations={[0, 0.3, 0.62, 0.86]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ flex: 1, paddingHorizontal: 24 }}
      >
        <Brand />
        <View style={{ flex: 1 }} />
        <Animated.View
          style={{
            opacity: intro,
            transform: [
              {
                translateY: intro.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
            gap: 10,
            alignItems: "center",
          }}
        >
          <Text variant="display" style={{ textAlign: "center" }}>
            <Text variant="display" color={colors.accent}>
              Train Smarter.
            </Text>{" "}
            Live Stronger
          </Text>
          <Text
            variant="body"
            color={colors.textSecondary}
            style={{ textAlign: "center", maxWidth: 300 }}
          >
            Your personalized fitness journey, all in one place.
          </Text>
          <View style={{ height: 28 }} />
          <Button
            title={step > 0 ? "Continue setup" : "Join Free"}
            icon="arrow-forward"
            onPress={() => router.push("/onboarding")}
          />
          <Pressable
            onPress={() => router.push("/login")}
            hitSlop={10}
            accessibilityRole="link"
            style={{ paddingVertical: 14 }}
          >
            <Text variant="body" color={colors.textSecondary}>
              Already have an account?{" "}
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

// Brand photography (from E:\App\Screen). Shown full-screen, cross-fading.
const PHOTOS = [
  require('../../assets/images/welcome/welcome-1.jpg'),
  require('../../assets/images/welcome/welcome-2.jpg'),
  require('../../assets/images/welcome/welcome-3.jpg'),
  require('../../assets/images/welcome/welcome-4.jpg'),
  require('../../assets/images/welcome/welcome-5.jpg'),
  require('../../assets/images/welcome/welcome-6.jpg'),
  require('../../assets/images/welcome/welcome-7.jpg'),
  require('../../assets/images/welcome/welcome-8.jpg'),
  require('../../assets/images/welcome/welcome-9.jpg'),
];

const HOLD_MS = 4500; // time each photo is shown
const FADE_MS = 1200; // cross-fade duration

const ZOOM = 1.08; // slow zoom-in reached at the end of each photo's turn

/**
 * Full-screen photo slideshow without flicker.
 *
 * Two fixed layers: the base layer always shows the current photo; the top
 * layer gets the next photo while it is invisible, waits until that photo has
 * actually loaded, then fades in over the base. Once fully covered, the base
 * switches to the same photo (no visible change) and the top layer is hidden
 * again for the next one. A photo is only ever swapped on a hidden layer.
 * With "Reduce motion" on, it shows the first photo, still.
 */
function PhotoBackground() {
  const reduce = useReducedMotion();
  const [base, setBase] = useState(0);
  // The first photo starts visible on the top layer and takes a full turn.
  const [top, setTop] = useState(0);
  const [loadedTop, setLoadedTop] = useState(-1);
  const opacity = useState(() => new Animated.Value(1))[0];
  const zoom = useState(() => new Animated.Value(0))[0];

  // Safety net: if a load event never arrives, continue anyway.
  useEffect(() => {
    if (reduce || loadedTop === top) return;
    const t = setTimeout(() => setLoadedTop(top), 1500);
    return () => clearTimeout(t);
  }, [reduce, top, loadedTop]);

  // Next photo is ready on the hidden top layer: fade it in, then hand over.
  useEffect(() => {
    if (reduce || loadedTop !== top) return;
    // opacity is already 0 here for every photo after the first (set while queueing it).
    zoom.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(zoom, { toValue: 1, duration: FADE_MS + HOLD_MS, easing: Easing.linear, useNativeDriver: true }),
    ]);
    anim.start();
    // Top fully covers the base now: show the same photo underneath…
    const handOver = setTimeout(() => setBase(top), FADE_MS + HOLD_MS);
    // …give the base a moment to paint, then hide the top (same photo underneath, so nothing visibly changes)…
    const hide = setTimeout(() => opacity.setValue(0), FADE_MS + HOLD_MS + 400);
    // …and only once it is hidden, load the next photo into it.
    const next = setTimeout(() => setTop((top + 1) % PHOTOS.length), FADE_MS + HOLD_MS + 550);
    return () => {
      anim.stop();
      clearTimeout(handOver);
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [reduce, top, loadedTop, opacity, zoom]);

  if (reduce) {
    return <Image source={PHOTOS[0]} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={PHOTOS[base]} style={[StyleSheet.absoluteFill, { transform: [{ scale: ZOOM }] }]} contentFit="cover" transition={0} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity, transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, ZOOM] }) }] },
        ]}
      >
        <Image
          source={PHOTOS[top]}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={0}
          onLoad={() => setLoadedTop(top)}
        />
      </Animated.View>
    </View>
  );
}
