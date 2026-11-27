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
  const [codeOk, setCodeOk] = useState(false); // password fields unlock once the code is checked
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const changeCode = (v: string) => {
    setCode(v);
    setCodeError(null);
    if (codeOk) {
      setCodeOk(false);
      setPassword('');
      setConfirm('');
    }
  };

  const checkCode = async () => {
    setChecking(true);
    setCodeError(null);
    try {
      await api.post('/auth/check-reset-code', { email: email.trim(), code });
      setCodeOk(true);
    } catch (e) {
      setCodeError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  };

  const request = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ resetCode?: string }>('/auth/forgot-password', { email: email.trim() });
      setDevCode(res.resetCode ?? null); // only when the server has no email set up (development)
      setCode('');
      setCodeOk(false);
      setCodeError(null);
      setPassword('');
      setConfirm('');
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
      if (password !== confirm) throw new Error('Passwords do not match');
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
            <CodeInput value={code} onChange={changeCode} error={!!codeError} />
            {codeOk ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="checkmark-circle" size={20} color={colors.accent} />
                <Text variant="smallStrong" color={colors.accent}>
                  Code verified — set your new password
                </Text>
              </View>
            ) : (
              <>
                {codeError && (
                  <Text variant="small" color={colors.danger}>
                    {codeError}
                  </Text>
                )}
                <Button title="Check code" variant="secondary" onPress={checkCode} loading={checking} disabled={code.length !== 6} />
              </>
            )}
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
            <View style={{ gap: 18, opacity: codeOk ? 1 : 0.45 }} pointerEvents={codeOk ? 'auto' : 'none'} aria-disabled={!codeOk}>
              <TextField label="New password" value={password} onChangeText={setPassword} editable={codeOk} secure placeholder="8+ chars, upper, lower & number" />
              <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} editable={codeOk} secure error={error ?? undefined} />
              <Button title="Update password" onPress={reset} loading={loading} disabled={!codeOk || !password || !confirm} />
            </View>
            <Button title="Send a new code" variant="ghost" size="sm" onPress={request} />
          </>
        )}
      </View>
    </Screen>
  );
}
