import type { IconName } from "@/components/ui";

import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, View } from "react-native";

import { api } from "@/lib/api";
import { colors } from "@/theme/tokens";
import { useAuth } from "@/stores/auth";
import { useCan, PERM } from "@/lib/admin";
import { ADMIN_MODULES } from "@/lib/admin-modules";
import { AdminScreen } from "@/components/admin/admin-ui";
import { ViewModeCard } from "@/components/admin/view-switch";
import {
  Card,
  ErrorState,
  Icon,
  Row,
  Skeleton,
  StatTile,
  Text,
} from "@/components/ui";

type Summary = {
  kpis: {
    totalMembers: number;
    activeMembers: { value: number };
    newRegistrations: { value: number };
    workoutsLogged: { value: number };
    activePrograms: number;
    activeEnrollments: number;
  };
  health: {
    exercises: Record<string, number>;
    publishedCoaches: number;
    mediaAssets: number;
  };
  mostViewedExercises: { id: number; name: string; views: number }[];
};

/** Admin home: key numbers and shortcuts to every section. */
export default function AdminOverview() {
  const router = useRouter();
  const can = useCan();
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api.get<Summary>("/admin/dashboard/summary"),
    enabled: can(PERM.DASHBOARD_VIEW),
  });
  const online = useQuery({
    queryKey: ["admin", "users", "online-count"],
    queryFn: () => api.get<{ onlineNow?: number }>("/admin/users?limit=1"),
    enabled: can(PERM.USERS_VIEW),
    refetchInterval: 30_000,
  });

  const shortcuts: {
    label: string;
    icon: IconName;
    href: string;
    show: boolean;
  }[] = [
    {
      label: "Members",
      icon: "person",
      href: "/admin/members",
      show: can(PERM.USERS_VIEW),
    },
    ...ADMIN_MODULES.map((m) => ({
      label: m.title,
      icon: m.icon,
      href: `/admin/${m.key}`,
      show: can(PERM.CONTENT_VIEW),
    })),
  ];

  return (
    <AdminScreen title="Admin">
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: 8,
          gap: 14,
          paddingBottom: 130,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void Promise.all([refetch(), online.refetch()])}
            tintColor={colors.accent}
          />
        }
      >
        <Row
          style={{ justifyContent: "space-between", alignItems: "flex-end" }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.muted}>
              WELCOME BACK
            </Text>
            <Text variant="h2" numberOfLines={1}>
              {user?.name}
            </Text>
          </View>
        </Row>
        <ViewModeCard />

        {error ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !data ? (
          <Row gap={10}>
            <Skeleton height={96} style={{ flex: 1 }} />
            <Skeleton height={96} style={{ flex: 1 }} />
          </Row>
        ) : (
          <>
            <Row gap={10}>
              <StatTile
                style={{ flex: 1 }}
                icon="people"
                value={String(data.kpis.totalMembers)}
                label="MEMBERS"
              />
              <StatTile
                style={{ flex: 1 }}
                icon="radio-button-on"
                tint={colors.accent}
                value={String(online.data?.onlineNow ?? 0)}
                label="ONLINE NOW"
              />
            </Row>
            <Row gap={10}>
              <StatTile
                style={{ flex: 1 }}
                icon="person-add"
                value={String(data.kpis.newRegistrations.value)}
                label="NEW · 30 DAYS"
              />
              <StatTile
                style={{ flex: 1 }}
                icon="barbell"
                tint={colors.warning}
                value={String(data.kpis.workoutsLogged.value)}
                label="WORKOUTS · 30 DAYS"
              />
            </Row>
            <Row gap={10}>
              <StatTile
                style={{ flex: 1 }}
                icon="calendar"
                value={String(data.kpis.activePrograms)}
                label="LIVE PROGRAMS"
              />
              <StatTile
                style={{ flex: 1 }}
                icon="fitness"
                value={String(data.health.exercises.PUBLISHED ?? 0)}
                label="LIVE EXERCISES"
              />
            </Row>
          </>
        )}

        <Text variant="h3" style={{ marginTop: 8 }}>
          Manage
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {shortcuts
            .filter((s) => s.show)
            .map((s) => (
              <Card
                key={s.href}
                onPress={() => router.push(s.href as any)}
                accessibilityLabel={s.label}
                style={{
                  flexBasis: "47%",
                  flexGrow: 1,
                  gap: 12,
                  paddingVertical: 18,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "rgba(200,241,53,0.14)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={s.icon} size={20} color={colors.accent} />
                </View>
                <Text variant="bodyStrong">{s.label}</Text>
              </Card>
            ))}
        </View>

        {!!data?.mostViewedExercises?.length && (
          <>
            <Text variant="h3" style={{ marginTop: 8 }}>
              Most viewed exercises
            </Text>
            <Card style={{ gap: 12 }}>
              {data.mostViewedExercises.slice(0, 5).map((e, i) => (
                <Row key={e.id} style={{ justifyContent: "space-between" }}>
                  <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                    {i + 1}. {e.name}
                  </Text>
                  <Text variant="smallStrong" color={colors.accent}>
                    {e.views} views
                  </Text>
                </Row>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </AdminScreen>
  );
}
