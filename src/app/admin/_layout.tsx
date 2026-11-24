import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";

import { colors } from "@/theme/tokens";
import { useAuth } from "@/stores/auth";
import { isAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTabBar } from "@/components/admin/admin-tab-bar";
import { useViewMode } from "@/stores/view-mode";

/** Admin area: only for accounts that logged in with an admin account. */
export default function AdminLayout() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const setMode = useViewMode((s) => s.setMode);
  // Being here means admin view (e.g. after a deep link).
  useEffect(() => setMode("admin"), [setMode]);
  if (status === "guest") return <Redirect href="/welcome" />;
  if (status === "authed" && user && !isAdmin(user))
    return <Redirect href="/(tabs)" />;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
      <AdminTabBar />
      <AdminSidebar />
    </>
  );
}
