import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { CodeInput } from '@/components/code-input';
import { Button, Card, Header, Icon, Screen, Text, TextField } from '@/components/ui';

/** Request a 6-digit code by email, then set a new password with it. */
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<'request' | 'reset' | 'done'>('request');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ resetCode?: string }>('/auth/forgot-password', { email: email.trim() });
      setDevCode(res.resetCode ?? null); // only when the server has no email set up (development)
      setCode('');
      setStage('reset');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setLoading(true);
    setError(null);
    try {
      if (code.length !== 6) throw new Error('Enter the 6-digit code from your email');
      await api.post('/auth/reset-password', { email: email.trim(), code, password, confirmPassword: confirm });
      setStage('done');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Reset password" />
      <View style={{ gap: 18, marginTop: 16 }}>
        {stage === 'done' ? (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <Icon name="checkmark-circle" size={44} color={colors.accent} />
            <Text variant="h3">Password updated</Text>
            <Text variant="small" color={colors.muted} style={{ textAlign: 'center' }}>
              You can now log in with your new password.
            </Text>
            <Button title="Back to log in" onPress={() => router.replace('/login')} style={{ marginTop: 10 }} />
          </Card>
        ) : stage === 'request' ? (
          <>
            <Text variant="body" color={colors.textSecondary}>
              Enter the email you signed up with and we&apos;ll send you a 6-digit reset code.
            </Text>
            <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error ?? undefined} />
            <Button title="Send reset code" onPress={request} loading={loading} />
          </>
        ) : (
          <>
            <Text variant="body" color={colors.textSecondary}>
              If an account exists for <Text variant="bodyStrong">{email.trim()}</Text>, we sent a 6-digit code. It expires in 15 minutes.
            </Text>
            <CodeInput value={code} onChange={setCode} />
            {devCode && (
              <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderColor: 'rgba(255,184,0,0.35)' }}>
                <Icon name="construct" size={18} color={colors.warning} />
                <Text variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
                  Email isn&apos;t set up on the server yet, so here is your code for testing:{' '}
                  <Text variant="smallStrong" color={colors.text}>
                    {devCode}
                  </Text>
                </Text>
              </Card>
            )}
            <TextField label="New password" value={password} onChangeText={setPassword} secure placeholder="8+ chars, upper, lower & number" />
            <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secure error={error ?? undefined} />
            <Button title="Update password" onPress={reset} loading={loading} disabled={code.length !== 6} />
            <Button title="Send a new code" variant="ghost" size="sm" onPress={request} />
          </>
        )}
      </View>
    </Screen>
  );
}
