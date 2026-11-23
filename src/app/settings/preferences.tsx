import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { OptionCard } from '@/components/options';
import { useOnboardingOptions, useProfile } from '@/lib/queries';
import { Button, Chip, ErrorState, Header, Row, Skeleton, Text } from '@/components/ui';

/** Edit goal, focus areas, experience, weekly target, equipment and units. */
export default function Preferences() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: p, isLoading } = useProfile();
  const { data: opts, error, refetch } = useOnboardingOptions();
  const [form, setForm] = useState<{
    goalId?: number;
    focusAreaIds: number[];
    experienceLevelId?: number | null;
    weeklyWorkoutDays?: number | null;
    equipmentIds: number[];
    preferredWeightUnit: 'KG' | 'LB';
    preferredDistanceUnit: 'KM' | 'MI';
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (p && !form)
      setForm({
        goalId: p.goal?.id,
        focusAreaIds: p.focusAreas.map((f) => f.id),
        experienceLevelId: p.experienceLevel?.id ?? null,
        weeklyWorkoutDays: p.weeklyWorkoutDays,
        equipmentIds: p.equipment.map((e) => e.id),
        preferredWeightUnit: p.preferredWeightUnit,
        preferredDistanceUnit: p.preferredDistanceUnit,
      });
  }, [p, form]);

  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/profile', form);
      // Recommendations depend on these preferences.
      await Promise.all(['profile', 'home', 'exercises', 'programs'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      router.back();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <Header title="My plan & units" />
        {error ? (
          <View style={{ padding: 20 }}>
            <ErrorState onRetry={() => refetch()} />
          </View>
        ) : isLoading || !form || !opts ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 10 }}>
              <Text variant="h3">Goal</Text>
              {opts.goals.map((g) => (
                <OptionCard key={g.id} title={g.name} selected={form.goalId === g.id} onPress={() => setForm({ ...form, goalId: g.id })} />
              ))}

              <Text variant="h3" style={{ marginTop: 18 }}>
                Focus areas
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {opts.focusAreas.map((f) => (
                  <Chip key={f.id} label={f.name} selected={form.focusAreaIds.includes(f.id)} onPress={() => setForm({ ...form, focusAreaIds: toggle(form.focusAreaIds, f.id) })} />
                ))}
              </Row>

              <Text variant="h3" style={{ marginTop: 18 }}>
                Experience
              </Text>
              {opts.experienceLevels.map((l) => (
                <OptionCard key={l.id} title={l.name} selected={form.experienceLevelId === l.id} onPress={() => setForm({ ...form, experienceLevelId: l.id })} />
              ))}

              <Text variant="h3" style={{ marginTop: 18 }}>
                Days per week
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {opts.weeklyFrequency.map((f) => (
                  <Chip key={f.value} label={f.label} selected={form.weeklyWorkoutDays === f.value} onPress={() => setForm({ ...form, weeklyWorkoutDays: f.value })} />
                ))}
              </Row>

              <Text variant="h3" style={{ marginTop: 18 }}>
                Equipment
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {opts.equipment.map((e) => (
                  <Chip key={e.id} label={e.name} selected={form.equipmentIds.includes(e.id)} onPress={() => setForm({ ...form, equipmentIds: toggle(form.equipmentIds, e.id) })} />
                ))}
              </Row>

              <Text variant="h3" style={{ marginTop: 18 }}>
                Units
              </Text>
              <Row gap={8}>
                {(['KG', 'LB'] as const).map((u) => (
                  <Chip key={u} label={u.toLowerCase()} selected={form.preferredWeightUnit === u} onPress={() => setForm({ ...form, preferredWeightUnit: u })} />
                ))}
                <View style={{ width: 14 }} />
                {(['KM', 'MI'] as const).map((u) => (
                  <Chip key={u} label={u.toLowerCase()} selected={form.preferredDistanceUnit === u} onPress={() => setForm({ ...form, preferredDistanceUnit: u })} />
                ))}
              </Row>
              {message && (
                <Text variant="small" color={colors.danger}>
                  {message}
                </Text>
              )}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Button title="Save changes" onPress={save} loading={saving} disabled={!form.goalId || !form.focusAreaIds.length} />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
