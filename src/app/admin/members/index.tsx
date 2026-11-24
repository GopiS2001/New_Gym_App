import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";

import { colors } from "@/theme/tokens";
import { useDebouncedValue } from "@/lib/hooks";
import { showDialog } from "@/stores/dialog";
import { api, errorMessage } from "@/lib/api";
import { confirm } from "@/lib/workout";
import {
  lastSeen,
  useAdminList,
  useAdminPatch,
  useCan,
  useInvalidateAdmin,
  PERM,
} from "@/lib/admin";
import {
  AdminRow,
  AdminScreen,
  Fab,
  OnlineDot,
  SearchBar,
  StatusBadge,
  Toggle,
} from "@/components/admin/admin-ui";
import {
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  Row,
  Skeleton,
  Text,
} from "@/components/ui";

type MemberRow = {
  id: number;
  name: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  avatarUrl: string | null;
  emailVerified: boolean;
  online: boolean;
  lastSeenAt: string | null;
  signedInDevices: number;
  completedWorkouts: number;
  primaryGoal: { name: string } | null;
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "online", label: "Online" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "SUSPENDED", label: "Suspended" },
];

/** Members: search, filters, online dot, active on/off, add member. */
export default function AdminMembers() {
  const router = useRouter();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const q = useDebouncedValue(search, 300);
  const params = {
    search: q || undefined,
    ...(filter === "online"
      ? { presence: "online" }
      : filter
        ? { status: filter }
        : {}),
  };
  const list = useAdminList<MemberRow>("users", params);
  const patch = useAdminPatch("users");
  const manage = can(PERM.USERS_MANAGE);

  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const first = list.data?.pages[0] as
    { meta: { total: number }; onlineNow?: number } | undefined;

  const invalidate = useInvalidateAdmin();

  /** Signs the member out on every device right away (after confirming). */
  const forceLogout = async (m: MemberRow) => {
    const devices = m.signedInDevices;
    const ok = await confirm(
      `Force logout ${m.name}?`,
      `They will be signed out of the app on ${devices === 1 ? "their device" : `all ${devices} devices`} right away. They can log in again with their password.`,
      "Force logout",
      true,
      "log-out-outline",
    );
    if (!ok) return;
    try {
      const r = await api.post<{ message?: string }>(
        `/admin/users/${m.id}/force-logout`,
      );
      invalidate("users");
      showDialog({
        title: "Signed out",
        message: r.message,
        icon: "checkmark-circle",
        tone: "accent",
        confirmText: "OK",
      });
    } catch (e) {
      showDialog({
        title: "Couldn't sign out",
        message: errorMessage(e),
        icon: "alert-circle-outline",
        tone: "danger",
        confirmText: "OK",
      });
    }
  };

  const setActive = (m: MemberRow, on: boolean) =>
    patch.mutate(
      {
        id: m.id,
        url: "/status",
        body: { status: on ? "ACTIVE" : "INACTIVE" },
      },
      {
        onError: (e) =>
          showDialog({
            title: "Update failed",
            message: errorMessage(e),
            icon: "alert-circle-outline",
            tone: "danger",
            confirmText: "OK",
          }),
      },
    );

  return (
    <AdminScreen title="Members">
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name or email"
        />
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              small
              selected={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <Text variant="caption" color={colors.muted}>
            {first?.meta.total ?? 0} members
          </Text>
          <Row gap={6}>
            <OnlineDot online={(first?.onlineNow ?? 0) > 0} />
            <Text variant="caption" color={colors.muted}>
              {first?.onlineNow ?? 0} online now
            </Text>
          </Row>
        </Row>
      </View>

      {list.error ? (
        <View style={{ padding: 20 }}>
          <ErrorState onRetry={() => list.refetch()} />
        </View>
      ) : list.isLoading ? (
        <View style={{ padding: 20, gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} />
          ))}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 200,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => void list.refetch()}
              tintColor={colors.accent}
            />
          }
          onEndReached={() => list.hasNextPage && list.fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.accent}
                style={{ marginTop: 10 }}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="people"
              title={q || filter ? "Nothing matches" : "No members yet"}
              message={
                q || filter ? "Try a different search or filter." : undefined
              }
            />
          }
          renderItem={({ item: m }) => (
            <AdminRow
              title={m.name}
              subtitle={m.email}
              imageUri={m.avatarUrl}
              icon="person"
              onPress={() =>
                router.push({
                  pathname: "/admin/members/[id]",
                  params: { id: String(m.id) },
                })
              }
              badge={
                <Row gap={6}>
                  <OnlineDot online={m.online} />
                  <Text
                    variant="caption"
                    color={m.online ? "#3DDC84" : colors.muted}
                  >
                    {m.online ? "Online" : lastSeen(m.lastSeenAt)}
                  </Text>
                  {m.status !== "ACTIVE" && <StatusBadge status={m.status} />}
                </Row>
              }
              right={
                manage ? (
                  <Row gap={10}>
                    {m.signedInDevices > 0 && (
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <IconButton
                          icon="log-out-outline"
                          label={`Force logout ${m.name}`}
                          color={colors.danger}
                          size={36}
                          onPress={() => forceLogout(m)}
                        />
                        <Text variant="caption" color={colors.muted}>
                          Logout
                        </Text>
                      </View>
                    )}
                    <View style={{ alignItems: "center", gap: 2 }}>
                      <Toggle
                        value={m.status === "ACTIVE"}
                        onChange={(v) => setActive(m, v)}
                        label={`Active: ${m.name}`}
                      />
                      <Text
                        variant="caption"
                        color={
                          m.status === "ACTIVE" ? colors.accent : colors.muted
                        }
                      >
                        {m.status === "ACTIVE" ? "Active" : "Off"}
                      </Text>
                    </View>
                  </Row>
                ) : undefined
              }
            />
          )}
        />
      )}
      {manage && (
        <Fab
          label="Add member"
          onPress={() => router.push("/admin/members/new")}
        />
      )}
    </AdminScreen>
  );
}
