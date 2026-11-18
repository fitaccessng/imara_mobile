import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { createSupportTicket, getSupportTicket, getSupportTickets, replyToSupportTicket } from "@/support/api";
import { colors } from "@/ui/theme";

const categories = ["ACCOUNT", "BILLING", "TECHNICAL", "WORKSPACE", "OTHER"] as const;
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function SupportScreen() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("TECHNICAL");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");

  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: getSupportTickets });
  const ticketQuery = useQuery({
    queryKey: ["support-ticket", selectedId],
    queryFn: () => getSupportTicket(selectedId),
    enabled: Boolean(selectedId),
  });

  const refresh = async (ticketId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId ?? selectedId] }),
    ]);
  };

  const create = useMutation({
    mutationFn: () => {
      if (!subject.trim()) throw new Error("Add a ticket subject.");
      if (!body.trim()) throw new Error("Describe the issue.");
      return createSupportTicket({ subject: subject.trim(), category, body: body.trim() });
    },
    onSuccess: async (ticket) => {
      setCreateOpen(false);
      setSubject("");
      setBody("");
      setError("");
      setSelectedId(ticket.id);
      await refresh(ticket.id);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The support ticket could not be created."),
  });

  const addReply = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("Choose a ticket first.");
      if (!reply.trim()) throw new Error("Write a reply first.");
      return replyToSupportTicket(selectedId, reply.trim());
    },
    onSuccess: async () => {
      setReply("");
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The reply could not be sent."),
  });

  if (ticketsQuery.isPending) return <State title="Loading support tickets…" />;
  if (ticketsQuery.isError) return <State title="Support couldn’t load" detail={message(ticketsQuery.error)} retry={() => void ticketsQuery.refetch()} />;

  const tickets = ticketsQuery.data ?? [];
  const ticket = ticketQuery.data;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>HELP & SUPPORT</Text><Text style={styles.title}>Support</Text><Text style={styles.subtitle}>Create and follow account or workspace issues.</Text></View>
        <Pressable onPress={() => { setError(""); setCreateOpen(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ Ticket</Text></Pressable>
      </View>

      {!tickets.length ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No support tickets</Text><Text style={styles.subtitle}>Create a ticket when you need help.</Text><Pressable onPress={() => setCreateOpen(true)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create ticket</Text></Pressable></View>
      ) : tickets.map((item) => (
        <Pressable key={item.id} onPress={() => { setSelectedId(item.id); setError(""); }} style={[styles.ticketCard, selectedId === item.id ? styles.ticketSelected : null]}>
          <View style={styles.ticketCopy}><Text numberOfLines={1} style={styles.ticketTitle}>{item.subject}</Text><Text style={styles.meta}>{item.category.toLowerCase()} · {item.status.replaceAll("_", " ").toLowerCase()}</Text><Text style={styles.meta}>{item.messageCount ?? 0} messages · updated {dateFormat.format(new Date(item.updatedAt))}</Text></View>
        </Pressable>
      ))}

      {selectedId && ticketQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
      {selectedId && ticketQuery.isError ? <View style={styles.inlineError}><Text style={styles.error}>{message(ticketQuery.error)}</Text><Pressable onPress={() => void ticketQuery.refetch()}><Text style={styles.retry}>Retry</Text></Pressable></View> : null}
      {ticket ? (
        <View style={styles.detailCard}>
          <Text style={styles.kicker}>TICKET DETAIL</Text><Text style={styles.detailTitle}>{ticket.subject}</Text><Text style={styles.meta}>{ticket.status.replaceAll("_", " ").toLowerCase()} · {ticket.category.toLowerCase()}</Text>
          {(ticket.messages ?? []).map((messageItem) => (
            <View key={messageItem.id} style={styles.message}><Text style={styles.messageAuthor}>{messageItem.author.name}</Text><Text style={styles.messageBody}>{messageItem.body}</Text><Text style={styles.meta}>{dateFormat.format(new Date(messageItem.createdAt))}</Text></View>
          ))}
          {ticket.status === "RESOLVED" ? <Text style={styles.success}>This ticket is resolved. Create a new ticket to continue.</Text> : (
            <View style={styles.replyBox}><Text style={styles.label}>Reply</Text><TextInput multiline maxLength={5000} onChangeText={setReply} value={reply} placeholder="Write a reply" placeholderTextColor={colors.muted} style={[styles.input, styles.replyInput]} />{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable disabled={addReply.isPending} onPress={() => { setError(""); addReply.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{addReply.isPending ? "Sending…" : "Send reply"}</Text></Pressable></View>
          )}
        </View>
      ) : null}

      <Modal animationType="slide" transparent onRequestClose={() => setCreateOpen(false)} visible={createOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.kicker}>NEW SUPPORT REQUEST</Text><Text style={styles.sheetTitle}>Create ticket</Text>
              <Text style={styles.label}>Subject</Text><TextInput maxLength={160} onChangeText={setSubject} value={subject} placeholder="What do you need help with?" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>Category</Text>
              <View style={styles.choiceRow}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.choice, category === item ? styles.choiceSelected : null]}><Text style={[styles.choiceText, category === item ? styles.choiceTextSelected : null]}>{item.toLowerCase()}</Text></Pressable>)}</View>
              <Text style={styles.label}>Describe the issue</Text><TextInput multiline maxLength={5000} onChangeText={setBody} value={body} placeholder="Include useful details" placeholderTextColor={colors.muted} style={[styles.input, styles.replyInput]} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}><Pressable onPress={() => setCreateOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable disabled={create.isPending} onPress={() => { setError(""); create.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{create.isPending ? "Creating…" : "Create ticket"}</Text></Pressable></View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.detailTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  ticketCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 },
  ticketSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  ticketCopy: { gap: 3 },
  ticketTitle: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  detailCard: { gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 12 },
  detailTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  message: { gap: 3, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  messageAuthor: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  messageBody: { color: colors.text, fontSize: 10, lineHeight: 16 },
  replyBox: { gap: 7, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9 },
  success: { color: colors.greenDark, fontSize: 9, fontWeight: "700" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  replyInput: { minHeight: 90, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  choiceTextSelected: { color: colors.greenDark },
  actions: { flexDirection: "row", gap: 8 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" },
  sheet: { maxHeight: "88%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  inlineError: { gap: 5, backgroundColor: colors.redWash, borderRadius: 10, padding: 9 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
