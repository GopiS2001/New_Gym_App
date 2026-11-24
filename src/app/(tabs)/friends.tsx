import type { Person } from '@/lib/social';

import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mediaUrl } from '@/lib/media';
import { confirm } from '@/lib/workout';
import { showDialog } from '@/stores/dialog';
import { errorMessage } from '@/lib/api';
import { useDebouncedValue } from '@/lib/hooks';
import { colors, fonts, radius } from '@/theme/tokens';
import { useFriendAction, useFriendRequests, useFriends, usePeople } from '@/lib/social';
import { EmptyState, ErrorState, FadeIn, haptic, Icon, IconButton, Row, Skeleton, Text, usePressScale } from '@/components/ui';
import { Animated } from 'react-native';

type Tab = 'people' | 'friends' | 'requests';

/** Friends: find members, send requests, manage requests and friends. */
export default function Friends() {
  const [tab, setTab] = useState<Tab>('people');
  const friends = useFriends();
  const requests = useFriendRequests();
  const incoming = requests.data?.incoming.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="h1" accessibilityRole="header">
              Friends
            </Text>
            <View style={styles.countPill}>
              <Icon name="people" size={15} color={colors.accent} />
              <Text variant="smallStrong" color={colors.accent}>
                {friends.data?.friendCount ?? 0} {friends.data?.friendCount === 1 ? 'friend' : 'friends'}
              </Text>
            </View>
          </Row>
          <Text variant="body" color={colors.textSecondary}>
            Train together with other FitFlow members
          </Text>
        </View>

        <View style={styles.segment} accessibilityRole="tablist">
          {(
            [
              { key: 'people', label: 'Find people' },
              { key: 'friends', label: `My friends` },
              { key: 'requests', label: 'Requests', badge: incoming },
            ] as { key: Tab; label: string; badge?: number }[]
          ).map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  haptic.select();
                  setTab(t.key);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.badge ? `${t.label}, ${t.badge} new` : t.label}
                style={[styles.segItem, on && styles.segItemOn]}
              >
                <Text variant="smallStrong" color={on ? colors.accentText : colors.textSecondary}>
                  {t.label}
                </Text>
                {!!t.badge && (
                  <View style={[styles.badge, on && { backgroundColor: colors.accentText }]}>
                    <Text variant="caption" color={on ? colors.accent : colors.accentText} style={{ fontFamily: fonts.bold }}>
                      {t.badge}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {tab === 'people' ? <PeopleTab /> : tab === 'friends' ? <FriendsTab onFind={() => setTab('people')} /> : <RequestsTab />}
      </SafeAreaView>
    </View>
  );
}

// ----------------------------------------------------------------------------

function PeopleTab() {
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const people = usePeople(q);
  const rows = people.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <>
      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search members"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 }}
          accessibilityLabel="Search members"
          autoCapitalize="none"
        />
        {!!search && <IconButton icon="close" label="Clear search" size={30} onPress={() => setSearch('')} />}
      </View>
      {people.error ? (
        <View style={{ padding: 20 }}>
          <ErrorState onRetry={() => void people.refetch()} />
        </View>
      ) : people.isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={people.isRefetching && !people.isFetchingNextPage} onRefresh={() => void people.refetch()} tintColor={colors.accent} />}
          onEndReached={() => people.hasNextPage && people.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={people.isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginTop: 10 }} /> : undefined}
          ListEmptyComponent={<EmptyState icon="people" title={q ? 'No members found' : 'No members yet'} message={q ? 'Try a different name.' : 'Invite friends to join FitFlow.'} />}
          renderItem={({ item }) => <PersonRow person={item} />}
        />
      )}
    </>
  );
}

function FriendsTab({ onFind }: { onFind: () => void }) {
  const friends = useFriends();
  if (friends.error) {
    return (
      <View style={{ padding: 20 }}>
        <ErrorState onRetry={() => void friends.refetch()} />
      </View>
    );
  }
  if (friends.isLoading) return <Loading />;
  return (
    <FlatList
      data={friends.data?.data ?? []}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={friends.isRefetching} onRefresh={() => void friends.refetch()} tintColor={colors.accent} />}
      ListEmptyComponent={<EmptyState icon="people-outline" title="No friends yet" message="Find people and send a friend request." action="Find people" onAction={onFind} />}
      renderItem={({ item }) => <PersonRow person={item} />}
    />
  );
}

function RequestsTab() {
  const requests = useFriendRequests();
  if (requests.error) {
    return (
      <View style={{ padding: 20 }}>
        <ErrorState onRetry={() => void requests.refetch()} />
      </View>
    );
  }
  if (requests.isLoading) return <Loading />;
  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];
  const sections = [
    ...(incoming.length ? [{ header: `Received · ${incoming.length}` } as const, ...incoming.map((r) => ({ person: { ...r.person, requestId: r.id } }))] : []),
    ...(outgoing.length ? [{ header: `Sent · ${outgoing.length}` } as const, ...outgoing.map((r) => ({ person: { ...r.person, requestId: r.id } }))] : []),
  ];
  return (
    <FlatList
      data={sections}
      keyExtractor={(s, i) => ('header' in s ? `h${i}` : `p${s.person.id}`)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={requests.isRefetching} onRefresh={() => void requests.refetch()} tintColor={colors.accent} />}
      ListEmptyComponent={<EmptyState icon="mail-open-outline" title="No requests" message="Friend requests you send or receive show up here." />}
      renderItem={({ item }) =>
        'header' in item ? (
          <Text variant="caption" color={colors.muted} style={{ marginTop: 6, letterSpacing: 1 }}>
            {item.header.toUpperCase()}
          </Text>
        ) : (
          <PersonRow person={item.person} />
        )
      }
    />
  );
}

function Loading() {
  return (
    <View style={{ padding: 20, gap: 10 }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={72} />
      ))}
    </View>
  );
}

// ----------------------------------------------------------------------------

/** One member with the right action for your relationship. */
function PersonRow({ person: p }: { person: Person }) {
  const act = useFriendAction();
  const busy = act.isPending;

  const run = (a: Parameters<typeof act.mutate>[0], success?: string) =>
    act.mutate(a, {
      onSuccess: () => {
        haptic.success();
        if (success) showDialog({ title: success, icon: 'people', tone: 'accent', confirmText: 'Nice' });
      },
      onError: (e) => showDialog({ title: 'Something went wrong', message: errorMessage(e), icon: 'alert-circle-outline', tone: 'danger', confirmText: 'OK' }),
    });

  const remove = async () => {
    if (await confirm(`Remove ${p.name}?`, `You and ${p.name} will no longer be friends.`, 'Remove', true, 'person-remove-outline')) run({ kind: 'remove', person: p });
  };
  const cancel = async () => {
    if (p.requestId && (await confirm('Cancel request?', `Withdraw your friend request to ${p.name}?`, 'Cancel request', true, 'close-circle-outline')))
      run({ kind: 'cancel', person: p, requestId: p.requestId });
  };

  return (
    <FadeIn auto distance={10}>
      <View style={styles.row}>
        <View>
          <View style={styles.avatar}>
            {p.avatarUrl ? (
              <Image source={{ uri: mediaUrl(p.avatarUrl) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text variant="bodyStrong" color={colors.accentText}>
                {p.name[0]?.toUpperCase()}
              </Text>
            )}
          </View>
          {p.online && <View style={styles.onlineDot} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {p.name}
          </Text>
          <Text variant="caption" color={colors.muted}>
            {p.friendCount} {p.friendCount === 1 ? 'friend' : 'friends'}
            {p.online ? ' · online' : ''}
          </Text>
        </View>

        {p.relation === 'none' && (
          <ActionPill label="Add friend" icon="person-add" primary disabled={busy} onPress={() => run({ kind: 'send', person: p })} />
        )}
        {p.relation === 'request_sent' && <ActionPill label="Requested" icon="time-outline" disabled={busy} onPress={cancel} />}
        {p.relation === 'friends' && <ActionPill label="Friends" icon="checkmark-circle" outline disabled={busy} onPress={remove} />}
        {p.relation === 'request_received' && p.requestId && (
          <Row gap={8}>
            <ActionPill
              label="Accept"
              icon="checkmark"
              primary
              disabled={busy}
              onPress={() => run({ kind: 'accept', person: p, requestId: p.requestId! }, `You and ${p.name} are now friends`)}
            />
            <IconButton icon="close" label={`Reject ${p.name}`} size={38} color={colors.danger} onPress={() => run({ kind: 'reject', person: p, requestId: p.requestId! })} />
          </Row>
        )}
      </View>
    </FadeIn>
  );
}

function ActionPill({
  label,
  icon,
  onPress,
  primary,
  outline,
  disabled,
}: {
  label: string;
  icon: 'person-add' | 'time-outline' | 'checkmark-circle' | 'checkmark';
  onPress: () => void;
  primary?: boolean;
  outline?: boolean;
  disabled?: boolean;
}) {
  const press = usePressScale(0.94);
  const fg = primary ? colors.accentText : outline ? colors.accent : colors.textSecondary;
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        onPress={() => {
          haptic.select();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.pill,
          primary && { backgroundColor: colors.accent, borderColor: colors.accent },
          outline && { borderColor: 'rgba(200,241,53,0.5)', backgroundColor: 'rgba(200,241,53,0.08)' },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Icon name={icon} size={15} color={fg} />
        <Text variant="smallStrong" color={fg}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(200,241,53,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,241,53,0.3)',
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    gap: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segItem: { flex: 1, height: 38, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segItemOn: { backgroundColor: colors.accent },
  badge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginHorizontal: 20,
    marginTop: 14,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 130, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#3DDC84', borderWidth: 2, borderColor: colors.surface },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
