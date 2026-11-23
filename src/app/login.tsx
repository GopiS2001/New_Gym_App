import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { ApiError } from '@/lib/api';
import { onboardingDone, useAuth } from '@/stores/auth';
import { colors } from '@/theme/tokens';
import { Brand } from '@/components/brand';
import { Button, Card, Header, Screen, Text, TextField } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const me = await login(email.trim(), password);
      router.replace(onboardingDone(me) ? '/(tabs)' : '/onboarding');
    } catch (e) {
      const err = e as ApiError;
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Header />
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 28, gap: 8 }}>
          <Brand size={28} />
          <Text variant="h1">Welcome back</Text>
          <Text variant="body" color={colors.textSecondary}>
            Log in to continue your training.
          </Text>
        </View>

        <View style={{ gap: 18 }}>
          {errors.form && (
            <Card style={{ borderColor: 'rgba(255,93,99,0.4)' }}>
              <Text variant="smallStrong" color={colors.danger}>
                {errors.form}
              </Text>
            </Card>
          )}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            error={errors.email}
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="password"
            placeholder="Your password"
            error={errors.password}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end' }} hitSlop={8} accessibilityRole="link">
            <Text variant="smallStrong" color={colors.accent}>
              Forgot password?
            </Text>
          </Pressable>
          <Button title="Log in" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
          <Pressable onPress={() => router.replace('/onboarding')} style={{ alignSelf: 'center', padding: 12 }} accessibilityRole="link">
            <Text variant="body" color={colors.textSecondary}>
              New here?{' '}
              <Text variant="bodyStrong" color={colors.accent}>
                Join free
              </Text>
            </Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
