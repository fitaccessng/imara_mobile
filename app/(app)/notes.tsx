import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { createNote, deleteNote, getNotes, updateNote, type Note } from "@/notes/api";
import { colors } from "@/ui/theme";

export default function NotesScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Note | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const notesQuery = useQuery({
    queryKey: ["notes", search],
    queryFn: () => getNotes(search),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const save = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a note title.");
      if (!body.trim()) throw new Error("Add note content.");
      return selected
        ? updateNote(selected.id, { title: title.trim(), body: body.trim() })
        : createNote(title.trim(), body.trim());
    },
    onSuccess: async () => {
      setOpen(false);
      setSelected(null);
      setTitle("");
      setBody("");
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The note could not be saved."),
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: async () => {
      setSelected(null);
      setOpen(false);
      await refresh();
    },
  });

  function openCreate() {
    setSelected(null);
    setTitle("");
    setBody("");
    setError("");
    setOpen(true);
  }

  function openEdit(note: Note) {
    setSelected(note);
    setTitle(note.title);
    setBody(note.body);
    setError("");
    setOpen(true);
  }

  function confirmDelete(note: Note) {
    Alert.alert("Delete this note?", "This removes the note from your personal workspace.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(note.id) },
    ]);
  }

  if (notesQuery.isPending) return <State title="Loading notes…" />;
  if (notesQuery.isError) return <State title="Notes couldn’t load" detail={message(notesQuery.error)} retry={() => void notesQuery.refetch()} />;

  const notes = notesQuery.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.kicker}>PERSONAL WORKSPACE</Text><Text style={styles.title}>Notes</Text><Text style={styles.subtitle}>Private notes that stay with your account.</Text></View>
        <Pressable onPress={openCreate} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ New</Text></Pressable>
      </View>
      <TextInput
        onChangeText={setSearch}
        value={search}
        placeholder="Search notes"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {!notes.length ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No notes yet</Text><Text style={styles.subtitle}>Create your first private note.</Text><Pressable onPress={openCreate} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create note</Text></Pressable></View>
      ) : notes.map((note) => (
        <Pressable key={note.id} onPress={() => openEdit(note)} style={styles.noteCard}>
          <View style={styles.noteCopy}><Text numberOfLines={1} style={styles.noteTitle}>{note.title}</Text><Text numberOfLines={3} style={styles.noteBody}>{note.body}</Text><Text style={styles.meta}>Updated {dateFormat.format(new Date(note.updatedAt))}</Text></View>
          <Pressable onPress={() => confirmDelete(note)} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable>
        </Pressable>
      ))}

      <Modal animationType="slide" transparent onRequestClose={() => setOpen(false)} visible={open}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={styles.kicker}>PRIVATE NOTE</Text>
              <Text style={styles.sheetTitle}>{selected ? "Edit note" : "New note"}</Text>
              <Text style={styles.label}>Title</Text>
              <TextInput autoFocus maxLength={120} onChangeText={setTitle} value={title} placeholder="Note title" placeholderTextColor={colors.muted} style={styles.input} />
              <Text style={styles.label}>Content</Text>
              <TextInput multiline maxLength={20000} onChangeText={setBody} value={body} placeholder="Write here" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => setOpen(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
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
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  search: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
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
