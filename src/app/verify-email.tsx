import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { goBack } from '@/lib/nav';
import { colors } from '@/theme/tokens';
import { useAuth } from '@/stores/auth';
import { useProfile } from '@/lib/queries';
import { showDialog } from '@/stores/dialog';
import { api, errorMessage } from '@/lib/api';
import { CodeInput } from '@/components/code-input';
import { Button, Card, haptic, Header, Icon, Screen, Text } from '@/components/ui';

const RESEND_SECONDS = 60;

type SendResult = { success: boolean; alreadyVerified?: boolean; emailSent?: boolean; verificationCode?: string };

/**
 * Enter the 6-digit code emailed to the member. Opened with ?send=1 it asks
 * for a fresh code first (e.g. from Profile, where the sign-up code may have expired).
 */
export default function VerifyEmail() {
  const { send } = useLocalSearchParams<{ send?: string }>();
  const qc = useQueryClient();
  const refreshMe = useAuth((s) => s.refreshMe);
  const { data: p } = useProfile();
  const email = p?.email ?? useAuth.getState().user?.email ?? 'your email';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Count the resend cooldown down once a second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const done = async (already = false) => {
    haptic.success();
    await Promise.all([qc.invalidateQueries({ queryKey: ['profile'] }), qc.invalidateQueries({ queryKey: ['home'] }), refreshMe()]);
    await showDialog({
      title: already ? 'Already verified' : 'Email verified',
      message: already ? 'Your email address was already confirmed.' : 'Thanks! Your email address is confirmed.',
      icon: 'checkmark-circle',
      tone: 'accent',
      confirmText: 'Done',
    });
    goBack('/profile');
  };

  const resend = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await api.post<SendResult>('/auth/resend-verification');
      if (r.alreadyVerified) return done(true);
      setDevCode(r.verificationCode ?? null);
      setNotice(`We sent a new code to ${email}.`);
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  // Fresh code on open when asked (once).
  const requested = useRef(false);
  useEffect(() => {
    if (send === '1' && !requested.current) {
      requested.current = true;
      resend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send]);


  const verify = async (value = code) => {
    if (value.length !== 6) return setError('Enter all 6 digits');
    setVerifying(true);
    setError(null);
    try {
      const r = await api.post<{ alreadyVerified?: boolean }>('/auth/verify-email-code', { code: value });
      await done(!!r.alreadyVerified);
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Screen>
      <Header title="Verify email" />
      <View style={{ alignItems: 'center', gap: 10, marginTop: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(200,241,53,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="mail-unread" size={34} color={colors.accent} />
        </View>
        <Text variant="h2" style={{ textAlign: 'center', marginTop: 6 }}>
          Check your inbox
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          Enter the 6-digit code we sent to{'\n'}
          <Text variant="bodyStrong">{email}</Text>
        </Text>
      </View>

      <View style={{ marginTop: 28, gap: 14 }}>
        <CodeInput
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error) setError(null);
          }}
          onComplete={(v) => verify(v)}
          error={!!error}
        />
        {error ? (
          <Text variant="small" color={colors.danger} style={{ textAlign: 'center' }}>
            {error}
          </Text>
        ) : notice ? (
          <Text variant="small" color={colors.accent} style={{ textAlign: 'center' }}>
            {notice}
          </Text>
        ) : null}

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

        <Button title="Verify email" onPress={() => verify()} loading={verifying} disabled={code.length !== 6} style={{ marginTop: 6 }} />

        <Pressable
          onPress={resend}
          disabled={sending || cooldown > 0}
          accessibilityRole="button"
          style={{ alignSelf: 'center', paddingVertical: 12, opacity: sending || cooldown > 0 ? 0.6 : 1 }}
        >
          <Text variant="body" color={colors.textSecondary}>
            Didn&apos;t get it?{' '}
            <Text variant="bodyStrong" color={colors.accent}>
              {sending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </Text>
        </Pressable>
        <Text variant="caption" color={colors.muted} style={{ textAlign: 'center' }}>
          Codes expire after 30 minutes. Check your spam folder too.
        </Text>
      </View>
    </Screen>
  );
}
