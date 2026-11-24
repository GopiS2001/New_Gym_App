import type { Profile } from '@/lib/types';
import type { IconName } from '@/components/ui';

import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { goBack } from '@/lib/nav';
import { colors } from '@/theme/tokens';
import { api, errorMessage } from '@/lib/api';
import { FOCUS_ICONS, GOAL_ICONS } from '@/lib/option-icons';
import { ImageOption, OptionCard } from '@/components/options';
import { useOnboardingOptions, useProfile } from '@/lib/queries';
import { Button, Chip, ErrorState, Header, Row, Skeleton, Text } from '@/components/ui';

type Section = 'goal' | 'focus' | 'experience' | 'weekly' | 'equipment' | 'units';

type Form = {
  goalId?: number;
  focusAreaIds: number[];
  experienceLevelId?: number | null;
  weeklyWorkoutDays?: number | null;
  equipmentIds: number[];
  preferredWeightUnit: 'KG' | 'LB';
  preferredDistanceUnit: 'KM' | 'MI';
};

/** Page title, prompt, and which profile fields the page saves. */
const SECTIONS: Record<Section, { title: string; prompt: string; fields: (keyof Form)[] }> = {
  goal: { title: 'Fitness goal', prompt: "What's your main goal?", fields: ['goalId'] },
  focus: { title: 'Focus areas', prompt: 'What do you want to focus on? Choose as many as you like.', fields: ['focusAreaIds'] },
  experience: { title: 'Training experience', prompt: 'How long have you been training?', fields: ['experienceLevelId'] },
  weekly: { title: 'Weekly target', prompt: 'How many days a week would you like to work out?', fields: ['weeklyWorkoutDays'] },
  equipment: { title: 'Equipment', prompt: 'What equipment do you have? Select all that apply.', fields: ['equipmentIds'] },
  units: { title: 'Units', prompt: 'How should weights and distances be shown?', fields: ['preferredWeightUnit', 'preferredDistanceUnit'] },
};

const toForm = (p: Profile): Form => ({
  goalId: p.goal?.id,
  focusAreaIds: p.focusAreas.map((f) => f.id),
  experienceLevelId: p.experienceLevel?.id ?? null,
  weeklyWorkoutDays: p.weeklyWorkoutDays,
  equipmentIds: p.equipment.map((e) => e.id),
  preferredWeightUnit: p.preferredWeightUnit,
  preferredDistanceUnit: p.preferredDistanceUnit,
});

const same = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? [...a].sort().join() === [...b].sort().join() : a === b;

const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** One editable part of "My plan" (goal, focus areas, experience, …) per page. */
export default function PlanSection() {
  const { section: raw } = useLocalSearchParams<{ section: string }>();
  const section: Section = raw && raw in SECTIONS ? (raw as Section) : 'goal';
  const meta = SECTIONS[section];

  const qc = useQueryClient();
  const { data: p, isLoading } = useProfile();
  const { data: opts, error, refetch } = useOnboardingOptions();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Initialise the editable copy once the profile has loaded (render-time, no effect).
  if (p && !form) setForm(toForm(p));

  const original = p ? toForm(p) : null;
  const changed = !!form && !!original && meta.fields.some((k) => !same(form[k], original[k]));
  const valid = !!form && (section !== 'goal' || !!form.goalId) && (section !== 'focus' || form.focusAreaIds.length > 0);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/profile', Object.fromEntries(meta.fields.map((k) => [k, form[k]])));
      // Recommendations depend on these preferences.
      await Promise.all(['profile', 'home', 'exercises', 'programs'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      goBack('/profile');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Form>) => form && setForm({ ...form, ...patch });

  const body = () => {
    if (!form || !opts) return null;
    switch (section) {
      case 'goal':
        return (
          <View style={{ gap: 12 }}>
            {opts.goals.map((g) => (
              <OptionCard key={g.id} title={g.name} subtitle={g.description} icon={GOAL_ICONS[g.slug] ?? 'flag'} selected={form.goalId === g.id} onPress={() => set({ goalId: g.id })} />
            ))}
          </View>
        );
      case 'focus':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {opts.focusAreas.map((f) => (
              <ImageOption
                key={f.id}
                title={f.name}
                imageUri={f.imageUrl}
                icon={FOCUS_ICONS[f.slug] ?? 'body'}
                selected={form.focusAreaIds.includes(f.id)}
                onPress={() => set({ focusAreaIds: toggle(form.focusAreaIds, f.id) })}
              />
            ))}
          </View>
        );
      case 'experience':
        return (
          <View style={{ gap: 12 }}>
            {opts.experienceLevels.map((l) => (
              <OptionCard key={l.id} title={l.name} subtitle={l.description} icon="trending-up" selected={form.experienceLevelId === l.id} onPress={() => set({ experienceLevelId: l.id })} />
            ))}
          </View>
        );
      case 'weekly':
        return (
          <View style={{ gap: 12 }}>
            {opts.weeklyFrequency.map((f) => (
              <OptionCard key={f.value} title={f.label} icon="calendar" selected={form.weeklyWorkoutDays === f.value} onPress={() => set({ weeklyWorkoutDays: f.value })} />
            ))}
          </View>
        );
      case 'equipment':
        return (
          <View style={{ gap: 18 }}>
            {!!opts.equipmentGroups.length && (
              <View style={{ gap: 12 }}>
                <Text variant="caption" color={colors.muted}>
                  QUICK SELECT
                </Text>
                {opts.equipmentGroups.map((g) => {
                  const all = g.equipmentIds.length > 0 && g.equipmentIds.every((id) => form.equipmentIds.includes(id));
                  return (
                    <OptionCard
                      key={g.id}
                      title={g.name}
                      subtitle={`${g.equipmentIds.length} items included`}
                      icon={(g.slug === 'full-gym' ? 'business' : 'home') as IconName}
                      selected={all}
                      multi
                      onPress={() =>
                        set({
                          equipmentIds: all
                            ? form.equipmentIds.filter((id) => !g.equipmentIds.includes(id))
                            : [...new Set([...form.equipmentIds, ...g.equipmentIds])],
                        })
                      }
                    />
                  );
                })}
              </View>
            )}
            <View style={{ gap: 12 }}>
              <Text variant="caption" color={colors.muted}>
                ITEMS · {form.equipmentIds.length} SELECTED
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {opts.equipment.map((e) => (
                  <Chip key={e.id} label={e.name} selected={form.equipmentIds.includes(e.id)} onPress={() => set({ equipmentIds: toggle(form.equipmentIds, e.id) })} />
                ))}
              </Row>
            </View>
          </View>
        );
      case 'units':
        return (
          <View style={{ gap: 12 }}>
            <Text variant="caption" color={colors.muted}>
              WEIGHT
            </Text>
            <OptionCard title="Kilograms (kg)" icon="barbell" selected={form.preferredWeightUnit === 'KG'} onPress={() => set({ preferredWeightUnit: 'KG' })} />
            <OptionCard title="Pounds (lb)" icon="barbell" selected={form.preferredWeightUnit === 'LB'} onPress={() => set({ preferredWeightUnit: 'LB' })} />
            <Text variant="caption" color={colors.muted} style={{ marginTop: 8 }}>
              DISTANCE
            </Text>
            <OptionCard title="Kilometres (km)" icon="walk" selected={form.preferredDistanceUnit === 'KM'} onPress={() => set({ preferredDistanceUnit: 'KM' })} />
            <OptionCard title="Miles (mi)" icon="walk" selected={form.preferredDistanceUnit === 'MI'} onPress={() => set({ preferredDistanceUnit: 'MI' })} />
          </View>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <Header title={meta.title} />
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
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 18 }}>
              <Text variant="body" color={colors.textSecondary}>
                {meta.prompt}
              </Text>
              {body()}
              {message && (
                <Text variant="small" color={colors.danger}>
                  {message}
                </Text>
              )}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
              <Button title="Save" onPress={save} loading={saving} disabled={!changed || !valid} />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
