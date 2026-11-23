import { useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { useCoach } from '@/lib/queries';
import { Cover, ProgramCardView } from '@/components/content';
import { Card, Chip, ErrorState, Header, Icon, Row, Skeleton, Text } from '@/components/ui';

export default function CoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c, isLoading, error, refetch } = useCoach(id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Header title={c?.name ?? 'Coach'} />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 18 }}>
          {error ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading || !c ? (
            <Skeleton height={200} />
          ) : (
            <>
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Cover uri={c.imageUrl} icon="person" style={{ width: 120, height: 120 }} rounded={60} />
                <Text variant="h1">{c.name}</Text>
                {c.headline && (
                  <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                    {c.headline}
                  </Text>
                )}
                {c.experienceYears != null && <Chip label={`${c.experienceYears} years experience`} selected />}
              </View>

              {!!c.bio && (
                <View>
                  <Text variant="h3" style={{ marginBottom: 8 }}>
                    About
                  </Text>
                  <Text variant="body" color={colors.textSecondary}>
                    {c.bio}
                  </Text>
                </View>
              )}

              {!!c.specialities?.length && (
                <View>
                  <Text variant="h3" style={{ marginBottom: 10 }}>
                    Specialities
                  </Text>
                  <Row gap={8} style={{ flexWrap: 'wrap' }}>
                    {c.specialities.map((s) => (
                      <Chip key={s} label={s} />
                    ))}
                  </Row>
                </View>
              )}

              {!!c.credentials.length && (
                <View style={{ gap: 8 }}>
                  <Text variant="h3">Verified credentials</Text>
                  {c.credentials.map((cr, i) => (
                    <Card key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Icon name="ribbon" size={22} color={colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong">{cr.title}</Text>
                        <Text variant="small" color={colors.muted}>
                          {[cr.issuer, cr.year].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}

              {!!c.programs?.length && (
                <View style={{ gap: 12 }}>
                  <Text variant="h3">Programs</Text>
                  {c.programs.map((p) => (
                    <ProgramCardView key={p.id} item={p} compact />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
