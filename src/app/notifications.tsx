import type { AppNotification } from '@/lib/social';

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius } from '@/theme/tokens';
import { showDialog } from '@/stores/dialog';
import { errorMessage } from '@/lib/api';
import { useFriendAction, useMarkAllRead, useNotifications } from '@/lib/social';
import { Button, EmptyState, ErrorState, FadeIn, Header, Icon, Row, Skeleton, Text } from '@/components/ui';

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};

/** Inbox: friend requests (accept / reject right here) and other notices. */
export default function Notifications() {
  const router = useRouter();
  const q = useNotifications();
  const markAll = useMarkAllRead();
  const unread = q.data?.unread ?? 0;

  // Opening the inbox marks everything as seen (badges clear) after a moment.
  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(() => markAll.mutate(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Notifications" />
        {q.error ? (
          <View style={{ padding: 20 }}>
            <ErrorState onRetry={() => void q.refetch()} />
          </View>
        ) : q.isLoading ? (
          <View style={{ padding: 20, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={84} />
            ))}
          </View>
        ) : (
          <FlatList
            data={q.data?.data ?? []}
            keyExtractor={(n) => String(n.id)}
            contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 10, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.accent} />}
            ListEmptyComponent={
              <EmptyState icon="notifications-outline" title="You're all caught up" message="Friend requests and updates will appear here." action="Find friends" onAction={() => router.push('/friends')} />
            }
            renderItem={({ item }) => <NotificationRow n={item} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const router = useRouter();
  const act = useFriendAction();
  const name = n.data?.fromName ?? 'Member';
  const person = { id: n.data?.fromUserId ?? n.data?.userId ?? 0, name, avatarUrl: n.data?.fromAvatarUrl ?? null, friendCount: 0, online: false, relation: 'request_received' as const, requestId: n.data?.requestId ?? null };

  const respond = (accept: boolean) =>
    act.mutate(
      { kind: accept ? 'accept' : 'reject', person, requestId: n.data!.requestId! },
      {
        onSuccess: () => accept && showDialog({ title: `You and ${name} are now friends`, icon: 'people', tone: 'accent', confirmText: 'Nice' }),
        onError: (e) => showDialog({ title: 'Something went wrong', message: errorMessage(e), icon: 'alert-circle-outline', tone: 'danger', confirmText: 'OK' }),
      }
    );

  const pending = n.type === 'friend_request' && n.requestStatus === 'PENDING';
  const status =
    n.type === 'friend_request' && !pending
      ? n.requestStatus === 'ACCEPTED'
        ? { text: 'Accepted · you are friends', color: colors.accent }
        : n.requestStatus === 'REJECTED'
          ? { text: 'Rejected', color: colors.muted }
          : { text: 'Request withdrawn', color: colors.muted }
      : null;

  return (
    <FadeIn auto distance={10}>
      <View style={[styles.card, !n.readAt && styles.unread]}>
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <View style={[styles.avatar, n.type === 'friend_rejected' && { backgroundColor: colors.surface3 }]}>
            <Text variant="bodyStrong" color={n.type === 'friend_rejected' ? colors.text : colors.accentText}>
              {name[0]?.toUpperCase()}
            </Text>
            <View style={styles.kind}>
              <Icon name={n.type === 'friend_accepted' ? 'people' : n.type === 'friend_rejected' ? 'close' : 'person-add'} size={10} color={colors.accentText} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text variant="bodyStrong">{n.title}</Text>
            {!!n.body && (
              <Text variant="small" color={colors.textSecondary}>
                {n.body}
              </Text>
            )}
            <Text variant="caption" color={colors.muted}>
              {ago(n.createdAt)}
            </Text>
          </View>
          {!n.readAt && <View style={styles.dot} />}
        </Row>
        {pending && (
          <Row gap={10} style={{ marginTop: 12 }}>
            <Button title="Accept" icon="checkmark" size="sm" onPress={() => respond(true)} loading={act.isPending && act.variables?.kind === 'accept'} style={{ flex: 1 }} />
            <Button title="Reject" variant="secondary" size="sm" onPress={() => respond(false)} loading={act.isPending && act.variables?.kind === 'reject'} style={{ flex: 1 }} />
          </Row>
        )}
        {status && (
          <Text variant="smallStrong" color={status.color} style={{ marginTop: 10 }}>
            {status.text}
          </Text>
        )}
        {n.type === 'friend_accepted' && (
          <Button title="See friends" variant="ghost" size="sm" icon="people-outline" onPress={() => router.push('/friends')} style={{ marginTop: 8 }} />
        )}
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: 'rgba(200,241,53,0.35)', backgroundColor: colors.surface2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  kind: { position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, marginTop: 6 },
});
