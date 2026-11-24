import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { goBack } from '@/lib/nav';
import { api } from '@/lib/api';
import { confirm } from '@/lib/workout';
import { colors } from '@/theme/tokens';
import { useLibrary } from '@/lib/queries';
import { Cover, difficultyLabel, ExerciseListItem } from '@/components/content';
import { Button, Card, EmptyState, Header, Icon, IconButton, Row, Skeleton, Text, TextField } from '@/components/ui';

/** Member's private collection: rename, remove items, delete. */
export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useLibrary();
  const c = data?.collections.find((x) => String(x.id) === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['library'] });

  const remove = async () => {
    if (!c || !(await confirm('Delete collection?', `"${c.name}" will be deleted. Saved items stay in your library.`, 'Delete'))) return;
    await api.delete(`/library/collections/${c.id}`);
    await refresh();
    goBack('/library');
  };

  const rename = async () => {
    if (!c || !name.trim()) return;
    await api.patch(`/library/collections/${c.id}`, { name: name.trim() });
    setEditing(false);
    refresh();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header
          title={c?.name ?? 'Collection'}
          right={
            c && (
              <Row gap={6}>
                <IconButton icon="create-outline" label="Rename" size={38} onPress={() => { setName(c.name); setEditing(true); }} />
                <IconButton icon="trash-outline" label="Delete collection" size={38} color={colors.danger} onPress={remove} />
              </Row>
            )
          }
        />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 60 }}>
          {isLoading ? (
            <Skeleton height={92} />
          ) : !c ? (
            <EmptyState icon="albums-outline" title="Collection not found" />
          ) : !c.itemCount ? (
            <EmptyState icon="add-circle-outline" title="This collection is empty" message="Open any exercise and tap the collection button to add it here." action="Explore exercises" onAction={() => router.push('/exercises/all')} />
          ) : (
            <>
              {c.exercises.map((e) => (
                <ExerciseListItem
                  key={e.id}
                  item={e}
                  right={
                    <IconButton
                      icon="remove-circle-outline"
                      label={`Remove ${e.name}`}
                      size={36}
                      onPress={async () => {
                        await api.delete(`/library/collections/${c.id}/exercises/${e.id}`);
                        refresh();
                      }}
                    />
                  }
                />
              ))}
              {c.programs.map((p) => (
                <Card key={p.id} onPress={() => router.push(`/program/${p.id}`)} style={{ padding: 10 }}>
                  <Row>
                    <Cover uri={p.imageUrl} icon="calendar" style={{ width: 64, height: 64 }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{p.name}</Text>
                      <Text variant="small" color={colors.muted}>
                        {p.durationWeeks} weeks · {difficultyLabel(p.difficulty)}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      accessibilityLabel={`Remove ${p.name}`}
                      onPress={async () => {
                        await api.delete(`/library/collections/${c.id}/programs/${p.id}`);
                        refresh();
                      }}
                    >
                      <Icon name="remove-circle-outline" size={22} color={colors.muted} />
                    </Pressable>
                  </Row>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <Pressable style={styles.dialog} onPress={() => {}}>
            <TextField label="Collection name" value={name} onChangeText={setName} autoFocus />
            <Row gap={10} style={{ marginTop: 18 }}>
              <Button title="Cancel" variant="secondary" size="md" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button title="Save" size="md" onPress={rename} style={{ flex: 1 }} />
            </Row>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: colors.border },
});
