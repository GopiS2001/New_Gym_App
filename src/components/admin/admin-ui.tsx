import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { IconName } from "@/components/ui";

import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mediaUrl } from "@/lib/media";
import { colors, fonts, radius } from "@/theme/tokens";
import {
  FadeIn,
  haptic,
  Icon,
  IconButton,
  Text,
  usePressScale,
} from "@/components/ui";
import { useReducedMotion } from "@/lib/motion";

import { VideoFrame } from "../video-frame";
import { useSidebar } from "./sidebar";
import { useAdminBarSpace } from "./admin-tab-bar";
import { useViewMode } from "@/stores/view-mode";

/** Admin page shell: menu (or back) button, title, optional right action. */
export function AdminScreen({
  title,
  back,
  right,
  children,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const setOpen = useSidebar((s) => s.setOpen);
  const setMode = useViewMode((s) => s.setMode);
  const toApp = (
    <IconButton
      icon="swap-horizontal"
      label="Switch to App view"
      onPress={() => {
        haptic.medium();
        setMode("app");
        router.replace("/(tabs)");
      }}
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          {back ? (
            <IconButton
              icon="chevron-back"
              label="Go back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/admin")
              }
            />
          ) : (
            <IconButton
              icon="menu"
              label="Open menu"
              onPress={() => {
                haptic.select();
                setOpen(true);
              }}
            />
          )}
          <Text
            variant="h3"
            numberOfLines={1}
            style={{ flex: 1, textAlign: "center" }}
          >
            {title}
          </Text>
          <View style={{ minWidth: 44, alignItems: "flex-end" }}>
            {right ?? (back ? null : toApp)}
          </View>
        </View>
        {/* Each admin screen rises and fades in, like the member app. */}
        <FadeIn distance={18} style={{ flex: 1 }}>
          {children}
        </FadeIn>
      </SafeAreaView>
    </View>
  );
}

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  PUBLISHED: { fg: colors.accent, bg: "rgba(200,241,53,0.14)" },
  ACTIVE: { fg: colors.accent, bg: "rgba(200,241,53,0.14)" },
  DRAFT: { fg: colors.textSecondary, bg: colors.surface2 },
  INACTIVE: { fg: colors.textSecondary, bg: colors.surface2 },
  ARCHIVED: { fg: colors.warning, bg: "rgba(255,184,0,0.14)" },
  SUSPENDED: { fg: colors.danger, bg: "rgba(255,93,99,0.14)" },
  FEATURED: { fg: "#FFD166", bg: "rgba(255,209,102,0.14)" },
  ONLINE: { fg: "#3DDC84", bg: "rgba(61,220,132,0.14)" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.DRAFT;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: c.bg,
      }}
    >
      <Text
        variant="caption"
        color={c.fg}
        style={{ fontFamily: fonts.semibold }}
      >
        {status[0] + status.slice(1).toLowerCase()}
      </Text>
    </View>
  );
}

/** Lime on/off switch with a label for screen readers. */
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: colors.surface3, true: colors.accent }}
      thumbColor={
        Platform.OS === "android"
          ? value
            ? "#FFFFFF"
            : colors.muted
          : undefined
      }
      {...(Platform.OS === "web"
        ? ({ activeThumbColor: "#FFFFFF" } as object)
        : {})}
    />
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{
          flex: 1,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: 15,
        }}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCapitalize="none"
      />
      {!!value && (
        <IconButton
          icon="close"
          label="Clear search"
          size={30}
          onPress={() => onChange("")}
        />
      )}
    </View>
  );
}

/** Thumbnail + title + subtitle + right-side controls; tap opens the item. */
export function AdminRow({
  title,
  subtitle,
  imageUri,
  videoUri,
  icon,
  onPress,
  badge,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  /** Used for the thumbnail (first frame) when there is no image. */
  videoUri?: string | null;
  icon: IconName;
  onPress?: () => void;
  badge?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const press = usePressScale(0.97);
  return (
    <FadeIn auto distance={12}>
      <Animated.View
        style={[styles.row, { transform: [{ scale: press.scale }] }, style]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          style={styles.rowMain}
        >
          <View style={styles.thumb}>
            {imageUri ? (
              <Image
                source={{ uri: mediaUrl(imageUri) ?? undefined }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Icon name={icon} size={20} color="rgba(200,241,53,0.55)" />
            )}
            {!imageUri && !!videoUri && <VideoFrame uri={videoUri} />}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text variant="caption" color={colors.muted} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            {badge}
          </View>
        </Pressable>
        {right}
      </Animated.View>
    </FadeIn>
  );
}

export function Fab({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const space = useAdminBarSpace();
  const reduce = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(reduce ? 1 : 0));
  // Springs up into place a moment after the screen appears.
  useEffect(() => {
    if (reduce) return pop.setValue(1);
    Animated.spring(pop, {
      toValue: 1,
      delay: 220,
      friction: 6,
      tension: 90,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [pop, reduce]);
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.fabWrap,
        {
          bottom: space + 14,
          opacity: pop,
          transform: [
            {
              scale: pop.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
            {
              translateY: pop.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          haptic.medium();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.fab,
          { transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Icon name="add" size={22} color={colors.accentText} />
        <Text variant="bodyStrong" color={colors.accentText}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Green dot that gently pulses while a member is online (still when offline). */
export function OnlineDot({
  online,
  size = 8,
}: {
  online: boolean;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!online || reduce) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [online, reduce, pulse]);
  const color = online ? "#3DDC84" : colors.muted;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {online && !reduce && (
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 2.6],
                }),
              },
            ],
          }}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  fabWrap: { position: "absolute", right: 20 },
  fab: {
    height: 54,
    paddingHorizontal: 20,
    borderRadius: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
});
