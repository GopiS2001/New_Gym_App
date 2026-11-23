import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/stores/session';
import { colors, radius } from '@/theme/tokens';
import { AreaChart } from '@/components/charts';
import { useStartWorkout } from '@/lib/workout';
import type { ExerciseDetail, MemberCollection } from '@/lib/types';
import { Cover, difficultyLabel, ProgramCardView, SaveButton } from '@/components/content';
import { useExercise, useExerciseHistory, useExercisePrograms, useLibrary, useToggleSave } from '@/lib/queries';
import { Button, Card, Chip, EmptyState, ErrorState, FadeIn, Icon, IconButton, Row, Skeleton, Text, TextField } from '@/components/ui';

type Tab = 'about' | 'history' | 'programs';

export function toSessionExercise(ex: ExerciseDetail) {
  return {
    exerciseId: ex.id,
    name: ex.name,
    imageUrl: ex.imageUrl,
    loggingFields: ex.exerciseType.loggingFields,
    targetSets: null,
    targetReps: null,
    targetDuration: null,
    restSeconds: 90,
    instructions: ex.instructions,
    categoryLabel: ex.categories.map((c) => c.name).join(' & '),
  };
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('about');
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const { data: ex, isLoading, error, refetch } = useExercise(id);
  const save = useToggleSave('exercises');
  const active = useSession((s) => s.active);
  const addExercise = useSession((s) => s.addExercise);
  const startWorkout = useStartWorkout();

  const addToWorkout = () => {
    if (!ex) return;
    if (active) {
      addExercise(toSessionExercise(ex));
      router.push('/session');
    } else {
      startWorkout({ title: ex.name, exercises: [toSessionExercise(ex)] });
    }
  };

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={{ marginTop: 40 }}>
          <ErrorState message={(error as any)?.status === 404 ? 'This exercise is no longer available.' : errorMessage(error)} onRetry={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Cover uri={ex?.imageUrl} style={{ height: 360 }} rounded={0}>
          <LinearGradient colors={['rgba(11,21,32,0.5)', 'transparent', colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={{ position: 'absolute', left: 16, right: 16, top: 0 }}>
            <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
              <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
              <Row gap={8}>
                <IconButton
                  icon="share-outline"
                  label="Share"
                  onPress={() => ex && Share.share({ message: `${ex.name} on FitFlow — ${ex.shortDescription ?? ''}` })}
                />
                {ex && <SaveButton saved={ex.isSaved} onPress={() => save.mutate({ id: ex.id, saved: ex.isSaved })} />}
              </Row>
            </Row>
          </SafeAreaView>
        </Cover>

        <View style={{ paddingHorizontal: 20, marginTop: -40 }}>
          {isLoading || !ex ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={30} width="70%" />
              <Skeleton height={16} width="40%" />
              <Skeleton height={120} />
            </View>
          ) : (
            <FadeIn>
              {!ex.isAvailable && (
                <Card style={{ marginBottom: 12, borderColor: 'rgba(255,181,71,0.4)' }}>
                  <Text variant="small" color={colors.warning}>
                    This exercise has been retired from the catalogue. Your history is still here.
                  </Text>
                </Card>
              )}
              <Text variant="caption" color={colors.accent}>
                {ex.categories.map((c) => c.name.toUpperCase()).join(' · ')}
              </Text>
              <Text variant="h1" style={{ marginTop: 4 }}>
                {ex.name}
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 10 }}>
                <Chip small label={difficultyLabel(ex.difficulty)} selected />
                <Chip small label={ex.exerciseType.name} />
                {ex.equipment.map((e) => (
                  <Chip key={e.id} small label={e.name} />
                ))}
              </Row>

              {/* Tabs */}
              <View style={styles.tabs} accessibilityRole="tablist">
                {(['about', 'history', 'programs'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === t }}
                    style={[styles.tab, tab === t && { backgroundColor: colors.accent }]}
                  >
                    <Text variant="smallStrong" color={tab === t ? colors.accentText : colors.textSecondary} style={{ textTransform: 'capitalize' }}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'about' && <About ex={ex} />}
              {tab === 'history' && <History id={id} />}
              {tab === 'programs' && <Programs id={id} />}
            </FadeIn>
          )}
        </View>
      </ScrollView>

      {ex && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Row gap={10} style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <IconButton icon="albums-outline" label="Add to collection" onPress={() => setCollectionsOpen(true)} size={56} />
            <Button title={active ? 'Add to Workout' : 'Log Exercise'} icon={active ? 'add' : 'play'} onPress={addToWorkout} style={{ flex: 1 }} />
          </Row>
        </SafeAreaView>
      )}
      {ex && <CollectionSheet visible={collectionsOpen} onClose={() => setCollectionsOpen(false)} exerciseId={ex.id} />}
    </View>
  );
}

function About({ ex }: { ex: ExerciseDetail }) {
  return (
    <View style={{ gap: 4 }}>
      {!!ex.description && (
        <Text variant="body" color={colors.textSecondary}>
          {ex.description}
        </Text>
      )}
      <Section title="Muscles worked">
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {ex.primaryMuscles.map((m) => (
            <Chip key={`p${m.id}`} small label={m.name} selected />
          ))}
          {ex.secondaryMuscles.map((m) => (
            <Chip key={`s${m.id}`} small label={m.name} />
          ))}
        </Row>
        <Text variant="caption" color={colors.muted} style={{ marginTop: 6 }}>
          Highlighted = primary · outlined = secondary
        </Text>
      </Section>
      <Section title="How to do it">
        <View style={{ gap: 12 }}>
          {ex.instructions.map((step, i) => (
            <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={styles.stepNum}>
                <Text variant="smallStrong" color={colors.accentText}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {step}
              </Text>
            </Row>
          ))}
        </View>
      </Section>
      {!!ex.tips.length && (
        <Section title="Tips">
          {ex.tips.map((t, i) => (
            <Row key={i} gap={10} style={{ alignItems: 'flex-start', marginBottom: 8 }}>
              <Icon name="bulb-outline" size={18} color={colors.accent} />
              <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                {t}
              </Text>
            </Row>
          ))}
        </Section>
      )}
      {!!ex.commonMistakes.length && (
        <Section title="Common mistakes">
          {ex.commonMistakes.map((t, i) => (
            <Row key={i} gap={10} style={{ alignItems: 'flex-start', marginBottom: 8 }}>
              <Icon name="close-circle-outline" size={18} color={colors.danger} />
              <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }}>
                {t}
              </Text>
            </Row>
          ))}
        </Section>
      )}
      {ex.safetyNotes && (
        <Card style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
          <Icon name="shield-checkmark-outline" size={20} color={colors.warning} />
          <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
            {ex.safetyNotes}
          </Text>
        </Card>
      )}
      {!!ex.alternatives.length && <Alternatives items={ex.alternatives} />}
    </View>
  );
}

function Alternatives({ items }: { items: ExerciseDetail['alternatives'] }) {
  const router = useRouter();
  return (
    <Section title="Alternatives">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {items.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/exercise/${a.id}`)} accessibilityRole="button" accessibilityLabel={a.name} style={{ width: 140 }}>
            <Cover uri={a.imageUrl} style={{ height: 96 }} />
            <Text variant="smallStrong" numberOfLines={1} style={{ marginTop: 6 }}>
              {a.name}
            </Text>
            <Text variant="caption" color={colors.muted}>
              {difficultyLabel(a.difficulty)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

function History({ id }: { id: string }) {
  const { data, isLoading, error, refetch } = useExerciseHistory(id);
  if (isLoading) return <Skeleton height={200} />;
  if (error) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.logs.length) return <EmptyState icon="stats-chart" title="No history yet" message="Log this exercise in a workout to see your progress here." />;

  const metric = data.progress.some((p) => p.weight > 0) ? 'weight' : data.progress.some((p) => p.reps > 0) ? 'reps' : 'duration';
  const unit = metric === 'weight' ? 'kg' : metric === 'reps' ? 'reps' : 's';

  return (
    <View style={{ gap: 12 }}>
      {data.progress.length >= 2 && (
        <Card>
          <Text variant="h3" style={{ marginBottom: 10 }}>
            Best set · {metric}
          </Text>
          <AreaChart
            data={data.progress.map((p) => ({ label: new Date(p.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: p[metric] }))}
            unit={unit}
            height={160}
          />
        </Card>
      )}
      {data.logs.map((l) => (
        <Card key={l.sessionId}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <Text variant="bodyStrong">{l.title ?? 'Workout'}</Text>
            <Text variant="caption" color={colors.muted}>
              {new Date(l.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </Row>
          {l.sets.map((s) => (
            <Row key={s.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text variant="small" color={colors.muted}>
                Set {s.setNumber}
              </Text>
              <Text variant="smallStrong">
                {[s.reps != null && `${s.reps} reps`, s.weightValue != null && `${s.weightValue} ${s.weightUnit?.toLowerCase() ?? ''}`, s.durationSeconds != null && `${s.durationSeconds}s`, s.distanceValue != null && `${s.distanceValue} ${s.distanceUnit?.toLowerCase() ?? ''}`]
                  .filter(Boolean)
                  .join(' × ')}
              </Text>
            </Row>
          ))}
        </Card>
      ))}
    </View>
  );
}

function Programs({ id }: { id: string }) {
  const { data, isLoading } = useExercisePrograms(id);
  if (isLoading) return <Skeleton height={190} />;
  if (!data?.length) return <EmptyState icon="calendar-outline" title="Not in a program yet" message="This exercise isn't part of a published program." />;
  return (
    <View style={{ gap: 14 }}>
      {data.map((p) => (
        <ProgramCardView key={p.id} item={p} compact />
      ))}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text variant="h3" style={{ marginBottom: 12 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

// ----------------------------------------------------------------------

function CollectionSheet({ visible, onClose, exerciseId }: { visible: boolean; onClose: () => void; exerciseId: number }) {
  const qc = useQueryClient();
  const { data } = useLibrary();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<number | 'new' | null>(null);

  const add = async (c: MemberCollection) => {
    setBusy(c.id);
    try {
      const inIt = c.exercises.some((e) => e.id === exerciseId);
      if (inIt) await api.delete(`/library/collections/${c.id}/exercises/${exerciseId}`);
      else await api.post(`/library/collections/${c.id}/items`, { exerciseId });
      await qc.invalidateQueries({ queryKey: ['library'] });
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    setBusy('new');
    try {
      const c = await api.post<{ id: number }>('/library/collections', { name: name.trim() });
      await api.post(`/library/collections/${c.id}/items`, { exerciseId });
      setName('');
      await qc.invalidateQueries({ queryKey: ['library'] });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <Text variant="h2" style={{ marginBottom: 14 }}>
          Add to collection
        </Text>
        <ScrollView style={{ maxHeight: 300 }}>
          {data?.collections.map((c) => {
            const inIt = c.exercises.some((e) => e.id === exerciseId);
            return (
              <Pressable key={c.id} onPress={() => add(c)} style={styles.collectionRow} accessibilityRole="checkbox" accessibilityState={{ checked: inIt }}>
                <Icon name="albums" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{c.name}</Text>
                  <Text variant="caption" color={colors.muted}>
                    {c.itemCount} items
                  </Text>
                </View>
                <Icon name={inIt ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={inIt ? colors.accent : colors.muted} />
              </Pressable>
            );
          })}
          {!data?.collections.length && (
            <Text variant="small" color={colors.muted} style={{ marginBottom: 12 }}>
              You don&apos;t have any collections yet.
            </Text>
          )}
        </ScrollView>
        <View style={{ gap: 10, marginTop: 12 }}>
          <TextField label="New collection" value={name} onChangeText={setName} placeholder="e.g. Leg day favourites" />
          <Button title="Create & add" size="md" onPress={create} loading={busy === 'new'} disabled={!name.trim()} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginTop: 22,
    marginBottom: 18,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,21,32,0.96)', borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 12 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  collectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
});
