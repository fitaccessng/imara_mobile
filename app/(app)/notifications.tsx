import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/api/client";
import { useAuthStore } from "@/auth/auth-store";
import {
  getAllNotifications,
  markNotificationRead,
  markWorkspaceNotificationRead,
  type NotificationItem,
} from "@/communications/api";
import { Notice, TextLink } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function NotificationsScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["communications", userId, "notifications"],
    queryFn: getAllNotifications,
    enabled: Boolean(userId),
    refetchInterval: 30_000,
  });
  const markRead = useMutation({
    mutationFn: (item: NotificationItem) =>
      item.workspaceId
        ? markWorkspaceNotificationRead(item.workspaceId, item.id)
        : markNotificationRead(item.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communications", userId, "notifications"] }),
  });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>NOTIFICATIONS</Text>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {notifications.isPending ? <Text style={styles.message}>Loading your notifications…</Text> : null}
      {notifications.isError ? (
        <>
          <Notice>{notifications.error instanceof Error ? notifications.error.message : "Could not load notifications."}</Notice>
          <TextLink title="Retry" onPress={() => void notifications.refetch()} />
        </>
      ) : null}
      {markRead.isError ? (
        <Notice>{markRead.error instanceof ApiError ? markRead.error.message : "Could not update notification."}</Notice>
      ) : null}
      {notifications.isSuccess && notifications.data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>You’re all caught up</Text>
          <Text style={styles.emptyBody}>New account and personal-space alerts will appear here.</Text>
        </View>
      ) : null}
      {notifications.data?.map((item) => (
        <View key={item.id} style={[styles.card, item.readAt ? styles.readCard : null]}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.type.replaceAll("_", " ")}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.itemDetail}>{item.message}</Text>
          {!item.readAt ? (
            <Pressable
              accessibilityRole="button"
              disabled={markRead.isPending}
              onPress={() => markRead.mutate(item)}
              style={styles.readAction}
            >
              <Text style={styles.readText}>Mark as read</Text>
            </Pressable>
          ) : (
            <Text style={styles.readStatus}>Read</Text>
          )}
        </View>
      ))}

      <Link href="/(app)/communications" asChild>
        <Pressable>
          <Text style={styles.link}>Back to communications</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 14,
  },
  header: { gap: 8, marginBottom: 4 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  message: { color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
  empty: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 6 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 },
  readCard: { opacity: 0.72 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: "700", textTransform: "capitalize", flex: 1 },
  itemDetail: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  readAction: { alignSelf: "flex-start", paddingVertical: 5 },
  readText: { color: colors.greenDark, fontSize: 12, fontWeight: "700" },
  readStatus: { color: colors.muted, fontSize: 11 },
  link: { color: colors.greenDark, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
});
