import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

import { haptic, Icon, IconName, Text } from './ui';

/** Selectable option card (single/multi select) used across onboarding & profile. */
export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  multi,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {icon && (
        <View style={[styles.optionIcon, selected && { backgroundColor: colors.accent }]}>
          <Icon name={icon} size={22} color={selected ? colors.accentText : colors.accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {!!subtitle && (
          <Text variant="small" color={colors.muted}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[multi ? styles.check : styles.radio, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {selected && <Icon name="checkmark" size={14} color={colors.accentText} />}
      </View>
    </Pressable>
  );
}

/** Image-led selectable tile (focus areas). */
export function ImageOption({
  title,
  imageUri,
  icon = 'body',
  selected,
  onPress,
}: {
  title: string;
  imageUri?: string | null;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, selected && styles.tileSelected, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient colors={[colors.surface3, colors.surface]} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Icon name={icon} size={30} color={selected ? colors.accent : colors.muted} />
        </LinearGradient>
      )}
      <LinearGradient colors={['transparent', 'rgba(7,14,22,0.9)']} style={StyleSheet.absoluteFill} />
      <Text variant="bodyStrong" style={{ position: 'absolute', left: 12, bottom: 10 }}>
        {title}
      </Text>
      {selected && (
        <View style={styles.tileCheck}>
          <Icon name="checkmark" size={14} color={colors.accentText} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(200,241,53,0.08)' },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDim,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 118,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tileSelected: { borderColor: colors.accent },
  tileCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
