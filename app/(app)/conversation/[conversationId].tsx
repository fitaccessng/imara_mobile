import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getChatMessages, sendChatMessage } from "@/communications/api";
import { useAuthStore } from "@/auth/auth-store";
import { Notice, TextLink } from "@/ui/components";
import { colors } from "@/ui/theme";

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default function ConversationScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const { conversationId: rawConversationId, workspaceId: rawWorkspaceId } = useLocalSearchParams<{
    conversationId?: string | string[];
    workspaceId?: string | string[];
  }>();
  const conversationId = singleParam(rawConversationId);
  const workspaceId = singleParam(rawWorkspaceId);
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const messages = useQuery({
    queryKey: ["workspace-chat", userId, workspaceId, "messages", conversationId],
    queryFn: () => getChatMessages(workspaceId!, conversationId!),
    enabled: Boolean(workspaceId && conversationId),
    refetchInterval: 20_000,
  });
  const send = useMutation({
    mutationFn: () => sendChatMessage(workspaceId!, conversationId!, content.trim()),
    onSuccess: async () => {
      setContent("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-chat", userId, workspaceId, "messages", conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-chat", userId, workspaceId, "conversations"] }),
      ]);
    },
  });

  if (!workspaceId || !conversationId) {
    return (
      <View style={styles.page}>
        <Notice>This conversation link is incomplete. Return to chat and choose a conversation again.</Notice>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
        <Text style={styles.kicker}>WORKSPACE CONVERSATION</Text>
        <Text style={styles.title}>Messages</Text>
        <Link href="/(app)/chat" asChild>
          <Pressable><Text style={styles.backLink}>Back to conversations</Text></Pressable>
        </Link>
        {messages.isPending ? <Text style={styles.message}>Loading messages…</Text> : null}
        {messages.isError ? (
          <>
            <Notice>{messages.error instanceof Error ? messages.error.message : "Could not load messages."}</Notice>
            <TextLink title="Retry" onPress={() => void messages.refetch()} />
          </>
        ) : null}
        {send.isError ? <Notice>{send.error instanceof Error ? send.error.message : "Could not send this message."}</Notice> : null}
        {messages.data?.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyBody}>Messages are stored and permission-checked by your IMARA workspace.</Text>
          </View>
        ) : null}
        {messages.data?.map((message) => (
          <View key={message.id} style={[styles.messageCard, message.isMine ? styles.ownMessage : null]}>
            <View style={styles.messageHeader}>
              <Text style={styles.sender}>{message.isMine ? "You" : message.senderName}</Text>
              <Text style={styles.time}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        <Text style={styles.pollNote}>Updates refresh automatically. Live chat transport is not available in the current API.</Text>
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          maxLength={4000}
          multiline
          onChangeText={setContent}
          placeholder="Write a message"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={content}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: send.isPending || !content.trim() }}
          disabled={send.isPending || !content.trim()}
          onPress={() => send.mutate()}
          style={[styles.sendButton, send.isPending || !content.trim() ? styles.sendDisabled : null]}
        >
          <Text style={styles.sendText}>{send.isPending ? "…" : "Send"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 12 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5, marginBottom: 4 },
  backLink: { color: colors.greenDark, fontSize: 13, fontWeight: "700", paddingBottom: 8 },
  message: { color: colors.muted, fontSize: 14, textAlign: "center", paddingVertical: 20 },
  empty: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 6 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  messageCard: { alignSelf: "flex-start", maxWidth: "90%", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 13, gap: 6 },
  ownMessage: { alignSelf: "flex-end", backgroundColor: colors.greenWash, borderColor: colors.greenWash },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", gap: 18 },
  sender: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  time: { color: colors.muted, fontSize: 10 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  pollNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center", paddingVertical: 10 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  sendButton: { backgroundColor: colors.green, borderRadius: 14, minHeight: 44, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.55 },
  sendText: { color: colors.surface, fontSize: 13, fontWeight: "700" },
});
