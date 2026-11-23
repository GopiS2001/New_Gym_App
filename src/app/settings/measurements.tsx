import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, errorMessage } from '@/lib/api';
import { colors } from '@/theme/tokens';
import { AreaChart } from '@/components/charts';
import { useMeasurements, useProfile } from '@/lib/queries';
import { Button, Card, Chip, EmptyState, Header, haptic, Row, Skeleton, Text, TextField } from '@/components/ui';

/** Body-weight history. New entries are appended — history is never overwritten. */
export default function Measurements() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data, isLoading } = useMeasurements();
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lb'>((profile?.preferredWeightUnit ?? 'KG').toLowerCase() as 'kg' | 'lb');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const n = Number(value.replace(',', '.'));
    if (!(n > 0 && n < 700)) return setError('Enter a valid weight');
    setSaving(true);
    setError(null);
    try {
      await api.post('/profile/measurements', { measurementType: 'weight', value: n, unit });
      setValue('');
      haptic.success();
      await Promise.all([qc.invalidateQueries({ queryKey: ['measurements'] }), qc.invalidateQueries({ queryKey: ['profile'] })]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const series = [...(data ?? [])].reverse().map((m) => ({ label: new Date(m.measuredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: Number(m.value) }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title="Body measurements" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 12 }}>
            <Text variant="h3">Log weight</Text>
            <Row gap={10} style={{ alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <TextField label="Weight" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0.0" error={error ?? undefined} />
              </View>
              <Row gap={6} style={{ paddingBottom: error ? 26 : 8 }}>
                {(['kg', 'lb'] as const).map((u) => (
                  <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
                ))}
              </Row>
            </Row>
            <Button title="Add entry" size="md" onPress={add} loading={saving} />
          </Card>

          {isLoading ? (
            <Skeleton height={200} />
          ) : !data?.length ? (
            <EmptyState icon="scale-outline" title="No measurements yet" message="Weight is optional and only used to show your progress." />
          ) : (
            <>
              {series.length >= 2 && (
                <Card>
                  <AreaChart data={series} unit={data[0].unit} formatValue={(v) => v.toFixed(1)} />
                </Card>
              )}
              <Text variant="h3">History</Text>
              {data.map((m) => (
                <Card key={m.id} style={{ paddingVertical: 12 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="small" color={colors.muted}>
                      {new Date(m.measuredAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                    <Text variant="bodyStrong">
                      {Number(m.value)} {m.unit}
                    </Text>
                  </Row>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
