import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/auth/auth-store";
import { colors } from "@/ui/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="invite" />
          <Stack.Screen name="share" />
          <Stack.Screen name="respond" />
          <Stack.Screen name="request" />
          <Stack.Screen name="capture" />
          <Stack.Screen name="gallery" />
          <Stack.Screen name="form/[token]" />
          <Stack.Screen name="marketing" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
