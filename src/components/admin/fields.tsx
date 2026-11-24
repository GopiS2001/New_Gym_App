import type { Field } from '@/lib/admin-modules';

import { useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mediaUrl } from '@/lib/media';
import { errorMessage } from '@/lib/api';
import { colors, radius } from '@/theme/tokens';
import { pickAndUpload, useAdminOptions, MediaFolder } from '@/lib/admin';
import { ExerciseVideo } from '@/components/video';
import { Button, Chip, haptic, Icon, IconButton, Row, Text, TextField } from '@/components/ui';

import { SearchBar, Toggle } from './admin-ui';

type Props = { field: Field; value: unknown; onChange: (v: unknown) => void; folder: MediaFolder; error?: string };

/** Renders one admin form field by type. */
export function AdminField({ field, value, onChange, folder, error }: Props) {
  const label = field.label + (field.required ? ' *' : '');
  switch (field.type) {
    case 'text':
    case 'multiline':
      return (
        <View style={{ gap: 6 }}>
          <TextField
            label={label}
            value={(value as string) ?? ''}
            onChangeText={onChange}
            placeholder={field.placeholder}
            multiline={field.type === 'multiline'}
            style={field.type === 'multiline' ? { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 } : undefined}
            error={error}
          />
          <Hint text={field.hint} />
        </View>
      );
    case 'number':
      return (
        <View style={{ gap: 6 }}>
          <TextField
            label={label}
            value={value == null ? '' : String(value)}
            onChangeText={(t) => onChange(t.replace(/\D/g, '') === '' ? null : Number(t.replace(/\D/g, '')))}
            keyboardType="number-pad"
            placeholder={field.min != null && field.max != null ? `${field.min}–${field.max}` : undefined}
            error={error}
          />
          <Hint text={field.hint} />
        </View>
      );
    case 'lines':
      return <LinesField label={label} value={(value as string[]) ?? []} onChange={onChange} hint={field.hint} />;
    case 'difficulty':
      return (
        <View style={{ gap: 8 }}>
          <Label text={label} />
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((d) => (
              <Chip key={d} label={d[0] + d.slice(1).toLowerCase()} selected={(value ?? 'BEGINNER') === d} onPress={() => onChange(d)} />
            ))}
          </Row>
        </View>
      );
    case 'switch':
      return (
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{field.label}</Text>
            <Hint text={field.hint} />
          </View>
          <Toggle value={!!value} onChange={onChange} label={field.label} />
        </Row>
      );
    case 'select':
      return <SelectField field={field} label={label} value={value as number | null} onChange={onChange} error={error} />;
    case 'multi':
      return <MultiField field={field} label={label} value={(value as number[]) ?? []} onChange={onChange} />;
    case 'image':
    case 'video':
      return <MediaField kind={field.type} label={label} value={value as string | null} onChange={onChange} folder={folder} hint={field.hint} />;
  }
}

function Label({ text }: { text: string }) {
  return (
    <Text variant="smallStrong" color={colors.textSecondary}>
      {text}
    </Text>
  );
}

function Hint({ text }: { text?: string }) {
  return text ? (
    <Text variant="caption" color={colors.muted}>
      {text}
    </Text>
  ) : null;
}

/** String list edited as one line per item (keeps the raw text while typing). */
function LinesField({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <View style={{ gap: 6 }}>
      <TextField
        label={label}
        value={text}
        onChangeText={(t) => {
          setText(t);
          onChange(t.split('\n').map((l) => l.trim()).filter(Boolean));
        }}
        multiline
        style={{ minHeight: 110, textAlignVertical: 'top', paddingTop: 12 }}
      />
      <Hint text={hint} />
    </View>
  );
}

function SelectField({ field, label, value, onChange, error }: { field: Field; label: string; value: number | null; onChange: (v: number | null) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const { data: options = [], isLoading } = useAdminOptions(field.source!);
  const current = options.find((o) => o.id === value);
  return (
    <View style={{ gap: 8 }}>
      <Label text={label} />
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${field.label}: ${current?.name ?? 'none'}`} style={[styles.select, !!error && { borderColor: colors.danger }]}>
        <Text variant="body" color={current ? colors.text : colors.muted} style={{ flex: 1 }} numberOfLines={1}>
          {isLoading ? 'Loading…' : (current?.name ?? 'Choose…')}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {!!error && (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      )}
      <OptionPicker
        visible={open}
        title={field.label}
        options={options}
        selected={value != null ? [value] : []}
        allowNone={!field.required}
        onClose={() => setOpen(false)}
        onDone={(sel) => {
          onChange(sel[0] ?? null);
          setOpen(false);
        }}
      />
    </View>
  );
}

function MultiField({ field, label, value, onChange }: { field: Field; label: string; value: number[]; onChange: (v: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const { data: options = [] } = useAdminOptions(field.source!);
  const chosen = options.filter((o) => value.includes(o.id));
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Label text={`${label}${value.length ? ` · ${value.length}` : ''}`} />
        <Pressable onPress={() => setOpen(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Choose ${field.label}`}>
          <Text variant="smallStrong" color={colors.accent}>
            {value.length ? 'Edit' : 'Choose'}
          </Text>
        </Pressable>
      </Row>
      {chosen.length ? (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {chosen.map((o) => (
            <Chip key={o.id} label={`${o.name}  ✕`} selected small onPress={() => onChange(value.filter((v) => v !== o.id))} />
          ))}
        </Row>
      ) : (
        <Pressable onPress={() => setOpen(true)} style={[styles.select, { borderStyle: 'dashed' }]} accessibilityRole="button">
          <Icon name="add" size={18} color={colors.muted} />
          <Text variant="body" color={colors.muted}>
            Add {field.label.toLowerCase()}
          </Text>
        </Pressable>
      )}
      <OptionPicker
        visible={open}
        title={field.label}
        options={options}
        selected={value}
        multi
        onClose={() => setOpen(false)}
        onDone={(sel) => {
          onChange(sel);
          setOpen(false);
        }}
      />
    </View>
  );
}

/** Full-screen searchable list for single or multiple choice. */
function OptionPicker({
  visible,
  title,
  options,
  selected,
  multi,
  allowNone,
  onClose,
  onDone,
}: {
  visible: boolean;
  title: string;
  options: { id: number; name: string }[];
  selected: number[];
  multi?: boolean;
  allowNone?: boolean;
  onClose: () => void;
  onDone: (sel: number[]) => void;
}) {
  const [sel, setSel] = useState<number[]>(selected);
  const [q, setQ] = useState('');
  const [wasVisible, setWasVisible] = useState(false);
  // Reset the working copy each time the picker opens (render-time, no effect).
  if (visible && !wasVisible) {
    setWasVisible(true);
    setSel(selected);
    setQ('');
  } else if (!visible && wasVisible) setWasVisible(false);

  const list = options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <Row style={{ alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <IconButton icon="close" label="Close" onPress={onClose} />
          <Text variant="h3" style={{ flex: 1, textAlign: 'center' }}>
            {title}
          </Text>
          <View style={{ width: 44 }} />
        </Row>
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <SearchBar value={q} onChange={setQ} placeholder={`Search ${title.toLowerCase()}`} />
        </View>
        <FlatList
          data={allowNone ? [{ id: -1, name: 'None' }, ...list] : list}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text variant="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 30 }}>
              Nothing found
            </Text>
          }
          renderItem={({ item }) => {
            const on = item.id === -1 ? sel.length === 0 : sel.includes(item.id);
            return (
              <Pressable
                onPress={() => {
                  haptic.select();
                  if (!multi) return onDone(item.id === -1 ? [] : [item.id]);
                  setSel(on ? sel.filter((x) => x !== item.id) : [...sel, item.id]);
                }}
                accessibilityRole={multi ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: on }}
                style={[styles.option, on && { borderColor: colors.accent, backgroundColor: 'rgba(200,241,53,0.08)' }]}
              >
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.check, on && { backgroundColor: colors.accent, borderColor: colors.accent }, !multi && { borderRadius: 11 }]}>
                  {on && <Icon name="checkmark" size={14} color={colors.accentText} />}
                </View>
              </Pressable>
            );
          }}
        />
        {multi && (
          <View style={{ padding: 16, paddingTop: 8 }}>
            <Button title={`Done${sel.length ? ` · ${sel.length} selected` : ''}`} onPress={() => onDone(sel)} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/** Upload / replace / remove an image or video; stores the uploaded URL. */
function MediaField({ kind, label, value, onChange, folder, hint }: { kind: 'image' | 'video'; label: string; value: string | null; onChange: (v: string | null) => void; folder: MediaFolder; hint?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upload = async () => {
    setBusy(true);
    setErr(null);
    try {
      const url = await pickAndUpload(kind, folder);
      if (url) onChange(url);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <Label text={label} />
      {value ? (
        <View style={styles.media}>
          {kind === 'image' ? (
            <Image source={{ uri: mediaUrl(value) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <ExerciseVideo uri={value} style={StyleSheet.absoluteFill} rounded={radius.lg} />
          )}
        </View>
      ) : (
        <Pressable onPress={upload} disabled={busy} accessibilityRole="button" accessibilityLabel={`Upload ${label}`} style={[styles.media, styles.mediaEmpty]}>
          <Icon name={kind === 'image' ? 'image-outline' : 'videocam-outline'} size={30} color={colors.muted} />
          <Text variant="small" color={colors.muted}>
            {busy ? 'Uploading…' : `Tap to upload ${kind === 'image' ? 'a photo' : 'a video'}`}
          </Text>
        </Pressable>
      )}
      {!!value && (
        <Row gap={10}>
          <Button title={busy ? 'Uploading…' : 'Replace'} variant="secondary" size="sm" icon="cloud-upload-outline" onPress={upload} loading={busy} full={false} />
          <Button title="Remove" variant="danger" size="sm" icon="trash-outline" onPress={() => onChange(null)} full={false} />
        </Row>
      )}
      {!!err && (
        <Text variant="caption" color={colors.danger}>
          {err}
        </Text>
      )}
      <Hint text={hint} />
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  media: { height: 190, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface2 },
  mediaEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
});
