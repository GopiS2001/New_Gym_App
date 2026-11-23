import type { IconName } from '@/components/ui';
import type { OnboardingAnswers, OnboardingOptions } from '@/lib/types';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useOnboardingOptions } from '@/lib/queries';
import { useOnboarding } from '@/stores/onboarding';
import { colors, fonts, radius } from '@/theme/tokens';
import { ImageOption, OptionCard } from '@/components/options';
import { DAY_LABELS, deviceTimezone, requestReminderPermission, scheduleWeeklyReminders } from '@/lib/reminders';
import { Button, Card, Chip, ErrorState, haptic, Icon, IconButton, Skeleton, Text, TextField } from '@/components/ui';

// ----------------------------------------------------------------------

const GOAL_ICONS: Record<string, IconName> = {
  'build-muscle': 'barbell',
  'gain-strength': 'trophy',
  'lose-weight': 'flame',
  'fundamental-conditioning': 'heart',
  'sports-performance': 'speedometer',
};
const ACTIVITY_ICONS: Record<string, IconName> = {
  'log-my-workouts': 'create',
  'follow-workout-programs': 'calendar',
  'learn-new-exercises': 'school',
};
const FOCUS_ICONS: Record<string, IconName> = {
  chest: 'shield',
  back: 'git-merge',
  arms: 'hand-left',
  shoulders: 'triangle',
  abs: 'grid',
  legs: 'walk',
  glutes: 'ellipse',
  'full-body': 'body',
};

type StepKey =
  | 'gender'
  | 'goal'
  | 'motivation'
  | 'activity'
  | 'focus'
  | 'reasons'
  | 'experience'
  | 'frequency'
  | 'reminders'
  | 'equipment'
  | 'weight'
  | 'account'
  | 'complete';

const STEPS: StepKey[] = ['gender', 'goal', 'motivation', 'activity', 'focus', 'reasons', 'experience', 'frequency', 'reminders', 'equipment', 'weight', 'account', 'complete'];

const OPTIONAL: StepKey[] = ['gender', 'reasons', 'weight', 'activity'];

const TIMES = ['06:00', '07:00', '08:00', '12:00', '17:00', '18:00', '19:00', '20:00'];

// ----------------------------------------------------------------------

export default function Onboarding() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: opts, isLoading, error, refetch } = useOnboardingOptions();
  const { step, answers, setAnswers, goTo, syncRemote, reset, hydrated } = useOnboarding();
  const status = useAuth((s) => s.status);
  const register = useAuth((s) => s.register);
  const refreshMe = useAuth((s) => s.refreshMe);
  const [summary, setSummary] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Signed-in members skip the account step.
  const steps = useMemo(() => STEPS.filter((s) => !(s === 'account' && status === 'authed')), [status]);
  const index = Math.min(step, steps.length - 1);
  const key = steps[index];

  const anim = useState(() => new Animated.Value(1))[0];
  const [dir, setDir] = useState(1);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, anim]);

  const go = (next: number) => {
    setDir(next > index ? 1 : -1);
    goTo(Math.max(0, Math.min(next, steps.length - 1)));
    if (status === 'authed') syncRemote(steps[next] ?? 'complete');
  };

  const valid = (() => {
    switch (key) {
      case 'goal':
        return !!answers.goalId;
      case 'focus':
        return !!answers.focusAreaIds?.length;
      case 'experience':
        return !!answers.experienceLevelId;
      case 'frequency':
        return !!answers.weeklyWorkoutDays;
      case 'reminders':
        return answers.reminders !== undefined && (!answers.reminders.enabled || !!answers.reminders.days?.length);
      default:
        return true;
    }
  })();

  /** Completes onboarding on the server (used by signed-in members). */
  const completeServer = async () => {
    const res = await api.post<{ summary: any }>('/onboarding/complete', { answers: { ...answers, reminders: answers.reminders && { ...answers.reminders, timezone: deviceTimezone() } } });
    if (answers.reminders?.enabled && answers.reminders.days?.length && answers.reminders.permissionGranted) {
      const goal = opts?.goals.find((g) => g.id === answers.goalId);
      await scheduleWeeklyReminders(answers.reminders.days, answers.reminders.time ?? '07:00', goal?.motivationMessage ?? undefined);
    }
    await refreshMe();
    qc.invalidateQueries();
    setSummary(res.summary);
  };

  const next = async () => {
    haptic.light();
    if (key === 'weight' && status === 'authed') {
      setSubmitting(true);
      try {
        await completeServer();
        go(index + 1);
      } catch (e) {
        alertError(e);
      } finally {
        setSubmitting(false);
      }
      return;
    }
    go(index + 1);
  };

  const finish = async () => {
    await reset();
    router.replace('/(tabs)');
  };

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  const progress = (index + 1) / steps.length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {key !== 'complete' && (
          <View style={styles.top}>
            <IconButton icon="chevron-back" label="Back" onPress={() => (index === 0 ? router.back() : go(index - 1))} />
            <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: index + 1 }}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            {OPTIONAL.includes(key) ? (
              <Pressable onPress={() => go(index + 1)} hitSlop={10} accessibilityRole="button" style={{ minWidth: 44, alignItems: 'flex-end' }}>
                <Text variant="smallStrong" color={colors.textSecondary}>
                  Skip
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>
        )}

        <Animated.View
          style={{
            flex: 1,
            opacity: anim,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [28 * dir, 0] }) }],
          }}
        >
          {isLoading || !opts ? (
            <View style={{ padding: 20, gap: 14 }}>
              {error ? (
                <ErrorState message="We couldn't load the setup questions." onRetry={() => refetch()} />
              ) : (
                [0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} />)
              )}
            </View>
          ) : key === 'account' ? (
            <AccountStep
              answers={answers}
              onCreated={async () => {
                setSubmitting(true);
                try {
                  await completeServer();
                  go(index + 1);
                } catch (e) {
                  alertError(e);
                } finally {
                  setSubmitting(false);
                }
              }}
              register={register}
            />
          ) : key === 'complete' ? (
            <CompleteStep summary={summary} answers={answers} opts={opts} onDone={finish} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <StepBody stepKey={key} opts={opts} answers={answers} setAnswers={setAnswers} />
            </ScrollView>
          )}
        </Animated.View>

        {key !== 'account' && key !== 'complete' && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 8 }}>
            <Button title="Continue" onPress={next} disabled={!valid} loading={submitting} />
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function alertError(e: unknown) {
  const msg = e instanceof Error ? e.message : 'Something went wrong';
  if (Platform.OS === 'web') globalThis.alert?.(msg);
  else Alert.alert('Could not continue', msg);
}

// ----------------------------------------------------------------------

function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 22, gap: 6 }}>
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>
      {subtitle && (
        <Text variant="body" color={colors.textSecondary}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function StepBody({
  stepKey,
  opts,
  answers,
  setAnswers,
}: {
  stepKey: StepKey;
  opts: OnboardingOptions;
  answers: OnboardingAnswers;
  setAnswers: (p: Partial<OnboardingAnswers>) => void;
}) {
  const toggle = (list: number[] | undefined, id: number) => (list?.includes(id) ? list.filter((x) => x !== id) : [...(list ?? []), id]);

  switch (stepKey) {
    case 'gender': {
      const selected = opts.genders.find((g) => g.id === answers.genderOptionId);
      return (
        <>
          <Title title="How should we personalise your experience?" subtitle="Optional — it never limits your recommendations." />
          <View style={{ gap: 12 }}>
            {opts.genders.map((g) => (
              <OptionCard key={g.id} title={g.label} selected={answers.genderOptionId === g.id} onPress={() => setAnswers({ genderOptionId: g.id })} />
            ))}
            {selected?.allowsFreeText && (
              <TextField
                label="How do you describe yourself? (optional)"
                value={answers.genderCustom ?? ''}
                onChangeText={(v) => setAnswers({ genderCustom: v })}
                maxLength={80}
              />
            )}
          </View>
        </>
      );
    }
    case 'goal':
      return (
        <>
          <Title title="What's your goal?" subtitle="Pick your main focus. You can change it anytime." />
          <View style={{ gap: 12 }}>
            {opts.goals.map((g) => (
              <OptionCard
                key={g.id}
                title={g.name}
                subtitle={g.description}
                icon={GOAL_ICONS[g.slug] ?? 'flag'}
                selected={answers.goalId === g.id}
                onPress={() => setAnswers({ goalId: g.id })}
              />
            ))}
          </View>
        </>
      );
    case 'motivation': {
      const goal = opts.goals.find((g) => g.id === answers.goalId);
      return <MotivationStep message={goal?.motivationMessage ?? 'Your progress starts with your next workout.'} goal={goal?.name} />;
    }
    case 'activity':
      return (
        <>
          <Title title="What would you like to do most?" subtitle="We'll tailor Home and Explore to it." />
          <View style={{ gap: 12 }}>
            {opts.activities.map((a) => (
              <OptionCard
                key={a.id}
                title={a.label}
                subtitle={a.description}
                icon={ACTIVITY_ICONS[a.slug] ?? 'sparkles'}
                selected={answers.activityOptionId === a.id}
                onPress={() => setAnswers({ activityOptionId: a.id })}
              />
            ))}
          </View>
        </>
      );
    case 'focus':
      return (
        <>
          <Title title="What do you want to focus on?" subtitle="Choose as many as you like." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {opts.focusAreas.map((f) => (
              <ImageOption
                key={f.id}
                title={f.name}
                imageUri={f.imageUrl}
                icon={FOCUS_ICONS[f.slug] ?? 'body'}
                selected={!!answers.focusAreaIds?.includes(f.id)}
                onPress={() => setAnswers({ focusAreaIds: toggle(answers.focusAreaIds, f.id) })}
              />
            ))}
          </View>
        </>
      );
    case 'reasons':
      return (
        <>
          <Title title="Why do you want to track your workouts?" subtitle="Pick any that apply." />
          <View style={{ gap: 12 }}>
            {opts.motivations.map((m) => (
              <OptionCard
                key={m.id}
                multi
                title={m.label}
                selected={!!answers.motivationOptionIds?.includes(m.id)}
                onPress={() => setAnswers({ motivationOptionIds: toggle(answers.motivationOptionIds, m.id) })}
              />
            ))}
          </View>
        </>
      );
    case 'experience':
      return (
        <>
          <Title title="What's your experience with strength training?" />
          <View style={{ gap: 12 }}>
            {opts.experienceLevels.map((l) => (
              <OptionCard key={l.id} title={l.name} subtitle={l.description} selected={answers.experienceLevelId === l.id} onPress={() => setAnswers({ experienceLevelId: l.id })} />
            ))}
          </View>
        </>
      );
    case 'frequency':
      return (
        <>
          <Title title="How many days a week would you like to work out?" subtitle="We'll suggest a schedule — you're never locked in." />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {opts.weeklyFrequency.map((f) => {
              const selected = answers.weeklyWorkoutDays === f.value;
              return (
                <Pressable
                  key={f.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={f.label}
                  onPress={() => {
                    haptic.select();
                    setAnswers({ weeklyWorkoutDays: f.value });
                  }}
                  style={[styles.dayTile, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                >
                  <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: selected ? colors.accentText : colors.text }}>{f.value === 7 ? '7' : f.value}</Text>
                  <Text variant="caption" color={selected ? colors.accentText : colors.muted}>
                    {f.value === 7 ? 'Every day' : f.value === 1 ? 'day' : 'days'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      );
    case 'reminders':
      return <RemindersStep answers={answers} setAnswers={setAnswers} />;
    case 'equipment': {
      const groups = opts.equipmentGroups;
      const equipIds = answers.equipmentIds ?? [];
      return (
        <>
          <Title title="What equipment do you have?" subtitle="Select all that apply." />
          <View style={{ gap: 12, marginBottom: 18 }}>
            {groups.map((g) => {
              const selected = !!answers.equipmentGroupIds?.includes(g.id);
              return (
                <OptionCard
                  key={g.id}
                  multi
                  icon={g.slug === 'full-gym' ? 'business' : 'home'}
                  title={g.name}
                  subtitle={`${g.equipmentIds.length} items included`}
                  selected={selected}
                  onPress={() =>
                    setAnswers({
                      equipmentGroupIds: toggle(answers.equipmentGroupIds, g.id),
                      equipmentIds: selected ? equipIds : [...new Set([...equipIds, ...g.equipmentIds])],
                    })
                  }
                />
              );
            })}
          </View>
          <Text variant="smallStrong" color={colors.textSecondary} style={{ marginBottom: 10 }}>
            Or pick individual items
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {opts.equipment.map((e) => (
              <Chip key={e.id} label={e.name} selected={equipIds.includes(e.id)} onPress={() => setAnswers({ equipmentIds: toggle(equipIds, e.id) })} />
            ))}
          </View>
        </>
      );
    }
    case 'weight':
      return <WeightStep answers={answers} setAnswers={setAnswers} />;
    default:
      return null;
  }
}

// ----------------------------------------------------------------------

function MotivationStep({ message, goal }: { message: string; goal?: string }) {
  const scale = useState(() => new Animated.Value(0.85))[0];
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [scale]);
  return (
    <View style={{ alignItems: 'center', paddingTop: 40, gap: 22 }}>
      <Animated.View style={[styles.motivationOrb, { transform: [{ scale }] }]}>
        <Icon name="flash" size={64} color={colors.accent} />
      </Animated.View>
      {goal && (
        <Text variant="caption" color={colors.accent}>
          {goal.toUpperCase()}
        </Text>
      )}
      <Text variant="display" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        A few more questions and your plan is ready.
      </Text>
    </View>
  );
}

function RemindersStep({ answers, setAnswers }: { answers: OnboardingAnswers; setAnswers: (p: Partial<OnboardingAnswers>) => void }) {
  const r = answers.reminders;
  const [denied, setDenied] = useState(false);

  const enable = async () => {
    if (r?.enabled) return;
    // Select immediately; the permission prompt follows and never blocks the choice.
    setAnswers({
      reminders: { enabled: true, days: r?.days?.length ? r.days : [1, 3, 5], time: r?.time ?? '07:00', permissionGranted: null, timezone: deviceTimezone() },
    });
    const granted = await requestReminderPermission();
    setDenied(!granted && Platform.OS !== 'web');
    const latest = useOnboarding.getState().answers.reminders;
    if (latest?.enabled) setAnswers({ reminders: { ...latest, permissionGranted: granted } });
  };

  return (
    <>
      <Title title="Would you like us to remind you to work out?" subtitle="You can change reminders anytime in settings." />
      <View style={{ gap: 12 }}>
        <OptionCard icon="notifications" title="Yes, remind me" selected={!!r?.enabled} onPress={enable} />
        <OptionCard icon="notifications-off" title="No thanks" selected={r?.enabled === false} onPress={() => setAnswers({ reminders: { enabled: false } })} />
      </View>
      {denied && (
        <Card style={{ marginTop: 16 }}>
          <Text variant="small" color={colors.warning}>
            Notifications are turned off for FitFlow. We saved your schedule — enable notifications in system settings to receive reminders.
          </Text>
        </Card>
      )}
      {r?.enabled && (
        <View style={{ marginTop: 24, gap: 14 }}>
          <Text variant="smallStrong" color={colors.textSecondary}>
            Which days?
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {DAY_LABELS.map((d, i) => {
              const on = !!r.days?.includes(i);
              return (
                <Pressable
                  key={d}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={d}
                  onPress={() => {
                    haptic.select();
                    setAnswers({ reminders: { ...r, days: on ? r.days!.filter((x) => x !== i) : [...(r.days ?? []), i].sort() } });
                  }}
                  style={[styles.dayCircle, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                >
                  <Text variant="smallStrong" color={on ? colors.accentText : colors.textSecondary}>
                    {d.slice(0, 2)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="smallStrong" color={colors.textSecondary} style={{ marginTop: 6 }}>
            What time?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} selected={r.time === t} onPress={() => setAnswers({ reminders: { ...r, time: t } })} />
            ))}
          </View>
        </View>
      )}
    </>
  );
}

function WeightStep({ answers, setAnswers }: { answers: OnboardingAnswers; setAnswers: (p: Partial<OnboardingAnswers>) => void }) {
  const unit = answers.weight?.unit ?? 'KG';
  const [text, setText] = useState(answers.weight?.value ? String(answers.weight.value) : '');
  const update = (v: string, u = unit) => {
    setText(v);
    const n = Number(v.replace(',', '.'));
    setAnswers({ weight: n > 0 && n < 700 ? { value: n, unit: u } : null });
  };
  return (
    <>
      <Title title="How much do you weigh?" subtitle="Optional. It helps track progress and is stored as history — never overwritten." />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 }}>
        {(['KG', 'LB'] as const).map((u) => (
          <Chip key={u} label={u.toLowerCase()} selected={unit === u} onPress={() => update(text, u)} />
        ))}
      </View>
      <View style={styles.weightBox}>
        <TextInput
          value={text}
          onChangeText={(v) => update(v)}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.surface3}
          style={{ fontFamily: fonts.extrabold, fontSize: 64, color: colors.text, textAlign: 'center', minWidth: 140 }}
          accessibilityLabel={`Weight in ${unit.toLowerCase()}`}
          maxLength={5}
        />
        <Text variant="h2" color={colors.muted}>
          {unit.toLowerCase()}
        </Text>
      </View>
    </>
  );
}

// ----------------------------------------------------------------------

function AccountStep({
  answers,
  register,
  onCreated,
}: {
  answers: OnboardingAnswers;
  register: ReturnType<typeof useAuth.getState>['register'];
  onCreated: () => Promise<void>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++;
    return s;
  })();

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      e.password = 'Use 8+ characters with upper and lower case letters and a number';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!terms) e.terms = 'Please accept the Terms and Privacy Policy';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim(), name: form.name.trim(), acceptTerms: true, onboarding: answers });
      await onCreated();
    } catch (err) {
      const apiErr = err as ApiError;
      if (Array.isArray(apiErr.details)) {
        setErrors(Object.fromEntries(apiErr.details.map((d) => [d.field, d.message])));
      } else if (apiErr.status === 409) {
        setErrors({ email: 'An account with this email already exists. Try logging in.' });
      } else {
        setErrors({ form: apiErr.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Title title="Create your account" subtitle="Save your plan and track every workout." />
      {errors.form && (
        <Text variant="smallStrong" color={colors.danger}>
          {errors.form}
        </Text>
      )}
      <TextField label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" error={errors.name} />
      <TextField
        label="Email address"
        value={form.email}
        onChangeText={(email) => setForm({ ...form, email })}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        error={errors.email}
      />
      <TextField label="Password" value={form.password} onChangeText={(password) => setForm({ ...form, password })} secure autoComplete="new-password" error={errors.password} />
      {!!form.password && (
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityLabel={`Password strength ${strength} of 4`}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < strength ? (strength >= 3 ? colors.accent : colors.warning) : colors.surface3 }} />
          ))}
          <Text variant="caption" color={colors.muted} style={{ marginLeft: 6 }}>
            {['Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]}
          </Text>
        </View>
      )}
      <TextField
        label="Confirm password"
        value={form.confirmPassword}
        onChangeText={(confirmPassword) => setForm({ ...form, confirmPassword })}
        secure
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: terms }}
        onPress={() => setTerms((t) => !t)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 }}
      >
        <View style={[styles.checkbox, terms && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
          {terms && <Icon name="checkmark" size={14} color={colors.accentText} />}
        </View>
        <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
          I agree to the <Text variant="smallStrong">Terms of Service</Text> and <Text variant="smallStrong">Privacy Policy</Text>
        </Text>
      </Pressable>
      {errors.terms && (
        <Text variant="small" color={colors.danger}>
          {errors.terms}
        </Text>
      )}
      <Button title="Create account" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
      <Pressable onPress={() => router.push('/login')} style={{ alignSelf: 'center', padding: 8 }} accessibilityRole="link">
        <Text variant="body" color={colors.textSecondary}>
          Already have an account?{' '}
          <Text variant="bodyStrong" color={colors.accent}>
            Log in
          </Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function CompleteStep({ summary, answers, opts, onDone }: { summary: any; answers: OnboardingAnswers; opts: OnboardingOptions; onDone: () => void }) {
  const scale = useState(() => new Animated.Value(0.6))[0];
  useEffect(() => {
    haptic.success();
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [scale]);

  const goal = summary?.goal?.name ?? opts.goals.find((g) => g.id === answers.goalId)?.name;
  const focus = (summary?.focusAreas ?? opts.focusAreas.filter((f) => answers.focusAreaIds?.includes(f.id))) as { id: number; name: string }[];
  const target = summary?.weeklyTarget ?? answers.weeklyWorkoutDays;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40, alignItems: 'center', gap: 16 }}>
      <Animated.View style={[styles.motivationOrb, { transform: [{ scale }] }]}>
        <Icon name="checkmark-done" size={60} color={colors.accent} />
      </Animated.View>
      <Text variant="h1" style={{ textAlign: 'center' }}>
        Your plan is ready
      </Text>
      <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
        We&apos;ve personalised FitFlow around your goals.
      </Text>
      <Card style={{ alignSelf: 'stretch', gap: 14, marginTop: 8 }}>
        <SummaryRow icon="flag" label="Goal" value={goal ?? '—'} />
        <SummaryRow icon="body" label="Focus areas" value={focus.map((f) => f.name).join(', ') || '—'} />
        <SummaryRow icon="calendar" label="Weekly target" value={target ? `${target} workout${target > 1 ? 's' : ''} / week` : '—'} />
        {summary?.suggestedNextAction && <SummaryRow icon="sparkles" label="Next step" value={summary.suggestedNextAction.label} />}
      </Card>
      <Button title="Go to Home" icon="home" onPress={onDone} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" color={colors.muted}>
          {label.toUpperCase()}
        </Text>
        <Text variant="bodyStrong">{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  dayTile: {
    width: '30%',
    flexGrow: 1,
    height: 92,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightBox: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  motivationOrb: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.4)',
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
});
