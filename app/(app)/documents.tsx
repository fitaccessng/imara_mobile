import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { createDocument, deleteDocument, getDocumentResponses, getDocuments, revokeDocumentShare, shareDocument, type PersonalDocument } from "@/documents/api";
import { getWebBaseUrl } from "@/config";
import { colors } from "@/ui/theme";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function DocumentsScreen() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [type, setType] = useState<PersonalDocument["type"]>("FORM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentJson, setContentJson] = useState('{"fields":[]}');
  const [published, setPublished] = useState(true);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");

  const documentsQuery = useQuery({ queryKey: ["personal-documents"], queryFn: getDocuments });
  const responsesQuery = useQuery({
    queryKey: ["personal-document-responses", selectedId],
    queryFn: () => getDocumentResponses(selectedId),
    enabled: Boolean(selectedId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["personal-documents"] });

  const create = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a document title.");
      let content: Record<string, unknown>;
      try { content = JSON.parse(contentJson) as Record<string, unknown>; }
      catch { throw new Error("Document content must be valid JSON."); }
      return createDocument({ type, title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}), content, published });
    },
    onSuccess: async () => {
      setOpen(false); setTitle(""); setDescription(""); setContentJson('{"fields":[]}'); setError(""); await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The document could not be created."),
  });

  const remove = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: refresh,
  });

  async function share(documentId: string) {
    setError(""); setShareLink("");
    try {
      const result = await shareDocument(documentId);
      setShareLink(`${getWebBaseUrl()}/respond/${encodeURIComponent(result.token)}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The share link could not be created."); }
  }

  async function revoke(documentId: string) {
    setError("");
    try { await revokeDocumentShare(documentId); setShareLink(""); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The share link could not be revoked."); }
  }

  function confirmDelete(document: PersonalDocument) {
    Alert.alert("Delete this document?", `${document.title} will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(document.id) },
    ]);
  }

  if (documentsQuery.isPending) return <State title="Loading documents…" />;
  if (documentsQuery.isError) return <State title="Documents couldn’t load" detail={message(documentsQuery.error)} retry={() => void documentsQuery.refetch()} />;

  const documents = documentsQuery.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>DOCUMENT STUDIO</Text><Text style={styles.title}>Forms & documents</Text><Text style={styles.subtitle}>Create forms and agreements with shareable responses.</Text></View><Pressable onPress={() => { setError(""); setOpen(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ New</Text></Pressable></View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {shareLink ? <View style={styles.shareCard}><Text style={styles.kicker}>PUBLIC RESPONSE LINK</Text><Text selectable style={styles.shareLink}>{shareLink}</Text></View> : null}
      {!documents.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No documents yet</Text><Text style={styles.subtitle}>Create a form, agreement or invoice.</Text></View> : documents.map((document) => (
        <View key={document.id} style={[styles.documentCard, selectedId === document.id ? styles.selected : null]}>
          <Pressable onPress={() => { setSelectedId(document.id); setShareLink(""); }} style={styles.documentCopy}><Text style={styles.documentTitle}>{document.title}</Text><Text style={styles.meta}>{document.type.toLowerCase()} · {document.published ? "published" : "draft"} · updated {dateFormat.format(new Date(document.updatedAt))}</Text>{document.description ? <Text numberOfLines={2} style={styles.description}>{document.description}</Text> : null}</Pressable>
          <View style={styles.documentActions}><Pressable onPress={() => void share(document.id)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Share</Text></Pressable>{document.shareToken ? <Pressable onPress={() => void revoke(document.id)} style={styles.cancelButton}><Text style={styles.cancelText}>Revoke</Text></Pressable> : null}<Pressable onPress={() => confirmDelete(document)} style={styles.cancelButton}><Text style={styles.cancelText}>Delete</Text></Pressable></View>
        </View>
      ))}
      {selectedId ? <View style={styles.responsesCard}><Text style={styles.sectionTitle}>Responses</Text>{responsesQuery.isPending ? <Text style={styles.meta}>Loading responses…</Text> : responsesQuery.isError ? <Pressable onPress={() => void responsesQuery.refetch()}><Text style={styles.retry}>Retry responses</Text></Pressable> : (responsesQuery.data ?? []).length ? (responsesQuery.data ?? []).map((response, index) => <Text key={index} selectable style={styles.responseText}>{JSON.stringify(response)}</Text>) : <Text style={styles.meta}>No responses yet.</Text>}</View> : null}

      <Modal animationType="slide" transparent onRequestClose={() => setOpen(false)} visible={open}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView contentContainerStyle={styles.sheetContent}><Text style={styles.kicker}>NEW DOCUMENT</Text><Text style={styles.sheetTitle}>Create in Document Studio</Text><Text style={styles.label}>Type</Text><View style={styles.choiceRow}>{(["FORM", "AGREEMENT", "INVOICE"] as const).map((item) => <Pressable key={item} onPress={() => setType(item)} style={[styles.choice, type === item ? styles.choiceSelected : null]}><Text style={[styles.choiceText, type === item ? styles.choiceTextSelected : null]}>{item.toLowerCase()}</Text></Pressable>)}</View><Text style={styles.label}>Title</Text><TextInput maxLength={160} value={title} onChangeText={setTitle} placeholder="Document title" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Description</Text><TextInput maxLength={1000} value={description} onChangeText={setDescription} placeholder="Optional description" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>Content JSON</Text><TextInput multiline maxLength={50000} value={contentJson} onChangeText={setContentJson} autoCapitalize="none" autoCorrect={false} placeholder='{"fields":[]}' placeholderTextColor={colors.muted} style={[styles.input, styles.jsonInput]} /><View style={styles.publishRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: published }} onPress={() => setPublished((value) => !value)} style={[styles.checkbox, published ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{published ? "✓" : ""}</Text></Pressable><Text style={styles.label}>Published</Text></View>{error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable disabled={create.isPending} onPress={() => { setError(""); create.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{create.isPending ? "Creating…" : "Create document"}</Text></Pressable></View></ScrollView></View></View></Modal>
    </ScrollView>
  );
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.documentTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>;
}
function message(error: unknown): string { return error instanceof Error ? error.message : "Please try again."; }

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 }, headerCopy: { flex: 1, gap: 4 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" }, secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, alignItems: "center" }, secondaryButtonText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" }, cancelButton: { backgroundColor: colors.redWash, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 }, cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  documentCard: { gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 }, selected: { borderColor: colors.green }, documentCopy: { gap: 4 }, documentTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" }, meta: { color: colors.muted, fontSize: 8, lineHeight: 13 }, description: { color: colors.text, fontSize: 10, lineHeight: 15 }, documentActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  shareCard: { gap: 5, borderWidth: 1, borderColor: colors.green, borderRadius: 12, backgroundColor: colors.greenWash, padding: 10 }, shareLink: { color: colors.greenDark, fontSize: 9, lineHeight: 14 }, empty: { alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 }, emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" }, responsesCard: { gap: 7, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 }, sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" }, responseText: { color: colors.text, backgroundColor: colors.background, borderRadius: 8, padding: 8, fontSize: 9, lineHeight: 14 }, retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 8, fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" }, sheet: { maxHeight: "90%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 }, grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 }, sheetContent: { gap: 9, paddingBottom: 10 }, sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" }, label: { color: colors.ink, fontSize: 10, fontWeight: "800" }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 }, jsonInput: { minHeight: 130, textAlignVertical: "top", fontFamily: "monospace" }, choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 }, choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green }, choiceText: { color: colors.muted, fontSize: 8, fontWeight: "700" }, choiceTextSelected: { color: colors.greenDark }, publishRow: { flexDirection: "row", alignItems: "center", gap: 8 }, checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, checkboxActive: { backgroundColor: colors.green, borderColor: colors.green }, checkmark: { color: colors.surface, fontSize: 10, fontWeight: "800" }, actions: { flexDirection: "row", gap: 8 }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
