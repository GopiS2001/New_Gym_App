import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { colors } from "@/theme/tokens";
import { confirm } from "@/lib/workout";
import { findModule } from "@/lib/admin-modules";
import { showDialog } from "@/stores/dialog";
import { api, errorMessage } from "@/lib/api";
import {
  useAdminItem,
  useCan,
  useInvalidateAdmin,
  PERM,
  ContentStatus,
} from "@/lib/admin";
import { AdminField } from "@/components/admin/fields";
import { AdminScreen } from "@/components/admin/admin-ui";
import {
  Button,
  Card,
  Chip,
  ErrorState,
  FadeIn,
  Icon,
  IconButton,
  Row,
  Skeleton,
  Text,
} from "@/components/ui";

const STATUSES: { key: ContentStatus; label: string; hint: string }[] = [
  { key: "DRAFT", label: "Draft", hint: "Hidden from members" },
  { key: "PUBLISHED", label: "Published", hint: "Live in the app" },
  { key: "ARCHIVED", label: "Archived", hint: "Retired, kept for history" },
];

/** Create (id = "new") or edit any content item. */
export default function AdminModuleForm() {
  const { module: key, id } = useLocalSearchParams<{
    module: string;
    id: string;
  }>();
  const mod = findModule(key);
  const router = useRouter();
  const can = useCan();
  const invalidate = useInvalidateAdmin();
  const isNew = id === "new";
  const item = useAdminItem<any>(mod?.path ?? "", id);

  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<ContentStatus>("DRAFT");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const manage = can(PERM.CONTENT_MANAGE);

  // Initialise the editable copy (render-time, no effect).
  if (mod && !form) {
    if (isNew) {
      setForm(
        Object.fromEntries(
          mod.fields.map((f) => [
            f.key,
            f.type === "multi" || f.type === "lines"
              ? []
              : f.type === "difficulty"
                ? "BEGINNER"
                : f.type === "switch"
                  ? false
                  : null,
          ]),
        ),
      );
    } else if (item.data) {
      setForm(mod.toForm(item.data));
      setStatus(item.data.status ?? "DRAFT");
    }
  }

  if (!mod) {
    return (
      <AdminScreen title="Not found" back>
        <View style={{ padding: 20 }}>
          <ErrorState message="This section doesn't exist." />
        </View>
      </AdminScreen>
    );
  }

  const title = isNew
    ? `New ${mod.singular}`
    : ((item.data?.name as string) ?? `Edit ${mod.singular}`);

  const save = async () => {
    if (!form) return;
    const missing = Object.fromEntries(
      mod.fields
        .filter(
          (f) =>
            f.required &&
            (form[f.key] == null ||
              (typeof form[f.key] === "string" &&
                !(form[f.key] as string).trim())),
        )
        .map((f) => [f.key, `${f.label} is required`]),
    );
    setErrors(missing);
    if (Object.keys(missing).length) return;

    setSaving(true);
    try {
      // Trim text and send empty text as null so optional fields can be cleared.
      const body = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [
          k,
          typeof v === "string" ? v.trim() || null : v,
        ]),
      );
      body.status = status;
      const saved = isNew
        ? await api.post<{ id: number }>(`/admin/${mod.path}`, body)
        : await api.patch<{ id: number }>(`/admin/${mod.path}/${id}`, body);
      invalidate(mod.path);
      await showDialog({
        title: isNew ? `${cap(mod.singular)} created` : "Changes saved",
        message:
          status === "PUBLISHED"
            ? "It is live in the app now."
            : status === "DRAFT"
              ? "Saved as a draft — members can’t see it yet."
              : "Saved as archived.",
        icon: "checkmark-circle",
        tone: "accent",
        confirmText: "Done",
      });
      if (isNew)
        router.replace({
          pathname: "/admin/[module]/[id]",
          params: { module: mod.key, id: String(saved.id) },
        });
      else router.back();
    } catch (e: any) {
      const details: Record<string, string> = {};
      const list = Array.isArray(e?.details)
        ? (e.details as { field?: string; message: string }[])
        : [];
      for (const d of list)
        if (d.field) details[d.field.split(".")[0]] = d.message;
      setErrors(details);
      showDialog({
        title: "Couldn't save",
        message: errorMessage(e),
        icon: "alert-circle-outline",
        tone: "danger",
        confirmText: "OK",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (
      !(await confirm(
        `Delete ${mod.singular}?`,
        `"${item.data?.name}" will be removed. This can't be undone.`,
        "Delete",
        true,
        "trash-outline",
      ))
    )
      return;
    try {
      await api.delete(`/admin/${mod.path}/${id}`);
      invalidate(mod.path);
      router.back();
    } catch (e) {
      showDialog({
        title: "Couldn't delete",
        message: errorMessage(e),
        icon: "alert-circle-outline",
        tone: "danger",
        confirmText: "OK",
      });
    }
  };

  return (
    <AdminScreen
      title={title}
      back
      right={
        !isNew && manage ? (
          <IconButton
            icon="trash-outline"
            label={`Delete ${mod.singular}`}
            color={colors.danger}
            onPress={remove}
          />
        ) : undefined
      }
    >
      {item.error ? (
        <View style={{ padding: 20 }}>
          <ErrorState onRetry={() => item.refetch()} />
        </View>
      ) : !form ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={52} />
          <Skeleton height={190} />
          <Skeleton height={52} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingTop: 8,
              gap: 20,
              paddingBottom: 40,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={{ gap: 10 }}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Visibility
              </Text>
              <Row gap={8} style={{ flexWrap: "wrap" }}>
                {STATUSES.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.label}
                    selected={status === s.key}
                    onPress={() => setStatus(s.key)}
                  />
                ))}
              </Row>
              <Text variant="caption" color={colors.muted}>
                {STATUSES.find((s) => s.key === status)?.hint}
              </Text>
            </Card>

            {mod.fields.map((f) => (
              <FadeIn key={f.key} auto distance={12}>
                <AdminField
                  field={f}
                  value={form[f.key]}
                  folder={mod.folder}
                  error={errors[f.key]}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev!, [f.key]: v }));
                    if (errors[f.key])
                      setErrors((e) => ({ ...e, [f.key]: "" }));
                  }}
                />
              </FadeIn>
            ))}

            {!!mod.dashboardNote && (
              <Card
                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
              >
                <Icon name="desktop-outline" size={18} color={colors.muted} />
                <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
                  {mod.dashboardNote}
                </Text>
              </Card>
            )}
          </ScrollView>
          {manage && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Button
                title={isNew ? `Create ${mod.singular}` : "Save changes"}
                onPress={save}
                loading={saving}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      )}
    </AdminScreen>
  );
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
