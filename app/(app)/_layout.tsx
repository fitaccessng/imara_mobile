import { Tabs } from "expo-router";

import { colors } from "@/ui/theme";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Overview" }} />
      <Tabs.Screen name="workspace" options={{ title: "Workspace" }} />
      <Tabs.Screen name="files" options={{ title: "Files" }} />
      <Tabs.Screen name="productivity" options={{ title: "Productivity" }} />
      <Tabs.Screen name="communications" options={{ title: "Messages" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="all-pages" options={{ href: null }} />
      <Tabs.Screen name="workspace-calendar" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
      <Tabs.Screen name="biometric" options={{ href: null }} />
      <Tabs.Screen name="deep-links" options={{ href: null }} />
      <Tabs.Screen name="workspace-files" options={{ href: null }} />
      <Tabs.Screen name="workspace-file-deliveries" options={{ href: null }} />
      <Tabs.Screen name="workspace-team" options={{ href: null }} />
      <Tabs.Screen name="workspace-invite" options={{ href: null }} />
      <Tabs.Screen name="workspace-invitations" options={{ href: null }} />
      <Tabs.Screen name="workspace-activity" options={{ href: null }} />
      <Tabs.Screen name="workspace-member/[memberId]" options={{ href: null }} />
      <Tabs.Screen name="workspace-member/[memberId]/permissions" options={{ href: null }} />
      <Tabs.Screen name="workspace-chat" options={{ href: null }} />
      <Tabs.Screen name="workspace-approvals" options={{ href: null }} />
      <Tabs.Screen name="signatures" options={{ href: null }} />
      <Tabs.Screen name="approval-workflow" options={{ href: null }} />
      <Tabs.Screen name="reminders" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="conversation/[conversationId]" options={{ href: null }} />
      <Tabs.Screen name="offline-support" options={{ href: null }} />
      <Tabs.Screen name="native-support" options={{ href: null }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
      <Tabs.Screen name="file-favorites" options={{ href: null }} />
      <Tabs.Screen name="file-trash" options={{ href: null }} />
      <Tabs.Screen name="file-search" options={{ href: null }} />
      <Tabs.Screen name="smart-files" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="account-settings" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="file-requests" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="document-tools" options={{ href: null }} />
    </Tabs>
  );
}
