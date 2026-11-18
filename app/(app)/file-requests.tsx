import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getWebBaseUrl } from "@/config";
import { createFileRequest, getFileRequests, revokeFileRequest } from "@/file-requests/api";
import { colors } from "@/ui/theme";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function FileRequestsScreen() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const requestsQuery = useQuery({ queryKey: ["file-requests"], queryFn: getFileRequests });

  const create = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a request title.");
      return createFileRequest({ title: title.trim(), ...(instruction.trim() ? { message: instruction.trim() } : {}) });
    },
    onSuccess: async (created) => {
      setOpen(false); setTitle(""); setInstruction(""); setError(""); setLink(`${getWebBaseUrl()}/request/${encodeURIComponent(created.token)}`);
      await queryClient.invalidateQueries({ queryKey: ["file-requests"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The file request could not be created."),
  });

  const revoke = useMutation({
    mutationFn: (requestId: string) => revokeFileRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["file-requests"] }),
  });

  if (requestsQuery.isPending) return <State title="Loading file requests…" />;
  if (requestsQuery.isError) return <State title="File requests couldn’t load" detail={message(requestsQuery.error)} retry={() => void requestsQuery.refetch()} />;
  const requests = requestsQuery.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>COLLECT FILES</Text><Text style={styles.title}>File requests</Text><Text style={styles.subtitle}>Ask people to upload files through a public link.</Text></View><Pressable onPress={() => { setError(""); setOpen(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ Request</Text></Pressable></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {link ? <View style={styles.linkCard}><Text style={styles.kicker}>PUBLIC UPLOAD LINK</Text><Text selectable style={styles.linkText}>{link}</Text></View> : null}
      {!requests.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No file requests yet</Text><Text style={styles.subtitle}>Create a request and share its public upload link.</Text></View> : requests.map((item) => (
        <View key={item.id} style={styles.requestCard}><View style={styles.requestCopy}><Text style={styles.requestTitle}>{item.title}</Text>{item.message ? <Text style={styles.description}>{item.message}</Text> : null}<Text style={styles.meta}>Created {dateFormat.format(new Date(item.createdAt))} · {item.revokedAt ? "revoked" : "active"}</Text></View>{!item.revokedAt ? <><Pressable onPress={() => setLink(`${getWebBaseUrl()}/request/${encodeURIComponent(item.token)}`)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>View link</Text></Pressable><Pressable onPress={() => Alert.alert("Revoke this request?", "The public upload link will stop accepting files.", [{ text: "Cancel", style: "cancel" }, { text: "Revoke", style: "destructive", onPress: () => revoke.mutate(item.id) }])} style={styles.cancelButton}><Text style={styles.cancelText}>Revoke</Text></Pressable></> : null}</View>
      ))}
      <Modal animationType="slide" transparent onRequestClose={() => setOpen(false)} visible={open}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView contentContainerStyle={styles.sheetContent}><Text style={styles.kicker}>NEW COLLECTION</Text><Text style={styles.sheetTitle}>Create file request</Text><Text style={styles.label}>Title</Text><TextInput maxLength={120} value={title} onChangeText={setTitle} placeholder="What should people upload?" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Message · optional</Text><TextInput multiline maxLength={2000} value={instruction} onChangeText={setInstruction} placeholder="Add instructions" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} />{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable disabled={create.isPending} onPress={() => { setError(""); create.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{create.isPending ? "Creating…" : "Create request"}</Text></Pressable></View></ScrollView></View></View></Modal>
    </ScrollView>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) { return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.requestTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>; }
function message(error: unknown): string { return error instanceof Error ? error.message : "Please try again."; }

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 }, header: { flexDirection: "row", alignItems: "center", gap: 10 }, headerCopy: { flex: 1, gap: 4 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" }, secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, alignItems: "center" }, secondaryButtonText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" }, cancelButton: { backgroundColor: colors.redWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 }, cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  linkCard: { gap: 5, borderWidth: 1, borderColor: colors.green, borderRadius: 12, backgroundColor: colors.greenWash, padding: 10 }, linkText: { color: colors.greenDark, fontSize: 9, lineHeight: 14 }, requestCard: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 }, requestCopy: { flex: 1, gap: 3 }, requestTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, description: { color: colors.text, fontSize: 10, lineHeight: 15 }, meta: { color: colors.muted, fontSize: 8, lineHeight: 13 }, empty: { alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" }, sheet: { maxHeight: "88%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 }, grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 }, sheetContent: { gap: 9, paddingBottom: 10 }, sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" }, label: { color: colors.ink, fontSize: 10, fontWeight: "800" }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 }, textarea: { minHeight: 100, textAlignVertical: "top" }, actions: { flexDirection: "row", gap: 8 }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 8, fontSize: 10 }, retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
