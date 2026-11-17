import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getAnnouncements, markAnnouncementRead } from "@/communications/api";
import { useAuthStore } from "@/auth/auth-store";
import { Notice, TextLink } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function AnnouncementsScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const announcements = useQuery({
    queryKey: ["communications", userId, "announcements"],
    queryFn: getAnnouncements,
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
  const markRead = useMutation({
    mutationFn: markAnnouncementRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["communications", userId, "announcements"] }),
  });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>ANNOUNCEMENTS</Text>
        <Text style={styles.title}>Latest updates</Text>
      </View>

      {announcements.isPending ? <Text style={styles.message}>Loading announcements…</Text> : null}
      {announcements.isError ? (
        <>
          <Notice>{announcements.error instanceof Error ? announcements.error.message : "Could not load announcements."}</Notice>
          <TextLink title="Retry" onPress={() => void announcements.refetch()} />
        </>
      ) : null}
      {markRead.isError ? (
        <Notice>{markRead.error instanceof Error ? markRead.error.message : "Could not update announcement."}</Notice>
      ) : null}
      {announcements.isSuccess && announcements.data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No announcements yet</Text>
          <Text style={styles.emptyBody}>Important updates shared with your account will appear here.</Text>
        </View>
      ) : null}
      {announcements.data?.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.audience}>{item.audience}</Text>
          </View>
          <Text style={styles.itemBody}>{item.body}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            {!item.readAt ? (
              <Pressable accessibilityRole="button" disabled={markRead.isPending} onPress={() => markRead.mutate(item.id)}>
                <Text style={styles.readAction}>Mark as read</Text>
              </Pressable>
            ) : (
              <Text style={styles.readStatus}>Read</Text>
            )}
          </View>
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
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  itemTitle: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: "700" },
  audience: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 10, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: "700" },
  itemBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.muted, fontSize: 11 },
  readAction: { color: colors.greenDark, fontSize: 12, fontWeight: "700", paddingVertical: 5 },
  readStatus: { color: colors.muted, fontSize: 11 },
  link: { color: colors.greenDark, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 10 },
});
