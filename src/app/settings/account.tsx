import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { colors } from '@/theme/tokens';
import { useProfile } from '@/lib/queries';
import { confirm } from '@/lib/workout';
import { cancelReminders } from '@/lib/reminders';
import { useSession } from '@/stores/session';
import { useOutbox } from '@/stores/outbox';
import { Button, Card, Divider, Header, haptic, Text, TextField } from '@/components/ui';

export default function Account() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useAuth((s) => s.logout);
  const refreshMe = useAuth((s) => s.refreshMe);
  const { data: p } = useProfile();
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePw, setDeletePw] = useState('');
  const [msg, setMsg] = useState<{ section: string; text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  if (p && loadedFor !== p.id) {
    setLoadedFor(p.id);
    setName(p.name);
  }

  const run = async (section: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(section);
    setMsg(null);
    try {
      await fn();
      setMsg({ section, text: ok, ok: true });
      haptic.success();
    } catch (e) {
      setMsg({ section, text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    await logout();
    qc.clear();
    router.replace('/welcome');
  };

  /** Log out after confirming; mentions unsynced or in-progress workouts. */
  const confirmSignOut = async () => {
    const pending = useOutbox.getState().items.length;
    const active = useSession.getState().active;
    const notes = [
      active ? `Your workout in progress ("${active.title}") stays on this phone.` : '',
      pending ? `${pending} finished workout${pending > 1 ? 's' : ''} will sync when you log back in.` : '',
    ].filter(Boolean);
    const message = ['You will need to log in again to use FitFlow.', ...notes].join('\n\n');
    const ok = await confirm('Log out?', message, 'Log out');
    if (ok) await signOut();
  };

  const note = (section: string) =>
    msg?.section === section ? (
      <Text variant="small" color={msg.ok ? colors.accent : colors.danger}>
        {msg.text}
      </Text>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Account & privacy" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 12 }}>
            <Text variant="h3">Personal details</Text>
            <TextField label="Full name" value={name} onChangeText={setName} />
            <Text variant="small" color={colors.muted}>
              Email: {p?.email} {p && !p.emailVerified ? '(not verified)' : ''}
            </Text>
            <Button
              title="Save"
              size="md"
              loading={busy === 'name'}
              disabled={!name.trim() || name === p?.name}
              onPress={() =>
                run(
                  'name',
                  async () => {
                    await api.patch('/profile', { name: name.trim() });
                    await Promise.all([qc.invalidateQueries({ queryKey: ['profile'] }), qc.invalidateQueries({ queryKey: ['home'] }), refreshMe()]);
                  },
                  'Saved'
                )
              }
            />
            {p && !p.emailVerified && (
              <Button title="Resend verification email" variant="ghost" size="sm" onPress={() => run('name', () => api.post('/auth/resend-verification'), 'Verification email sent')} />
            )}
            {note('name')}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text variant="h3">Change password</Text>
            <TextField label="Current password" value={pw.currentPassword} onChangeText={(v) => setPw({ ...pw, currentPassword: v })} secure />
            <TextField label="New password" value={pw.newPassword} onChangeText={(v) => setPw({ ...pw, newPassword: v })} secure placeholder="8+ chars, upper, lower & number" />
            <TextField label="Confirm new password" value={pw.confirmPassword} onChangeText={(v) => setPw({ ...pw, confirmPassword: v })} secure />
            <Button
              title="Update password"
              size="md"
              loading={busy === 'pw'}
              disabled={!pw.currentPassword || !pw.newPassword}
              onPress={() =>
                run(
                  'pw',
                  async () => {
                    await api.post('/auth/change-password', pw);
                    setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  },
                  'Password updated'
                )
              }
            />
            {note('pw')}
          </Card>

          <Card style={{ gap: 12 }}>
            <Text variant="h3">Your data</Text>
            <Text variant="small" color={colors.muted}>
              Download a copy of your profile, measurements and workout history.
            </Text>
            <Button
              title="Export my data"
              variant="secondary"
              size="md"
              icon="download-outline"
              loading={busy === 'export'}
              onPress={() =>
                run(
                  'export',
                  async () => {
                    const data = await api.get('/profile/export');
                    await Share.share({ message: JSON.stringify(data, null, 2), title: 'FitFlow data export' });
                  },
                  'Export ready'
                )
              }
            />
            {note('export')}
          </Card>

          <Button title="Log out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} />

          <Divider style={{ marginVertical: 8 }} />

          <Card style={{ gap: 12, borderColor: 'rgba(255,93,99,0.3)' }}>
            <Text variant="h3" color={colors.danger}>
              Delete account
            </Text>
            <Text variant="small" color={colors.muted}>
              This permanently deletes your account, workouts and library. It can&apos;t be undone.
            </Text>
            <TextField label="Confirm with your password" value={deletePw} onChangeText={setDeletePw} secure />
            <Button
              title="Delete my account"
              variant="danger"
              size="md"
              disabled={!deletePw}
              loading={busy === 'delete'}
              onPress={async () => {
                if (!(await confirm('Delete account?', 'All your data will be permanently deleted.', 'Delete forever'))) return;
                run(
                  'delete',
                  async () => {
                    await api.delete('/profile', { password: deletePw, confirm: 'DELETE' });
                    await cancelReminders();
                    await useSession.getState().discard();
                    await signOut();
                  },
                  'Account deleted'
                );
              }}
            />
            {note('delete')}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
