import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { getConversations, getWorkspaces } from "@/communications/api";
import { Notice, TextLink } from "@/ui/components";
import { useAuthStore } from "@/auth/auth-store";
import { colors } from "@/ui/theme";

export default function ChatScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const preferredWorkspaceId = useAuthStore((state) => state.workspaceId);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(preferredWorkspaceId);
  const workspaces = useQuery({ queryKey: ["workspaces", userId], queryFn: getWorkspaces, enabled: Boolean(userId) });
  const currentWorkspaceId = selectedWorkspaceId ?? preferredWorkspaceId ?? workspaces.data?.[0]?.id ?? null;
  const conversations = useQuery({
    queryKey: ["workspace-chat", userId, currentWorkspaceId, "conversations"],
    queryFn: () => getConversations(currentWorkspaceId!),
    enabled: Boolean(currentWorkspaceId),
    refetchInterval: 30_000,
  });
  const currentWorkspace = workspaces.data?.find((workspace) => workspace.id === currentWorkspaceId);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>TEAM CHAT</Text>
        <Text style={styles.title}>Conversations</Text>
      </View>

      {workspaces.isPending ? <Text style={styles.message}>Loading your workspaces…</Text> : null}
      {workspaces.isError ? (
        <>
          <Notice>{workspaces.error instanceof Error ? workspaces.error.message : "Could not load workspaces."}</Notice>
          <TextLink title="Retry" onPress={() => void workspaces.refetch()} />
        </>
      ) : null}
      {workspaces.isSuccess && workspaces.data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No business workspace yet</Text>
          <Text style={styles.emptyBody}>Workspace conversations will appear here when you join or create a business workspace.</Text>
        </View>
      ) : null}

      {workspaces.data && workspaces.data.length > 1 ? (
        <View style={styles.workspacePicker}>
          {workspaces.data.map((workspace) => (
            <Pressable
              key={workspace.id}
              onPress={() => setSelectedWorkspaceId(workspace.id)}
              style={[styles.workspaceChip, workspace.id === currentWorkspaceId ? styles.workspaceChipActive : null]}
            >
              <Text style={[styles.workspaceChipText, workspace.id === currentWorkspaceId ? styles.workspaceChipTextActive : null]}>
                {workspace.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentWorkspace ? <Text style={styles.workspaceName}>{currentWorkspace.name}</Text> : null}
      {conversations.isPending && currentWorkspaceId ? <Text style={styles.message}>Loading conversations…</Text> : null}
      {conversations.isError ? (
        <>
          <Notice>{conversations.error instanceof Error ? conversations.error.message : "Could not load conversations."}</Notice>
          <TextLink title="Retry" onPress={() => void conversations.refetch()} />
        </>
      ) : null}
      {conversations.isSuccess && conversations.data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>Your workspace chat will appear here when there are conversations.</Text>
        </View>
      ) : null}
      {conversations.data?.map((conversation) => (
        <Link
          key={conversation.id}
          href={{
            pathname: "/(app)/conversation/[conversationId]",
            params: { conversationId: conversation.id, workspaceId: conversation.workspaceId },
          }}
          asChild
        >
          <Pressable style={styles.conversationCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{conversation.type === "WORKSPACE" ? "W" : "D"}</Text>
            </View>
            <View style={styles.conversationCopy}>
              <Text style={styles.conversationTitle}>
                {conversation.type === "WORKSPACE" ? "Workspace channel" : "Direct conversation"}
              </Text>
              <Text numberOfLines={2} style={styles.preview}>
                {conversation.lastMessage?.content ?? "No messages yet"}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  header: { gap: 8, marginBottom: 4 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  message: { color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
  workspacePicker: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  workspaceChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  workspaceChipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  workspaceChipText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  workspaceChipTextActive: { color: colors.greenDark },
  workspaceName: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: -4 },
  empty: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 6 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  conversationCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.greenWash, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.greenDark, fontSize: 13, fontWeight: "700" },
  conversationCopy: { flex: 1, gap: 4 },
  conversationTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  preview: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  arrow: { color: colors.greenDark, fontSize: 22, fontWeight: "700" },
});
