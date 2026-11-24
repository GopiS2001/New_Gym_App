import { useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { colors } from "@/theme/tokens";
import { showDialog } from "@/stores/dialog";
import { api, errorMessage } from "@/lib/api";
import { useInvalidateAdmin } from "@/lib/admin";
import { AdminScreen } from "@/components/admin/admin-ui";
import { Button, Card, Icon, Text, TextField } from "@/components/ui";

/** Create a member account (they finish onboarding when they first log in). */
export default function AdminNewMember() {
  const router = useRouter();
  const invalidate = useInvalidateAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Enter the full name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      e.email = "Enter a valid email address";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password))
      e.password = "8+ characters with upper, lower case and a number";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const m = await api.post<{ id: number }>("/admin/users", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      invalidate("users");
      await showDialog({
        title: "Member added",
        message: `${name.trim()} can now log in with ${email.trim()} and the password you set.`,
        icon: "person-add",
        tone: "accent",
        confirmText: "Done",
      });
      router.replace({
        pathname: "/admin/members/[id]",
        params: { id: String(m.id) },
      });
    } catch (err) {
      showDialog({
        title: "Couldn't add member",
        message: errorMessage(err),
        icon: "alert-circle-outline",
        tone: "danger",
        confirmText: "OK",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreen title="Add member" back>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <TextField
            label="Full name *"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoComplete="name"
          />
          <TextField
            label="Email *"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label="Temporary password *"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secure
            placeholder="8+ chars, upper, lower & number"
          />
          <Card style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Icon
              name="information-circle-outline"
              size={18}
              color={colors.muted}
            />
            <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
              Share the password with the member privately. They can change it
              in Account & privacy after logging in.
            </Text>
          </Card>
        </ScrollView>
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
            title="Add member"
            icon="person-add"
            onPress={save}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </AdminScreen>
  );
}
