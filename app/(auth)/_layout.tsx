import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/auth/auth-store";
import { ScreenMessage } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <ScreenMessage title="Your space, in sync." message="Checking your secure IMARA session…" />;
  }
  if (status === "signedIn") return <Redirect href="/(app)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "fade",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
