import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/tokens';
import { formatTime12 } from '@/lib/reminders';

import { haptic, Text } from './ui';

type Period = 'AM' | 'PM';

/** All half-hour slots for one half of the day, as 24-hour "HH:mm" values. */
function slotsFor(period: Period) {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const hour24 = period === 'AM' ? i : i + 12; // 12 AM = 00, 12 PM = 12
    for (const min of ['00', '30']) out.push(`${String(hour24).padStart(2, '0')}:${min}`);
  }
  return out;
}

/**
 * Reminder time picker: AM/PM toggle + half-hour grid (12:00, 12:30 … 11:30).
 * Value stays in 24-hour "HH:mm" so the API and schedules are unchanged.
 */
export function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const initial: Period = Number(value.split(':')[0]) >= 12 ? 'PM' : 'AM';
  const [period, setPeriod] = useState<Period>(initial);

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.toggle} accessibilityRole="tablist">
        {(['AM', 'PM'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              haptic.select();
              setPeriod(p);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: period === p }}
            style={[styles.toggleItem, period === p && { backgroundColor: colors.accent }]}
          >
            <Text variant="bodyStrong" color={period === p ? colors.accentText : colors.textSecondary}>
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.grid}>
        {slotsFor(period).map((t) => {
          const selected = value === t;
          return (
            <Pressable
              key={t}
              onPress={() => {
                haptic.select();
                onChange(t);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={formatTime12(t)}
              style={[styles.slot, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            >
              <Text variant="smallStrong" color={selected ? colors.accentText : colors.text}>
                {formatTime12(t).replace(/ (AM|PM)$/, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text variant="small" color={colors.muted}>
        Reminder at <Text variant="smallStrong" color={colors.accent}>{formatTime12(value)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  toggleItem: { width: 72, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '23%',
    flexGrow: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
