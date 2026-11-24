import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { colors, radius } from "@/theme/tokens";
import { useViewMode } from "@/stores/view-mode";
import { useReducedMotion } from "@/lib/motion";
import { haptic, Icon, Row, Text, usePressScale } from "@/components/ui";

const W = 84; // width of each half

/**
 * Admin ↔ App segmented toggle. "App" shows the member app as members see it;
 * "Admin" returns to the admin area.
 */
export function ViewSwitch({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const mode = useViewMode((s) => s.mode);
  const setMode = useViewMode((s) => s.setMode);
  const reduce = useReducedMotion();
  const [x] = useState(() => new Animated.Value(mode === "admin" ? 0 : 1));

  useEffect(() => {
    const to = mode === "admin" ? 0 : 1;
    if (reduce) x.setValue(to);
    else
      Animated.timing(x, {
        toValue: to,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start();
  }, [mode, reduce, x]);

  const go = (next: "admin" | "app") => {
    if (next === mode) return;
    haptic.medium();
    setMode(next);
    router.replace(next === "admin" ? "/admin" : "/(tabs)");
  };

  const w = compact ? 64 : W;
  return (
    <View
      style={[styles.track, { width: w * 2 + 8 }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Switch view"
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: w,
            transform: [
              {
                translateX: x.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, w],
                }),
              },
            ],
          },
        ]}
      />
      {(["admin", "app"] as const).map((m) => {
        const on = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => go(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={m === "admin" ? "Admin view" : "App view"}
            style={[styles.half, { width: w }]}
          >
            <Icon
              name={m === "admin" ? "shield-checkmark" : "phone-portrait"}
              size={compact ? 13 : 15}
              color={on ? colors.accentText : colors.textSecondary}
            />
            <Text
              variant={compact ? "caption" : "smallStrong"}
              color={on ? colors.accentText : colors.textSecondary}
              style={{ fontWeight: "700" }}
            >
              {m === "admin" ? "Admin" : "App"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 4,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    position: "absolute",
    top: 3,
    left: 4,
    bottom: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  half: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
});

// ----------------------------------------------------------------------------

/**
 * Premium "View" card for the admin overview: a glowing header and two large
 * choice tiles — Admin (manage) and App (see FitFlow as members do).
 */
export function ViewModeCard() {
  const router = useRouter();
  const mode = useViewMode((s) => s.mode);
  const setMode = useViewMode((s) => s.setMode);

  const go = (next: "admin" | "app") => {
    if (next === mode) return;
    haptic.medium();
    setMode(next);
    router.replace(next === "admin" ? "/admin" : "/(tabs)");
  };

  return (
    <View style={card.shell}>
      <LinearGradient
        colors={[
          "rgba(200,241,53,0.18)",
          "rgba(200,241,53,0.04)",
          "rgba(19,34,51,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* soft glow orb */}
      <View pointerEvents="none" style={card.orb} />

      <View style={card.head}>
        <View style={card.badge}>
          <Icon name="shield-checkmark" size={20} color={colors.accentText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            variant="caption"
            color={colors.accent}
            style={{ letterSpacing: 1.2 }}
          >
            VIEW MODE
          </Text>
          <Text variant="h3">
            {mode === "admin" ? "You’re in Admin" : "You’re in App view"}
          </Text>
          <Text variant="small" color={colors.textSecondary}>
            Preview FitFlow exactly as your members see it.
          </Text>
        </View>
      </View>

      <View style={card.tiles}>
        <ModeTile
          icon="shield-checkmark"
          title="Admin"
          subtitle="Manage FitFlow"
          active={mode === "admin"}
          onPress={() => go("admin")}
        />
        <ModeTile
          icon="phone-portrait"
          title="App"
          subtitle="See it as a member"
          active={mode === "app"}
          onPress={() => go("app")}
        />
      </View>
    </View>
  );
}

function ModeTile({
  icon,
  title,
  subtitle,
  active,
  onPress,
}: {
  icon: "shield-checkmark" | "phone-portrait";
  title: string;
  subtitle: string;
  active: boolean;
  onPress: () => void;
}) {
  const press = usePressScale(0.96);
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: press.scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        accessibilityLabel={`${title} view: ${subtitle}`}
        style={[card.tile, active && card.tileActive]}
      >
        <Row style={{ justifyContent: "space-between" }}>
          <View
            style={[
              card.tileIcon,
              active && { backgroundColor: "rgba(11,21,32,0.14)" },
            ]}
          >
            <Icon
              name={icon}
              size={18}
              color={active ? colors.accentText : colors.accent}
            />
          </View>
          <View style={[card.radio, active && card.radioOn]}>
            {active && (
              <Icon name="checkmark" size={12} color={colors.accent} />
            )}
          </View>
        </Row>
        <View style={{ gap: 1 }}>
          <Text
            variant="bodyStrong"
            color={active ? colors.accentText : colors.text}
          >
            {title}
          </Text>
          <Text
            variant="caption"
            color={active ? "rgba(11,21,32,0.7)" : colors.muted}
          >
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    overflow: "hidden",
    padding: 16,
    gap: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(200,241,53,0.28)",
  },
  orb: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(200,241,53,0.12)",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  tiles: { flexDirection: "row", gap: 10 },
  tile: {
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: "rgba(11,21,32,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(200,241,53,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: {
    backgroundColor: colors.accentText,
    borderColor: colors.accentText,
  },
});
