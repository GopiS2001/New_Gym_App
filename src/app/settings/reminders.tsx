import { useState } from 'react';

import type { Profile } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { useProfile } from '@/lib/queries';
import { cancelReminders, DAY_LABELS, deviceTimezone, registerPushToken, requestReminderPermission, scheduleWeeklyReminders } from '@/lib/reminders';
import { Button, Card, Chip, Header, haptic, Row, Skeleton, Text } from '@/components/ui';

const TIMES = ['06:00', '07:00', '08:00', '09:00', '12:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function Reminders() {
  const { data: p, isLoading } = useProfile();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <Header title="Workout reminders" />
        {isLoading || !p ? (
          <View style={{ padding: 20 }}>
            <Skeleton height={140} />
          </View>
        ) : (
          <RemindersForm p={p} />
        )}
      </SafeAreaView>
    </View>
  );
}

function RemindersForm({ p }: { p: Profile }) {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(p.reminders.enabled);
  const [days, setDays] = useState<number[]>(p.reminders.days);
  const [time, setTime] = useState(p.reminders.time ?? '07:00');
  const [granted, setGranted] = useState<boolean | null>(p.reminders.permissionGranted);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleEnabled = async (v: boolean) => {
    setEnabled(v);
    if (v && !days.length) setDays([1, 3, 5]);
    if (v && Platform.OS !== 'web') {
      // Ask only at the moment the member opts in; never repeatedly.
      const ok = await requestReminderPermission();
      setGranted(ok);
      if (ok) registerPushToken();
    }
    if (v && !days.length) setDays([1, 3, 5]);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/profile/notification-preferences', { enabled, days, time, timezone: deviceTimezone(), permissionGranted: granted });
      if (enabled && granted) await scheduleWeeklyReminders(days, time, p?.goal?.motivationMessage ?? undefined);
      else await cancelReminders();
      qc.invalidateQueries({ queryKey: ['profile'] });
      setMessage('Saved');
      haptic.success();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">Remind me to work out</Text>
                  <Text variant="small" color={colors.muted}>
                    Gentle nudges on your training days
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={toggleEnabled}
                  trackColor={{ true: colors.accent, false: colors.surface3 }}
                  thumbColor={enabled ? colors.accentText : colors.textSecondary}
                  accessibilityLabel="Workout reminders"
                />
              </Card>

              {enabled && granted === false && (
                <Card>
                  <Text variant="small" color={colors.warning}>
                    Notifications are blocked for FitFlow. Turn them on in your phone&apos;s settings to receive reminders — we won&apos;t ask again.
                  </Text>
                </Card>
              )}

              {enabled && (
                <>
                  <Text variant="h3">Days</Text>
                  <Row style={{ justifyContent: 'space-between' }}>
                    {DAY_LABELS.map((d, i) => {
                      const on = days.includes(i);
                      return (
                        <Pressable
                          key={d}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={d}
                          onPress={() => setDays(on ? days.filter((x) => x !== i) : [...days, i].sort())}
                          style={[styles.day, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                        >
                          <Text variant="smallStrong" color={on ? colors.accentText : colors.textSecondary}>
                            {d.slice(0, 2)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </Row>
                  <Text variant="h3">Time</Text>
                  <Row gap={8} style={{ flexWrap: 'wrap' }}>
                    {TIMES.map((t) => (
                      <Chip key={t} label={t} selected={time === t} onPress={() => setTime(t)} />
                    ))}
                  </Row>
                </>
              )}
              {message && (
                <Text variant="smallStrong" color={message === 'Saved' ? colors.accent : colors.danger}>
                  {message}
                </Text>
              )}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Button title="Save reminders" onPress={save} loading={saving} disabled={enabled && !days.length} />
            </View>
          </>
  );
}

const styles = StyleSheet.create({
  day: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
