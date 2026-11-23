import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

import { createNote, deleteNote, getNotes, updateNote, type Note } from "@/notes/api";
import { getPersonalFiles, getWorkspaceFileListing, type PersonalFile, type WorkspaceFile } from "@/files/api";
import { getWorkspaces } from "@/communications/api";
import { colors } from "@/ui/theme";

export default function NotesScreen() {
  const route = useLocalSearchParams<{ workspaceId?: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Note | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [dictating, setDictating] = useState(false);
  const [dictationError, setDictationError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  useEffect(() => {
    if (route.workspaceId && workspacesQuery.data?.some((workspace) => workspace.id === route.workspaceId)) {
      setWorkspaceId(route.workspaceId);
    }
  }, [route.workspaceId, workspacesQuery.data]);
  const notesQuery = useQuery({
    queryKey: ["notes", workspaceId, search],
    queryFn: () => getNotes(search, workspaceId ?? undefined),
  });
  const filesQuery = useQuery<{ files: Array<PersonalFile | WorkspaceFile> }>({
    queryKey: ["note-attachments", workspaceId],
    queryFn: async () => {
      if (workspaceId) {
        const listing = await getWorkspaceFileListing(workspaceId, null);
        return { files: listing.files };
      }
      const listing = await getPersonalFiles(null);
      return { files: listing.files };
    },
    enabled: open,
  });
  const fileOptions: Array<PersonalFile | WorkspaceFile> = filesQuery.data?.files ?? [];

  useEffect(() => {
    const resultSubscription = ExpoSpeechRecognitionModule.addListener("result", (event) => {
      if (!event.isFinal) return;
      const transcript = event.results.map((result) => result.transcript.trim()).filter(Boolean).join(" ");
      if (transcript) setBody((current) => `${current}${current ? " " : ""}${transcript}`);
    });
    const endSubscription = ExpoSpeechRecognitionModule.addListener("end", () => setDictating(false));
    const errorSubscription = ExpoSpeechRecognitionModule.addListener("error", (event) => {
      setDictating(false);
      setDictationError(event.error === "language-not-supported"
        ? "The offline speech model for English is not installed."
        : event.error === "not-allowed"
          ? "Microphone or speech recognition permission was denied."
          : "On-device dictation stopped. Check microphone access and your offline speech model.");
    });
    return () => {
      resultSubscription.remove();
      endSubscription.remove();
      errorSubscription.remove();
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes", workspaceId] });

  const save = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a note title.");
      if (!body.trim()) throw new Error("Add note content.");
      return selected
        ? updateNote(selected.id, { title: title.trim(), body: body.trim(), fileIds }, workspaceId ?? undefined)
        : createNote(title.trim(), body.trim(), fileIds, workspaceId ?? undefined);
    },
    onSuccess: async () => {
      setOpen(false);
      setSelected(null);
      setTitle("");
      setBody("");
      setFileIds([]);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The note could not be saved."),
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId, workspaceId ?? undefined),
    onSuccess: async () => {
      setSelected(null);
      setOpen(false);
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The note could not be deleted."),
  });

  function openCreate() {
    setSelected(null);
    setTitle("");
    setBody("");
    setFileIds([]);
    setError("");
    setOpen(true);
  }

  function closeEditor() {
    if (dictating) ExpoSpeechRecognitionModule.stop();
    setDictating(false);
    setOpen(false);
  }

  function openEdit(note: Note) {
    setSelected(note);
    setTitle(note.title);
    setBody(note.body);
    setFileIds(note.attachments.map(({ fileId }) => fileId));
    setError("");
    setOpen(true);
  }

  function confirmDelete(note: Note) {
    Alert.alert("Delete this note?", "This removes the note from your personal workspace.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(note.id) },
    ]);
  }

  async function toggleDictation() {
    setDictationError("");
    if (dictating) {
      ExpoSpeechRecognitionModule.stop();
      setDictating(false);
      return;
    }
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      setDictationError("This device does not support on-device speech recognition.");
      return;
    }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setDictationError("Microphone and speech recognition permissions are required.");
        return;
      }
      if (Platform.OS === "android") {
        const installed = await ExpoSpeechRecognitionModule.getSupportedLocales({});
        if (!installed.installedLocales.some((locale) => locale.toLowerCase().startsWith("en"))) {
          Alert.alert("Offline language model needed", "Download an English speech model in Android's speech recognition settings, then try dictation again.", [
            { text: "Cancel", style: "cancel" },
            { text: "Download model", onPress: () => {
              void ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: "en-US" })
                .catch((cause: unknown) => setDictationError(cause instanceof Error ? cause.message : "The offline speech model download could not start."));
            } },
          ]);
          return;
        }
      }
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: false,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: true,
      });
      setDictating(true);
    } catch (cause) {
      setDictationError(cause instanceof Error ? cause.message : "On-device dictation could not start.");
    }
  }

  if (notesQuery.isPending) return <State title="Loading notes…" />;
  if (notesQuery.isError) return <State title="Notes couldn’t load" detail={message(notesQuery.error)} retry={() => void notesQuery.refetch()} />;

  const notes = notesQuery.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>{workspaceId ? "BUSINESS WORKSPACE" : "PERSONAL WORKSPACE"}</Text><Text style={styles.title}>Notes</Text><Text style={styles.subtitle}>Notes, ideas and records with document attachments.</Text></View>
        <Pressable onPress={openCreate} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ New</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeChoices}>
        <Pressable onPress={() => setWorkspaceId(null)} style={[styles.scopeButton, !workspaceId && styles.scopeButtonSelected]}><Text style={[styles.scopeText, !workspaceId && styles.scopeTextSelected]}>Personal</Text></Pressable>
        {(workspacesQuery.data ?? []).map((workspace) => <Pressable key={workspace.id} onPress={() => setWorkspaceId(workspace.id)} style={[styles.scopeButton, workspaceId === workspace.id && styles.scopeButtonSelected]}><Text style={[styles.scopeText, workspaceId === workspace.id && styles.scopeTextSelected]}>{workspace.name}</Text></Pressable>)}
      </ScrollView>
      <TextInput
        onChangeText={setSearch}
        value={search}
        placeholder="Search notes"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {!notes.length ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No notes yet</Text><Text style={styles.subtitle}>Create a note for this workspace.</Text><Pressable onPress={openCreate} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create note</Text></Pressable></View>
      ) : notes.map((note) => (
        <Pressable key={note.id} onPress={() => openEdit(note)} style={styles.noteCard}>
          <View style={styles.noteCopy}><Text numberOfLines={1} style={styles.noteTitle}>{note.title}</Text><Text numberOfLines={3} style={styles.noteBody}>{note.body}</Text>{note.attachments.length > 0 ? <Text style={styles.meta}>{note.attachments.length} attached document{note.attachments.length === 1 ? "" : "s"}</Text> : null}<Text style={styles.meta}>Updated {dateFormat.format(new Date(note.updatedAt))}</Text></View>
          <Pressable onPress={() => confirmDelete(note)} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable>
        </Pressable>
      ))}

      <Modal animationType="slide" transparent onRequestClose={closeEditor} visible={open}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.kicker}>{workspaceId ? "SHARED WORKSPACE NOTE" : "PRIVATE NOTE"}</Text>
              <Text style={styles.sheetTitle}>{selected ? "Edit note" : "New note"}</Text>
              <Text style={styles.label}>Title</Text>
              <TextInput autoFocus maxLength={120} onChangeText={setTitle} value={title} placeholder="Note title" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>Content</Text>
              <TextInput multiline maxLength={20000} onChangeText={setBody} value={body} placeholder="Write here" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} />
              <Pressable onPress={() => void toggleDictation()} style={[styles.secondaryButton, dictating && styles.stopButton]}><Text style={[styles.secondaryButtonText, dictating && styles.stopText]}>{dictating ? "■ Stop dictation" : "🎙 Dictate on this device"}</Text></Pressable>
              <Text style={styles.meta}>Dictation requires a supported, downloaded on-device speech model. Review the transcript for accuracy.</Text>
              {dictationError ? <Text accessibilityRole="alert" style={styles.error}>{dictationError}</Text> : null}
              <Text style={styles.label}>Attach documents</Text>
              {filesQuery.isPending ? <ActivityIndicator color={colors.green} /> : fileOptions.length ? fileOptions.map((file) => <Pressable key={file.id} onPress={() => setFileIds((current) => current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id])} style={styles.fileOption}><Text style={styles.fileCheck}>{fileIds.includes(file.id) ? "☑" : "□"}</Text><Text numberOfLines={1} style={styles.fileName}>{file.name}</Text></Pressable>) : <Text style={styles.meta}>Upload a file first to attach it to this note.</Text>}
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={closeEditor} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
                <Pressable disabled={save.isPending} onPress={() => { setError(""); save.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{save.isPending ? "Saving…" : "Save note"}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.noteTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, gap: 4 },
  scopeChoices: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  scopeButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  scopeButtonSelected: { borderColor: colors.green, backgroundColor: colors.greenWash },
  scopeText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  scopeTextSelected: { color: colors.greenDark },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  search: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  stopButton: { backgroundColor: colors.redWash },
  stopText: { color: colors.red },
  fileOption: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 9 },
  fileCheck: { color: colors.greenDark, fontSize: 14, fontWeight: "800" },
  fileName: { flex: 1, color: colors.text, fontSize: 10 },
  noteCard: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 },
  noteCopy: { flex: 1, gap: 4 },
  noteTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  noteBody: { color: colors.text, fontSize: 10, lineHeight: 15 },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  deleteButton: { alignSelf: "flex-start", backgroundColor: colors.redWash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  deleteText: { color: colors.red, fontSize: 8, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" },
  sheet: { maxHeight: "88%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  textarea: { minHeight: 170, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
