import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { api } from '@/lib/api';
import { useLibrary } from '@/lib/queries';
import { colors, radius } from '@/theme/tokens';
import { Cover, difficultyLabel, ExerciseListItem } from '@/components/content';
import { Button, Card, EmptyState, ErrorState, Icon, IconButton, Row, Screen, Skeleton, Text, TextField } from '@/components/ui';

type Tab = 'exercises' | 'programs' | 'collections';

export default function LibraryTab() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useLibrary();
  const [tab, setTab] = useState<Tab>('exercises');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const counts = { exercises: data?.savedExercises.length ?? 0, programs: data?.savedPrograms.length ?? 0, collections: data?.collections.length ?? 0 };

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post('/library/collections', { name: name.trim() });
      setName('');
      setCreating(false);
      await qc.invalidateQueries({ queryKey: ['library'] });
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!data) return;
    const ids = data.collections.map((c) => c.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    await api.put('/library/collections/reorder', { ids });
    qc.invalidateQueries({ queryKey: ['library'] });
  };

  return (
    <Screen refreshControl={<RefreshControl tintColor={colors.accent} refreshing={isRefetching} onRefresh={() => { refetch(); }} />}>
      <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <Text variant="h1" accessibilityRole="header">
          Library
        </Text>
        {tab === 'collections' && <IconButton icon="add" label="New collection" active onPress={() => setCreating(true)} />}
      </Row>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['exercises', 'programs', 'collections'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }} style={[styles.tab, tab === t && { backgroundColor: colors.accent }]}>
            <Text variant="caption" color={tab === t ? colors.accentText : colors.textSecondary} style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {t} · {counts[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={92} />
          ))}
        </View>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : tab === 'exercises' ? (
        data?.savedExercises.length ? (
          <View style={{ gap: 10 }}>
            {data.savedExercises.map((e) => (
              <View key={e.id} style={{ opacity: e.isAvailable ? 1 : 0.55 }}>
                <ExerciseListItem item={{ ...e, isSaved: true }} />
                {!e.isAvailable && (
                  <Text variant="caption" color={colors.warning} style={{ marginTop: 4, marginLeft: 6 }}>
                    No longer available in the catalogue
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon="bookmark-outline" title="No saved exercises" message="Save exercises to build your personal library." action="Explore exercises" onAction={() => router.push('/exercises/all')} />
        )
      ) : tab === 'programs' ? (
        data?.savedPrograms.length ? (
          <View style={{ gap: 10 }}>
            {data.savedPrograms.map((p) => (
              <Card key={p.id} onPress={() => router.push(`/program/${p.id}`)} style={{ padding: 10, opacity: p.isAvailable ? 1 : 0.55 }} accessibilityLabel={p.name}>
                <Row>
                  <Cover uri={p.imageUrl} icon="calendar" style={{ width: 72, height: 72 }} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{p.name}</Text>
                    <Text variant="small" color={colors.muted}>
                      {p.durationWeeks} weeks · {p.daysPerWeek}×/week · {difficultyLabel(p.difficulty)}
                    </Text>
                    {!p.isAvailable && (
                      <Text variant="caption" color={colors.warning}>
                        No longer available
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.muted} />
                </Row>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState icon="calendar-outline" title="No saved programs" message="Bookmark programs you want to try later." action="Browse programs" onAction={() => router.push('/programs')} />
        )
      ) : data?.collections.length ? (
        <View style={{ gap: 10 }}>
          {data.collections.map((c, i) => (
            <Card key={c.id}>
              <Row>
                <Pressable
                  onPress={() => router.push(`/collection/${c.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${c.itemCount} items`}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                <View style={styles.collectionIcon}>
                  <Icon name="albums" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{c.name}</Text>
                  <Text variant="small" color={colors.muted}>
                    {c.itemCount} item{c.itemCount === 1 ? '' : 's'}
                  </Text>
                </View>
                </Pressable>
                <IconButton icon="chevron-up" label="Move up" size={34} onPress={() => i > 0 && move(i, -1)} />
                <IconButton icon="chevron-down" label="Move down" size={34} onPress={() => i < data.collections.length - 1 && move(i, 1)} />
              </Row>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState icon="albums-outline" title="No collections yet" message="Group exercises and programs your way — e.g. “Leg day” or “Home workouts”." action="Create collection" onAction={() => setCreating(true)} />
      )}

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <Text variant="h2" style={{ marginBottom: 14 }}>
              New collection
            </Text>
            <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Leg day" autoFocus maxLength={120} />
            <Row gap={10} style={{ marginTop: 18 }}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setCreating(false)} style={{ flex: 1 }} />
              <Button title="Create" size="md" onPress={create} loading={busy} disabled={!name.trim()} style={{ flex: 1 }} />
            </Row>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginTop: 16, marginBottom: 18, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  collectionIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.border },
});
