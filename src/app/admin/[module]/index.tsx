import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";

import { colors } from "@/theme/tokens";
import { useDebouncedValue } from "@/lib/hooks";
import { findModule } from "@/lib/admin-modules";
import { showDialog } from "@/stores/dialog";
import { errorMessage } from "@/lib/api";
import { useAdminList, useAdminPatch, useCan, PERM } from "@/lib/admin";
import {
  AdminRow,
  AdminScreen,
  Fab,
  SearchBar,
  StatusBadge,
  Toggle,
} from "@/components/admin/admin-ui";
import {
  Chip,
  EmptyState,
  ErrorState,
  Row,
  Skeleton,
  Text,
} from "@/components/ui";

const FILTERS = [
  { key: "", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Draft" },
  { key: "ARCHIVED", label: "Archived" },
];

/** List for any content module: search, status filter, publish toggle, add. */
export default function AdminModuleList() {
  const { module: key } = useLocalSearchParams<{ module: string }>();
  const mod = findModule(key);
  const router = useRouter();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebouncedValue(search, 300);
  const list = useAdminList<any>(mod?.path ?? "", {
    search: q || undefined,
    status: status || undefined,
  });
  const patch = useAdminPatch(mod?.path ?? "");
  const manage = can(PERM.CONTENT_MANAGE);

  if (!mod) {
    return (
      <AdminScreen title="Not found">
        <View style={{ padding: 20 }}>
          <ErrorState message="This section doesn't exist." />
        </View>
      </AdminScreen>
    );
  }

  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;

  const setPublished = (r: any, on: boolean) =>
    patch.mutate(
      {
        id: r.id,
        url: "/status",
        body: { status: on ? "PUBLISHED" : "DRAFT" },
      },
      {
        onError: (e) =>
          showDialog({
            title: on ? "Couldn't publish" : "Couldn't unpublish",
            message: errorMessage(e),
            icon: "alert-circle-outline",
            tone: "danger",
            confirmText: "OK",
          }),
      },
    );

  const setExtra = (r: any, on: boolean) =>
    patch.mutate(
      { id: r.id, body: { [mod.extraToggle!.key]: on } },
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
    <AdminScreen title={mod.title}>
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={`Search ${mod.title.toLowerCase()}`}
        />
        <Row gap={8}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              small
              selected={status === f.key}
              onPress={() => setStatus(f.key)}
            />
          ))}
        </Row>
        <Text variant="caption" color={colors.muted}>
          {total} {total === 1 ? mod.singular : mod.title.toLowerCase()}
        </Text>
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
              icon={mod.icon}
              title={
                q || status
                  ? "Nothing matches"
                  : `No ${mod.title.toLowerCase()} yet`
              }
              message={
                manage && !q && !status
                  ? `Tap “Add ${mod.singular}” to create the first one.`
                  : "Try a different search or filter."
              }
            />
          }
          renderItem={({ item: r }) => (
            <AdminRow
              title={r.name}
              subtitle={mod.subtitle(r)}
              imageUri={r.imageUrl}
              videoUri={r.videoUrl}
              icon={mod.icon}
              onPress={() =>
                router.push({
                  pathname: "/admin/[module]/[id]",
                  params: { module: mod.key, id: String(r.id) },
                })
              }
              badge={
                <Row gap={6}>
                  <StatusBadge status={r.status} />
                  {mod.extraToggle && r[mod.extraToggle.key] && (
                    <StatusBadge status="FEATURED" />
                  )}
                </Row>
              }
              right={
                manage ? (
                  <Row gap={12}>
                    {mod.extraToggle && (
                      <View style={{ alignItems: "center", gap: 2 }}>
                        <Toggle
                          value={!!r[mod.extraToggle.key]}
                          onChange={(v) => setExtra(r, v)}
                          label={`${mod.extraToggle.label}: ${r.name}`}
                        />
                        <Text variant="caption" color={colors.muted}>
                          {mod.extraToggle.label}
                        </Text>
                      </View>
                    )}
                    <View style={{ alignItems: "center", gap: 2 }}>
                      <Toggle
                        value={r.status === "PUBLISHED"}
                        onChange={(v) => setPublished(r, v)}
                        label={`Published: ${r.name}`}
                      />
                      <Text
                        variant="caption"
                        color={
                          r.status === "PUBLISHED"
                            ? colors.accent
                            : colors.muted
                        }
                      >
                        {r.status === "PUBLISHED" ? "Live" : "Hidden"}
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
          label={`Add ${mod.singular}`}
          onPress={() =>
            router.push({
              pathname: "/admin/[module]/[id]",
              params: { module: mod.key, id: "new" },
            })
          }
        />
      )}
    </AdminScreen>
  );
}
