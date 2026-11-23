import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { Button, Card, Header, Icon, Screen, Text, TextField } from '@/components/ui';

/** Request a reset link, then set a new password with the emailed token. */
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
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
      const res = await api.post<{ resetToken?: string }>('/auth/forgot-password', { email: email.trim() });
      if (res.resetToken) setToken(res.resetToken); // development only
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
      await api.post('/auth/reset-password', { token: token.trim(), password, confirmPassword: confirm });
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
              Enter the email you signed up with and we&apos;ll send a secure reset link.
            </Text>
            <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error ?? undefined} />
            <Button title="Send reset link" onPress={request} loading={loading} />
          </>
        ) : (
          <>
            <Card>
              <Text variant="small" color={colors.textSecondary}>
                If an account exists for {email}, we sent a reset code. Paste it below with your new password.
              </Text>
            </Card>
            <TextField label="Reset code" value={token} onChangeText={setToken} autoCapitalize="none" />
            <TextField label="New password" value={password} onChangeText={setPassword} secure placeholder="8+ chars, upper, lower & number" />
            <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secure error={error ?? undefined} />
            <Button title="Update password" onPress={reset} loading={loading} />
          </>
        )}
      </View>
    </Screen>
  );
}
