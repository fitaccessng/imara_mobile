import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File as LocalFile } from "expo-file-system";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { uploadPersonalFile, uploadWorkspaceFile } from "@/files/api";
import { getCalendarEvents } from "@/calendar/api";
import { getWorkspaces } from "@/communications/api";
import { createMeetingTask, deleteMeeting, getMeetings, saveMeeting, type MeetingRecord } from "@/productivity/api";
import { colors } from "@/ui/theme";

export default function MeetingsScreen() {
  const queryClient = useQueryClient();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<MeetingRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [decisions, setDecisions] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [originalActionItems, setOriginalActionItems] = useState("");
  const [recordingFileId, setRecordingFileId] = useState("");
  const [calendarEventId, setCalendarEventId] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const meetingsQuery = useQuery({
    queryKey: ["productivity-meetings", workspaceId ?? "personal"],
    queryFn: () => getMeetings(workspaceId ?? undefined),
  });
  const eventsQuery = useQuery({
    queryKey: ["calendar-events", workspaceId ?? "personal"],
    queryFn: () => getCalendarEvents(workspaceId ?? undefined),
    enabled: open,
  });
  const events = (eventsQuery.data ?? []).filter((event) => !event.linkedMeetingId);

  useEffect(() => () => {
    if (recorder.isRecording) void recorder.stop();
  }, [recorder]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productivity-meetings", workspaceId ?? "personal"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar-events", workspaceId ?? "personal"] }),
    queryClient.invalidateQueries({ queryKey: ["productivity-tasks", workspaceId ?? "personal"] }),
  ]);
  const save = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a meeting title.");
      const start = startedAt.trim() ? new Date(startedAt.trim()) : null;
      const end = endedAt.trim() ? new Date(endedAt.trim()) : null;
      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        throw new Error("Enter meeting times in ISO format, such as 2026-11-17T09:00.");
      }
      if (start && end && end < start) throw new Error("The end time must be after the start time.");
      const actionTitles = actionItems.split("\n").map((item) => item.trim()).filter(Boolean);
      return saveMeeting({
        title: title.trim(),
        startedAt: start?.toISOString() ?? null,
        endedAt: end?.toISOString() ?? null,
        transcript,
        summary: summary.trim() || null,
        decisions: decisions.split("\n").map((item) => item.trim()).filter(Boolean),
        recordingFileId: recordingFileId || null,
        calendarEventId: calendarEventId || null,
        ...(!editing || actionItems !== originalActionItems ? { actionItems: actionTitles.map((item) => ({ title: item })) } : {}),
      }, workspaceId ?? undefined, editing?.id);
    },
    onSuccess: async () => {
      setOpen(false);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The meeting could not be saved."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteMeeting(id, workspaceId ?? undefined),
    onSuccess: refresh,
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The meeting could not be deleted."),
  });
  const makeTask = useMutation({
    mutationFn: ({ meetingId, actionItemId }: { meetingId: string; actionItemId: string }) =>
      createMeetingTask(meetingId, actionItemId, workspaceId ?? undefined),
    onSuccess: refresh,
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The task could not be created."),
  });

  function startCreate() {
    setEditing(null);
    setTitle("");
    setStartedAt(new Date().toISOString().slice(0, 16));
    setEndedAt("");
    setTranscript("");
    setSummary("");
    setDecisions("");
    setActionItems("");
    setOriginalActionItems("");
    setRecordingFileId("");
    setCalendarEventId("");
    setError("");
    setOpen(true);
  }

  function startEdit(meeting: MeetingRecord) {
    const actionText = meeting.actionItems.map((item) => item.title).join("\n");
    setEditing(meeting);
    setTitle(meeting.title);
    setStartedAt(meeting.startedAt ? new Date(meeting.startedAt).toISOString().slice(0, 16) : "");
    setEndedAt(meeting.endedAt ? new Date(meeting.endedAt).toISOString().slice(0, 16) : "");
    setTranscript(meeting.transcript);
    setSummary(meeting.summary ?? "");
    setDecisions(meeting.decisions.join("\n"));
    setActionItems(actionText);
    setOriginalActionItems(actionText);
    setRecordingFileId(meeting.recordingFileId ?? "");
    setCalendarEventId(meeting.calendarEventId ?? "");
    setError("");
    setOpen(true);
  }

  async function uploadRecordingFile(file: LocalFile) {
    setIsUploading(true);
    setError("");
    try {
      const stored = workspaceId
        ? await uploadWorkspaceFile(workspaceId, file, null)
        : await uploadPersonalFile(file, null);
      setRecordingFileId(stored.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The recording could not be uploaded.");
    } finally {
      setIsUploading(false);
    }
  }

  async function startRecording() {
    setError("");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to record a meeting.");
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Recording could not start.");
    }
  }

  async function stopRecording() {
    setError("");
    setIsRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("The recording file could not be found.");
      await uploadRecordingFile(new LocalFile(uri));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The recording could not be saved.");
    }
  }

  async function pickRecording() {
    setError("");
    try {
      const result = await LocalFile.pickFileAsync({ mimeTypes: ["audio/*"] });
      if (!result.canceled) await uploadRecordingFile(result.result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The audio file picker could not be opened.");
    }
  }

  function confirmDelete(meeting: MeetingRecord) {
    Alert.alert("Delete meeting?", meeting.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(meeting.id) },
    ]);
  }

  if (workspacesQuery.isPending || meetingsQuery.isPending) return <State title="Loading meetings…" />;
  if (meetingsQuery.isError) return <State title="Meetings couldn’t load" detail={message(meetingsQuery.error)} retry={() => void meetingsQuery.refetch()} />;
  const meetings = meetingsQuery.data ?? [];

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>{workspaceId ? "BUSINESS WORKSPACE" : "PERSONAL WORKSPACE"}</Text><Text style={styles.title}>Meeting Room</Text><Text style={styles.subtitle}>Record or upload audio, then add a manual transcript, decisions and follow-ups.</Text></View><Pressable onPress={startCreate} style={styles.primary}><Text style={styles.primaryText}>＋ New</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}><Pressable onPress={() => setWorkspaceId(null)} style={[styles.scope, !workspaceId && styles.scopeActive]}><Text style={[styles.scopeText, !workspaceId && styles.scopeTextActive]}>Personal</Text></Pressable>{(workspacesQuery.data ?? []).map((workspace) => <Pressable key={workspace.id} onPress={() => setWorkspaceId(workspace.id)} style={[styles.scope, workspaceId === workspace.id && styles.scopeActive]}><Text style={[styles.scopeText, workspaceId === workspace.id && styles.scopeTextActive]}>{workspace.name}</Text></Pressable>)}</ScrollView>
      {!meetings.length ? <View style={styles.empty}><Text style={styles.cardTitle}>No meeting records yet</Text><Text style={styles.subtitle}>Create a meeting record to keep its transcript, decisions and action items together.</Text><Pressable onPress={startCreate} style={styles.secondary}><Text style={styles.secondaryText}>Add a meeting</Text></Pressable></View> : meetings.map((meeting) => <View key={meeting.id} style={styles.card}>
        <Pressable onPress={() => startEdit(meeting)} style={styles.meetingCopy}><Text style={styles.cardTitle}>{meeting.title}</Text><Text style={styles.meta}>{meeting.startedAt ? dateLabel(meeting.startedAt) : "No date"}{meeting.calendarEvent ? ` · ${meeting.calendarEvent.title}` : ""}</Text>{meeting.summary ? <Text style={styles.body}>{meeting.summary}</Text> : null}{meeting.recordingFile ? <Text style={styles.meta}>Recording: {meeting.recordingFile.originalName ?? meeting.recordingFile.name}</Text> : null}</Pressable>
        <Pressable onPress={() => confirmDelete(meeting)} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable>
        {meeting.actionItems.map((item) => <View key={item.id} style={styles.actionItem}><Text style={styles.body}>{item.title}</Text><Pressable disabled={Boolean(item.personalTaskId || item.workspaceTaskId) || makeTask.isPending} onPress={() => makeTask.mutate({ meetingId: meeting.id, actionItemId: item.id })} style={styles.taskButton}><Text style={styles.taskButtonText}>{item.personalTaskId || item.workspaceTaskId ? "Task created" : "Create task"}</Text></Pressable></View>)}
      </View>)}
      {error && !open ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
          <Text style={styles.kicker}>{workspaceId ? "SHARED MEETING" : "PERSONAL MEETING"}</Text><Text style={styles.sheetTitle}>{editing ? "Edit meeting" : "New meeting"}</Text>
          <Text style={styles.label}>Title</Text><TextInput maxLength={200} value={title} onChangeText={setTitle} placeholder="Meeting title" style={styles.input} />
          <Text style={styles.label}>Start · ISO date/time</Text><TextInput autoCapitalize="none" value={startedAt} onChangeText={setStartedAt} placeholder="2026-11-17T09:00" style={styles.input} />
          <Text style={styles.label}>End · ISO date/time</Text><TextInput autoCapitalize="none" value={endedAt} onChangeText={setEndedAt} placeholder="2026-11-17T10:00" style={styles.input} />
          <Text style={styles.label}>Link calendar event</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}><Pressable onPress={() => setCalendarEventId("")} style={[styles.scope, !calendarEventId && styles.scopeActive]}><Text style={[styles.scopeText, !calendarEventId && styles.scopeTextActive]}>None</Text></Pressable>{events.map((event) => <Pressable key={event.id} onPress={() => setCalendarEventId(event.id)} style={[styles.scope, calendarEventId === event.id && styles.scopeActive]}><Text style={[styles.scopeText, calendarEventId === event.id && styles.scopeTextActive]}>{event.title}</Text></Pressable>)}</ScrollView>
          <Text style={styles.label}>Transcript · entered manually</Text><TextInput multiline maxLength={100000} value={transcript} onChangeText={setTranscript} placeholder="IMARA does not send audio for cloud transcription." style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>Summary</Text><TextInput multiline maxLength={20000} value={summary} onChangeText={setSummary} placeholder="Meeting summary" style={[styles.input, styles.multilineShort]} />
          <Text style={styles.label}>Decisions · one per line</Text><TextInput multiline value={decisions} onChangeText={setDecisions} style={[styles.input, styles.multilineShort]} />
          <Text style={styles.label}>Action items · one per line</Text><TextInput multiline editable={!editing} value={actionItems} onChangeText={setActionItems} placeholder="Follow-ups will be saved as meeting action items." style={[styles.input, styles.multilineShort]} />
          <Text style={styles.label}>Recording</Text><View style={styles.actions}><Pressable disabled={isUploading} onPress={() => void pickRecording()} style={styles.secondary}><Text style={styles.secondaryText}>Upload audio</Text></Pressable><Pressable disabled={isUploading} onPress={() => void (isRecording ? stopRecording() : startRecording())} style={[styles.secondary, isRecording && styles.recordingButton]}><Text style={[styles.secondaryText, isRecording && styles.recordingText]}>{isRecording ? "Stop and upload" : "Record here"}</Text></Pressable></View>
          {isUploading ? <Text style={styles.meta}>Uploading recording…</Text> : recordingFileId ? <Text style={styles.meta}>Recording uploaded and ready to link.</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable disabled={save.isPending || isRecording || isUploading} onPress={() => { setError(""); save.mutate(); }} style={styles.primary}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Save meeting"}</Text></Pressable></View>
        </ScrollView></View></View>
      </Modal>
    </ScrollView>
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}>{!detail ? <ActivityIndicator color={colors.green} /> : null}<Text style={styles.cardTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}{retry ? <Pressable onPress={retry}><Text style={styles.retry}>Try again</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 650, alignSelf: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  primary: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center" },
  primaryText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  secondary: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, alignItems: "center" },
  secondaryText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  scopes: { flexDirection: "row", gap: 7, paddingVertical: 2 },
  scope: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  scopeActive: { borderColor: colors.green, backgroundColor: colors.greenWash },
  scopeText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  scopeTextActive: { color: colors.greenDark },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11, gap: 8 },
  meetingCopy: { gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  body: { color: colors.text, fontSize: 10, lineHeight: 15 },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  delete: { alignSelf: "flex-end", backgroundColor: colors.redWash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  deleteText: { color: colors.red, fontSize: 8, fontWeight: "800" },
  actionItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  taskButton: { backgroundColor: colors.greenWash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  taskButtonText: { color: colors.greenDark, fontSize: 8, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 12 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  multiline: { minHeight: 130, textAlignVertical: "top" },
  multilineShort: { minHeight: 70, textAlignVertical: "top" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 },
  recordingButton: { backgroundColor: colors.redWash },
  recordingText: { color: colors.red },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
