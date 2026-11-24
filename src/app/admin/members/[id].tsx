import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, View } from "react-native";

import { colors } from "@/theme/tokens";
import { confirm } from "@/lib/workout";
import { showDialog } from "@/stores/dialog";
import { api, errorMessage } from "@/lib/api";
import { lastSeen, useCan, useInvalidateAdmin, PERM } from "@/lib/admin";
import {
  AdminScreen,
  OnlineDot,
  StatusBadge,
  Toggle,
} from "@/components/admin/admin-ui";
import {
  Button,
  Card,
  ErrorState,
  FadeIn,
  Icon,
  Row,
  Skeleton,
  StatTile,
  Text,
} from "@/components/ui";

type Member = {
  id: number;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  emailVerified: boolean;
  friendCount?: number;
  createdAt: string;
  lastLoginAt: string | null;
  presence: {
    online: boolean;
    lastSeenAt: string | null;
    signedIn: boolean;
    devices: { lastActiveAt: string; userAgent: string | null }[];
  };
  onboarding: {
    status: string;
    experienceLevel: string | null;
    weeklyWorkoutDays: number | null;
    goals: { name: string; isPrimary: boolean }[];
    focusAreas: { name: string }[];
  };
  stats: {
    sessions: Record<string, number>;
    lastWorkoutAt: string | null;
    savedExercises: number;
    savedPrograms: number;
  };
};

const date = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const device = (ua: string | null) =>
  !ua
    ? "Unknown device"
    : /okhttp|Expo|CFNetwork|Dalvik/i.test(ua)
      ? `FitFlow app${/Android|okhttp|Dalvik/i.test(ua) ? " · Android" : /iPhone|iOS|CFNetwork/i.test(ua) ? " · iPhone" : ""}`
      : /Chrome/i.test(ua)
        ? "Web browser · Chrome"
        : /Safari/i.test(ua)
          ? "Web browser · Safari"
          : ua.slice(0, 36);

/** One member: presence, plan, activity and account actions. */
export default function AdminMember() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = useCan();
  const invalidate = useInvalidateAdmin();
  const manage = can(PERM.USERS_MANAGE);
  const q = useQuery({
    queryKey: ["admin", "users", "item", id],
    queryFn: () => api.get<Member>(`/admin/users/${id}`),
    refetchInterval: 30_000,
  });
  const m = q.data;

  const act = async (
    fn: () => Promise<{ message?: string } | unknown>,
    done: string,
  ) => {
    try {
      const r = (await fn()) as { message?: string } | undefined;
      invalidate("users");
      await q.refetch();
      showDialog({
        title: done,
        message: r?.message,
        icon: "checkmark-circle",
        tone: "accent",
        confirmText: "OK",
      });
    } catch (e) {
      showDialog({
        title: "Something went wrong",
        message: errorMessage(e),
        icon: "alert-circle-outline",
        tone: "danger",
        confirmText: "OK",
      });
    }
  };

  const setStatus = async (status: Member["status"]) => {
    if (!m) return;
    const verb =
      status === "ACTIVE"
        ? m.status === "SUSPENDED"
          ? "Restore"
          : "Activate"
        : status === "SUSPENDED"
          ? "Suspend"
          : "Deactivate";
    if (
      status !== "ACTIVE" &&
      !(await confirm(
        `${verb} ${m.name}?`,
        "They will be signed out on all devices and cannot log in until restored.",
        verb,
        true,
        "ban-outline",
      ))
    )
      return;
    act(
      () => api.patch(`/admin/users/${m.id}/status`, { status }),
      `${verb} done`,
    );
  };

  const forceLogout = async () => {
    if (
      !m ||
      !(await confirm(
        `Force logout ${m.name}?`,
        "They will be signed out of the app on all devices right away. They can log in again with their password.",
        "Force logout",
        true,
        "log-out-outline",
      ))
    )
      return;
    act(() => api.post(`/admin/users/${m.id}/force-logout`), "Signed out");
  };

  const resetPassword = async () => {
    if (
      !m ||
      !(await confirm(
        "Send password reset?",
        `A 6-digit reset code will be emailed to ${m.email}.`,
        "Send code",
        false,
        "key-outline",
      ))
    )
      return;
    act(
      () => api.post(`/admin/users/${m.id}/reset-password`),
      "Reset code sent",
    );
  };

  const goal =
    m?.onboarding.goals.find((g) => g.isPrimary)?.name ??
    m?.onboarding.goals[0]?.name;

  return (
    <AdminScreen title={m?.name ?? "Member"} back>
      {q.error ? (
        <View style={{ padding: 20 }}>
          <ErrorState onRetry={() => q.refetch()} />
        </View>
      ) : !m ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={120} />
          <Skeleton height={90} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingTop: 8,
            gap: 14,
            paddingBottom: 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={q.isRefetching}
              onRefresh={() => void q.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          <Card style={{ gap: 12 }}>
            <Row gap={14}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text variant="h2" color={colors.accentText}>
                  {m.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h3" numberOfLines={1}>
                  {m.name}
                </Text>
                <Text variant="small" color={colors.muted} numberOfLines={1}>
                  {m.email}
                  {m.emailVerified ? "" : " · unverified"}
                </Text>
                <Row gap={6}>
                  <OnlineDot online={m.presence.online} />
                  <Text
                    variant="caption"
                    color={m.presence.online ? "#3DDC84" : colors.muted}
                  >
                    {m.presence.online
                      ? "Online now"
                      : lastSeen(m.presence.lastSeenAt)}
                  </Text>
                  <StatusBadge status={m.status} />
                </Row>
              </View>
            </Row>
            {manage && (
              <Row
                style={{
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">Account active</Text>
                  <Text variant="caption" color={colors.muted}>
                    Off = can’t log in (deactivated)
                  </Text>
                </View>
                <Toggle
                  value={m.status === "ACTIVE"}
                  onChange={(v) => setStatus(v ? "ACTIVE" : "INACTIVE")}
                  label="Account active"
                />
              </Row>
            )}
          </Card>

          <Row gap={10}>
            <StatTile
              style={{ flex: 1 }}
              icon="barbell"
              value={String(m.stats.sessions.COMPLETED ?? 0)}
              label="WORKOUTS"
            />
            <StatTile
              style={{ flex: 1 }}
              icon="bookmark"
              value={String(m.stats.savedExercises + m.stats.savedPrograms)}
              label="SAVED"
            />
            <StatTile
              style={{ flex: 1 }}
              icon="phone-portrait"
              value={String(m.presence.devices.length)}
              label="DEVICES"
            />
          </Row>

          <Card style={{ gap: 10 }}>
            <Text variant="h3">Plan</Text>
            <Info label="Goal" value={goal} />
            <Info
              label="Focus areas"
              value={m.onboarding.focusAreas.map((f) => f.name).join(", ")}
            />
            <Info label="Experience" value={m.onboarding.experienceLevel} />
            <Info
              label="Weekly target"
              value={
                m.onboarding.weeklyWorkoutDays
                  ? `${m.onboarding.weeklyWorkoutDays} days`
                  : null
              }
            />
            <Info label="Friends" value={String(m.friendCount ?? 0)} />
            <Info label="Joined" value={date(m.createdAt)} />
            <Info label="Last login" value={date(m.lastLoginAt)} />
            <Info label="Last workout" value={date(m.stats.lastWorkoutAt)} />
          </Card>

          <Card style={{ gap: 10 }}>
            <Text variant="h3">Signed-in devices</Text>
            {m.presence.devices.length ? (
              m.presence.devices.map((d, i) => (
                <Row key={i} gap={10}>
                  <Icon
                    name="phone-portrait-outline"
                    size={18}
                    color={colors.muted}
                  />
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                    {device(d.userAgent)}
                  </Text>
                  <Text variant="caption" color={colors.muted}>
                    {date(d.lastActiveAt)}
                  </Text>
                </Row>
              ))
            ) : (
              <Text variant="small" color={colors.muted}>
                Not signed in anywhere.
              </Text>
            )}
          </Card>

          {manage && (
            <FadeIn auto style={{ gap: 10, marginTop: 4 }}>
              {m.presence.signedIn && (
                <Button
                  title="Force logout"
                  icon="log-out-outline"
                  variant="danger"
                  onPress={forceLogout}
                />
              )}
              <Button
                title="Send password reset code"
                icon="key-outline"
                variant="secondary"
                onPress={resetPassword}
              />
              {m.status === "SUSPENDED" ? (
                <Button
                  title="Restore account"
                  icon="refresh"
                  variant="secondary"
                  onPress={() => setStatus("ACTIVE")}
                />
              ) : (
                <Button
                  title="Suspend account"
                  icon="ban-outline"
                  variant="ghost"
                  onPress={() => setStatus("SUSPENDED")}
                />
              )}
            </FadeIn>
          )}
        </ScrollView>
      )}
    </AdminScreen>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <Text variant="small" color={colors.muted}>
        {label}
      </Text>
      <Text
        variant="smallStrong"
        style={{ flex: 1, textAlign: "right", marginLeft: 16 }}
      >
        {value || "—"}
      </Text>
    </Row>
  );
}
