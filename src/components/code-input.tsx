import type { ComponentRef } from 'react';

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

import { Text } from './ui';

const LENGTH = 6;

/**
 * Six boxes for an emailed code. A single hidden input does the typing, so
 * paste and the keyboard's one-time-code suggestion fill all boxes at once.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => input.current?.focus()} accessible={false}>
      <View style={styles.row}>
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && (i === value.length || (i === LENGTH - 1 && value.length === LENGTH));
          return (
            <View
              key={i}
              style={[
                styles.box,
                !!value[i] && styles.filled,
                active && styles.active,
                error && styles.error,
              ]}
            >
              <Text variant="h2" style={{ fontFamily: fonts.semibold }}>
                {value[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, '').slice(0, LENGTH);
          onChange(v);
          if (v.length === LENGTH) onComplete?.(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        autoFocus={autoFocus}
        caretHidden
        accessibilityLabel="6-digit code"
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1,
    maxWidth: 56,
    aspectRatio: 0.86,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filled: { borderColor: 'rgba(200,241,53,0.45)' },
  active: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  error: { borderColor: colors.danger },
  hidden: { position: 'absolute', opacity: 0.01, width: 1, height: 1, left: 0, top: 0 },
});
