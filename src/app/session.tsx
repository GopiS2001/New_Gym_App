import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useTicker } from '@/lib/hooks';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/lib/queries';
import { colors, fonts, radius } from '@/theme/tokens';
import { ProgressRing } from '@/components/charts';
import { Cover } from '@/components/content';
import { ExerciseVideo } from '@/components/video';
import { confirm, fmtDuration } from '@/lib/workout';
import { LocalExercise, LocalSet, useSession } from '@/stores/session';
import { Button, Card, Chip, EmptyState, FadeIn, haptic, Icon, IconButton, Row, Text } from '@/components/ui';

// ----------------------------------------------------------------------

export default function SessionScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const s = useSession();
  const active = s.active;
  const user = useAuth((x) => x.user);
  const { data: profile } = useProfile();
  const now = useTicker(!!active, 1000);
  const [finishOpen, setFinishOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active && !leaving) router.replace('/(tabs)');
  }, [active, leaving, router]);

  const ex = active?.exercises[active.currentIndex];
  const restLeft = active?.restEndsAt ? Math.max(0, Math.ceil((active.restEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (active?.restEndsAt && restLeft === 0) {
      haptic.success();
      s.skipRest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restLeft]);

  if (!active) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const elapsed = s.elapsedSeconds();
  void now;
  const paused = !!active.pausedAt;
  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  const discard = async () => {
    if (!(await confirm('Discard workout?', 'Everything logged in this workout will be deleted.', 'Discard'))) return;
    setLeaving(true);
    await s.discard();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {/* Top bar */}
        <Row style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, justifyContent: 'space-between' }}>
          <IconButton icon="chevron-down" label="Minimise workout" onPress={() => router.replace('/(tabs)')} />
          <View style={{ alignItems: 'center' }}>
            <Text variant="caption" color={colors.muted} numberOfLines={1}>
              {active.title.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: paused ? colors.warning : colors.text }} accessibilityLabel={`Elapsed ${fmtDuration(elapsed)}`}>
              {fmtDuration(elapsed)}
            </Text>
          </View>
          <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Resume workout' : 'Pause workout'} active={paused} onPress={paused ? s.resume : s.pause} />
        </Row>

        {!active.exercises.length ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <EmptyState icon="barbell-outline" title="Add your first exercise" message="Pick exercises from the library and log each set as you go." action="Add exercise" onAction={() => router.push('/pick-exercise')} />
            <Button title="Discard workout" variant="ghost" size="md" onPress={discard} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {/* Exercise strip */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                {active.exercises.map((e, i) => {
                  const target = e.targetSets ?? 0;
                  const done = target > 0 ? e.sets.length >= target : e.sets.length > 0;
                  return (
                    <Pressable
                      key={e.key}
                      onPress={() => s.setCurrent(i)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: i === active.currentIndex }}
                      accessibilityLabel={`${e.name}${done ? ', done' : ''}`}
                      style={[styles.pill, i === active.currentIndex && styles.pillActive]}
                    >
                      {done && <Icon name="checkmark-circle" size={14} color={i === active.currentIndex ? colors.accentText : colors.accent} />}
                      <Text variant="caption" color={i === active.currentIndex ? colors.accentText : colors.textSecondary} numberOfLines={1}>
                        {i + 1}. {e.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => router.push('/pick-exercise')} style={styles.pill} accessibilityRole="button" accessibilityLabel="Add exercise">
                  <Icon name="add" size={14} color={colors.accent} />
                  <Text variant="caption" color={colors.accent}>
                    Add
                  </Text>
                </Pressable>
              </ScrollView>

              {ex && (
                <FadeIn key={ex.key} distance={20}>
                  <ExercisePanel ex={ex} index={active.currentIndex} count={active.exercises.length} unit={profile?.preferredWeightUnit ?? 'KG'} restLeft={restLeft} restTotal={active.restTotal} />
                </FadeIn>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Row gap={10}>
                <IconButton icon="chevron-back" label="Previous exercise" onPress={() => s.setCurrent(active.currentIndex - 1)} size={54} />
                <Button
                  title={totalSets ? 'Finish Workout' : 'Discard'}
                  variant={totalSets ? 'primary' : 'secondary'}
                  onPress={() => (totalSets ? setFinishOpen(true) : discard())}
                  style={{ flex: 1 }}
                />
                <IconButton icon="chevron-forward" label="Next exercise" onPress={() => s.setCurrent(active.currentIndex + 1)} size={54} />
              </Row>
            </View>
          </>
        )}
      </SafeAreaView>

      <FinishSheet
        visible={finishOpen}
        onClose={() => setFinishOpen(false)}
        onDiscard={discard}
        onFinish={async (rating, notes) => {
          setLeaving(true);
          try {
            const res = await s.finish([rating ? `Rating: ${rating}/5` : '', notes].filter(Boolean).join('\n'));
            qc.invalidateQueries({ queryKey: ['home'] });
            qc.invalidateQueries({ queryKey: ['sessions'] });
            qc.invalidateQueries({ queryKey: ['progress'] });
            qc.invalidateQueries({ queryKey: ['program'] });
            qc.invalidateQueries({ queryKey: ['exercise-history'] });
            setFinishOpen(false);
            router.replace({
              pathname: '/session-complete',
              params: {
                title: res.summary.title,
                duration: String(res.summary.durationSeconds),
                exercises: String(res.summary.exercises),
                sets: String(res.summary.sets),
                volume: String(res.summary.volumeKg),
                rating: String(rating),
                synced: res.synced ? '1' : '0',
                name: user?.name?.split(' ')[0] ?? '',
              },
            });
          } catch (e) {
            setLeaving(false);
            throw e;
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

// ----------------------------------------------------------------------

function ExercisePanel({ ex, index, count, unit, restLeft, restTotal }: { ex: LocalExercise; index: number; count: number; unit: 'KG' | 'LB'; restLeft: number; restTotal: number }) {
  const s = useSession();
  const fields = ex.loggingFields;
  const last = ex.sets[ex.sets.length - 1];
  const targetReps = Number(String(ex.targetReps ?? '').match(/\d+/)?.[0] ?? '') || undefined;

  const [reps, setReps] = useState<number>(last?.reps ?? targetReps ?? 10);
  const [weight, setWeight] = useState<string>(last?.weightValue != null ? String(last.weightValue) : '');
  const [duration, setDuration] = useState<number>(last?.durationSeconds ?? ex.targetDuration ?? 30);
  const [distance, setDistance] = useState<string>(last?.distanceValue != null ? String(last.distanceValue) : '');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const flash = useState(() => new Animated.Value(0))[0];

  const has = (f: string) => fields.includes(f);
  const timed = has('duration') || has('hold');
  const restSeconds = ex.restSeconds ?? (has('rest') ? 90 : 60);
  const targetSets = ex.targetSets ?? null;

  const log = () => {
    const set: Omit<LocalSet, 'clientId' | 'setNumber' | 'completedAt'> = {};
    if (has('reps')) set.reps = reps;
    if (has('weight') && weight) {
      set.weightValue = Number(weight.replace(',', '.'));
      set.weightUnit = unit;
    }
    if (timed) set.durationSeconds = duration;
    if (has('distance') && distance) {
      set.distanceValue = Number(distance.replace(',', '.'));
      set.distanceUnit = 'KM';
    }
    if (has('rpe') && rpe) set.rpe = rpe;
    if (notes.trim()) set.notes = notes.trim();
    s.logSet(ex.key, set);
    setNotes('');
    haptic.success();
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();

    const nowDone = ex.sets.length + 1;
    if (targetSets && nowDone >= targetSets && index < count - 1) {
      s.startRest(restSeconds);
    } else if (!has('distance')) {
      s.startRest(restSeconds);
    }
  };

  const meta = [
    targetSets && `${targetSets} sets`,
    ex.targetReps && `${ex.targetReps} reps`,
    ex.targetDuration && `${ex.targetDuration}s`,
  ]
    .filter(Boolean)
    .join(' × ');

  return (
    <View style={{ gap: 14 }}>
      {/* Media card */}
      {ex.videoUrl ? (
        <View style={{ height: 210 }}>
          <ExerciseVideo uri={ex.videoUrl} posterUri={ex.imageUrl} mode="loop" style={StyleSheet.absoluteFill} rounded={radius.xl} />
          <Text variant="caption" color={colors.textSecondary} style={{ position: 'absolute', top: 12, left: 14 }}>
            EXERCISE {index + 1} OF {count}
          </Text>
        </View>
      ) : (
      <Cover uri={ex.imageUrl} style={{ height: 210 }} rounded={radius.xl}>
        <LinearGradient colors={['transparent', 'rgba(7,14,22,0.85)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent, opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }]} />
        <Text variant="caption" color={colors.textSecondary} style={{ position: 'absolute', top: 12, left: 14 }}>
          EXERCISE {index + 1} OF {count}
        </Text>
      </Cover>
      )}

      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text variant="h2">{ex.name}</Text>
          <Text variant="small" color={colors.muted}>
            {meta || 'Log as many sets as you like'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {!!ex.categoryLabel && (
            <Text variant="small" color={colors.textSecondary}>
              {ex.categoryLabel}
            </Text>
          )}
          <Text variant="smallStrong" color={colors.accent}>
            {restSeconds} sec rest
          </Text>
        </View>
      </Row>

      {/* Rest timer (design: player card) */}
      {restLeft > 0 ? (
        <Card highlight style={{ alignItems: 'center', gap: 12, paddingVertical: 22 }}>
          <Text variant="smallStrong" color={colors.textSecondary}>
            Rest
          </Text>
          <ProgressRing value={(restLeft / Math.max(1, restTotal)) * 100} size={120} stroke={10} label={fmtDuration(restLeft)} sublabel="remaining" />
          <Row gap={18}>
            <IconButton icon="remove" label="Rest 15 seconds less" onPress={() => s.startRest(Math.max(1, restLeft - 15))} />
            <Pressable onPress={s.skipRest} style={styles.playBtn} accessibilityRole="button" accessibilityLabel="Skip rest">
              <Icon name="play-skip-forward" size={24} color={colors.accentText} />
            </Pressable>
            <IconButton icon="add" label="Rest 15 seconds more" onPress={() => s.startRest(restLeft + 15)} />
          </Row>
        </Card>
      ) : (
        <Card style={{ gap: 16 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="h3">Set {ex.sets.length + 1}</Text>
            {targetSets ? (
              <Text variant="smallStrong" color={ex.sets.length >= targetSets ? colors.accent : colors.muted}>
                {ex.sets.length}/{targetSets} done
              </Text>
            ) : null}
          </Row>

          {has('reps') && <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={0} />}
          {has('weight') && (
            <NumberInput label={`Weight (${unit.toLowerCase()})`} value={weight} onChange={setWeight} placeholder="0" />
          )}
          {timed && <Stepper label={has('hold') && !has('duration') ? 'Hold (sec)' : 'Duration (sec)'} value={duration} onChange={setDuration} step={5} min={0} />}
          {has('distance') && <NumberInput label="Distance (km)" value={distance} onChange={setDistance} placeholder="0.0" />}
          {has('rpe') && (
            <View style={{ gap: 8 }}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Effort (RPE, optional)
              </Text>
              <Row gap={8} style={{ flexWrap: 'wrap' }}>
                {[6, 7, 8, 9, 10].map((v) => (
                  <Chip key={v} label={String(v)} selected={rpe === v} onPress={() => setRpe(rpe === v ? null : v)} />
                ))}
              </Row>
            </View>
          )}
          {has('notes') && (
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              style={styles.notes}
              accessibilityLabel="Set notes"
            />
          )}
          <Button title="Log set" icon="checkmark" onPress={log} />
        </Card>
      )}

      {/* Logged sets */}
      {!!ex.sets.length && (
        <View style={{ gap: 8 }}>
          <Text variant="h3">Logged sets</Text>
          {ex.sets.map((x) => (
            <Card key={x.clientId} style={{ paddingVertical: 12 }}>
              <Row>
                <View style={styles.setNum}>
                  <Text variant="smallStrong" color={colors.accentText}>
                    {x.setNumber}
                  </Text>
                </View>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {[
                    x.reps != null && `${x.reps} reps`,
                    x.weightValue != null && `${x.weightValue} ${x.weightUnit?.toLowerCase()}`,
                    x.durationSeconds != null && `${x.durationSeconds}s`,
                    x.distanceValue != null && `${x.distanceValue} km`,
                    x.rpe != null && `RPE ${x.rpe}`,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Done'}
                </Text>
                <Pressable onPress={() => s.deleteSet(ex.key, x.clientId)} hitSlop={10} accessibilityLabel={`Delete set ${x.setNumber}`}>
                  <Icon name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </Row>
            </Card>
          ))}
        </View>
      )}

      {!!ex.instructions?.length && (
        <Card>
          <Text variant="smallStrong" color={colors.textSecondary} style={{ marginBottom: 8 }}>
            Form cues
          </Text>
          {ex.instructions.slice(0, 3).map((t, i) => (
            <Text key={i} variant="small" color={colors.textSecondary} style={{ marginBottom: 4 }}>
              {i + 1}. {t}
            </Text>
          ))}
        </Card>
      )}

      <Pressable
        onPress={async () => {
          if (await confirm('Remove exercise?', `Remove ${ex.name} and its logged sets from this workout?`, 'Remove')) s.removeExercise(ex.key);
        }}
        style={{ alignSelf: 'center', padding: 8 }}
        accessibilityRole="button"
      >
        <Text variant="smallStrong" color={colors.danger}>
          Remove exercise
        </Text>
      </Pressable>
    </View>
  );
}

function Stepper({ label, value, onChange, step, min }: { label: string; value: number; onChange: (v: number) => void; step: number; min: number }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="smallStrong" color={colors.textSecondary}>
        {label}
      </Text>
      <Row gap={14}>
        <IconButton icon="remove" label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - step))} size={40} />
        <TextInput
          value={String(value)}
          onChangeText={(t) => onChange(Math.max(min, Number(t.replace(/\D/g, '')) || 0))}
          keyboardType="number-pad"
          style={styles.stepValue}
          accessibilityLabel={label}
          selectTextOnFocus
        />
        <IconButton icon="add" label={`Increase ${label}`} onPress={() => onChange(value + step)} size={40} />
      </Row>
    </Row>
  );
}

function NumberInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="smallStrong" color={colors.textSecondary}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.stepValue, { width: 110 }]}
        accessibilityLabel={label}
        selectTextOnFocus
      />
    </Row>
  );
}

// ----------------------------------------------------------------------

function FinishSheet({
  visible,
  onClose,
  onFinish,
  onDiscard,
}: {
  visible: boolean;
  onClose: () => void;
  onFinish: (rating: number, notes: string) => Promise<void>;
  onDiscard: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Keep training" />
      <View style={styles.sheet}>
        <Text variant="h2" style={{ textAlign: 'center' }}>
          Finish workout?
        </Text>
        <Text variant="small" color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>
          How did it feel?
        </Text>
        <Row gap={10} style={{ justifyContent: 'center', marginVertical: 18 }}>
          {stars.map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Icon name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? '#FFD233' : colors.muted} />
            </Pressable>
          ))}
        </Row>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.muted}
          style={[styles.notes, { minHeight: 70, textAlignVertical: 'top' }]}
          multiline
          accessibilityLabel="Workout note"
        />
        {error && (
          <Text variant="small" color={colors.danger} style={{ marginTop: 10 }}>
            {error}
          </Text>
        )}
        <View style={{ gap: 10, marginTop: 18 }}>
          <Button
            title="Save & finish"
            icon="trophy"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await onFinish(rating, notes);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save the workout');
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button title="Keep training" variant="secondary" size="md" onPress={onClose} />
          <Pressable onPress={onDiscard} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="button">
            <Text variant="smallStrong" color={colors.danger}>
              Discard workout
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 200,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  stepValue: {
    width: 76,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notes: {
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    padding: 12,
  },
  setNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
});
