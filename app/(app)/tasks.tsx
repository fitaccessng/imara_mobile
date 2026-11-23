import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getPersonalFiles, getWorkspaceFileListing, type PersonalFile, type WorkspaceFile } from "@/files/api";
import { getWorkspaces } from "@/communications/api";
import { getWorkspaceMembers, type WorkspaceMember } from "@/workspaces/api";
import { deleteTask, getTasks, saveTask, type ProductivityTask, type TaskStatus } from "@/productivity/api";
import { colors } from "@/ui/theme";

const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export default function TasksScreen() {
  const route = useLocalSearchParams<{ workspaceId?: string }>();
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductivityTask | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [progress, setProgress] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  useEffect(() => {
    if (route.workspaceId && workspacesQuery.data?.some((workspace) => workspace.id === route.workspaceId)) {
      setWorkspaceId(route.workspaceId);
    }
  }, [route.workspaceId, workspacesQuery.data]);
  const tasksQuery = useQuery({
    queryKey: ["productivity-tasks", workspaceId ?? "personal"],
    queryFn: () => getTasks(workspaceId ?? undefined),
  });
  const filesQuery = useQuery<{ files: Array<PersonalFile | WorkspaceFile> }>({
    queryKey: ["task-files", workspaceId ?? "personal"],
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
  const membersQuery = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => getWorkspaceMembers(workspaceId!),
    enabled: open && Boolean(workspaceId),
  });
  const files: Array<PersonalFile | WorkspaceFile> = filesQuery.data?.files ?? [];
  const activeMembers = (membersQuery.data ?? []).filter((member) => member.status === "ACTIVE");
  const tasks = tasksQuery.data ?? [];

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["productivity-tasks", workspaceId ?? "personal"] }),
    queryClient.invalidateQueries({ queryKey: ["calendar-events", workspaceId ?? "personal"] }),
  ]);
  const save = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Add a task title.");
      const progressValue = Number(progress);
      if (!Number.isInteger(progressValue) || progressValue < 0 || progressValue > 100) {
        throw new Error("Progress must be a whole number between 0 and 100.");
      }
      const parsedDueDate = dueDate.trim() ? new Date(`${dueDate.trim()}T12:00:00`) : null;
      if (parsedDueDate && Number.isNaN(parsedDueDate.getTime())) throw new Error("Enter the deadline as YYYY-MM-DD.");
      return saveTask({
        title: title.trim(),
        description: description.trim() || null,
        status,
        progress: progressValue,
        dueAt: parsedDueDate?.toISOString() ?? null,
        assigneeUserId: workspaceId ? assigneeUserId || null : undefined,
        fileIds,
      }, workspaceId ?? undefined, editing?.id);
    },
    onSuccess: async () => {
      setOpen(false);
      setError("");
      await refresh();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The task could not be saved."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id, workspaceId ?? undefined),
    onSuccess: refresh,
    onError: (cause) => setError(cause instanceof Error ? cause.message : "The task could not be deleted."),
  });

  function startCreate() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setProgress("0");
    setDueDate("");
    setAssigneeUserId("");
    setFileIds([]);
    setError("");
    setOpen(true);
  }

  function startEdit(task: ProductivityTask) {
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setProgress(String(task.progress));
    setDueDate(task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 10) : "");
    setAssigneeUserId(task.assignee?.user.id ?? "");
    setFileIds(task.attachments.map(({ fileId }) => fileId));
    setError("");
    setOpen(true);
  }

  function confirmDelete(task: ProductivityTask) {
    Alert.alert("Delete task?", task.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(task.id) },
    ]);
  }

  if (tasksQuery.isPending || workspacesQuery.isPending) return <State title="Loading tasks…" />;
  if (tasksQuery.isError) return <State title="Tasks couldn’t load" detail={message(tasksQuery.error)} retry={() => void tasksQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.kicker}>{workspaceId ? "BUSINESS WORKSPACE" : "PERSONAL WORKSPACE"}</Text><Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>Assign work, set deadlines and attach documents.</Text></View><Pressable onPress={startCreate} style={styles.primary}><Text style={styles.primaryText}>＋ New</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}>
        <Pressable onPress={() => setWorkspaceId(null)} style={[styles.scope, !workspaceId && styles.scopeActive]}><Text style={[styles.scopeText, !workspaceId && styles.scopeTextActive]}>Personal</Text></Pressable>
        {(workspacesQuery.data ?? []).map((workspace) => <Pressable key={workspace.id} onPress={() => setWorkspaceId(workspace.id)} style={[styles.scope, workspaceId === workspace.id && styles.scopeActive]}><Text style={[styles.scopeText, workspaceId === workspace.id && styles.scopeTextActive]}>{workspace.name}</Text></Pressable>)}
      </ScrollView>
      {!tasks.length ? <View style={styles.empty}><Text style={styles.cardTitle}>Your task list is clear</Text><Text style={styles.subtitle}>Create a task or add an action item from a meeting record.</Text><Pressable onPress={startCreate} style={styles.secondary}><Text style={styles.secondaryText}>Create task</Text></Pressable></View>
        : tasks.map((task) => <Pressable key={task.id} onPress={() => startEdit(task)} style={styles.card}><View style={styles.taskCopy}><Text style={styles.cardTitle}>{task.title}</Text>{task.description ? <Text style={styles.body}>{task.description}</Text> : null}<Text style={styles.meta}>{task.status.replace("_", " ")} · {task.progress}%{task.dueAt ? ` · Due ${dateLabel(task.dueAt)}` : ""}{task.assignee?.user ? ` · ${task.assignee.user.name}` : ""}</Text>{task.attachments.length ? <Text style={styles.meta}>{task.attachments.length} attached document{task.attachments.length === 1 ? "" : "s"}</Text> : null}</View><Pressable onPress={() => confirmDelete(task)} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></Pressable>)}

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}><View style={styles.sheet}><View style={styles.grabber} /><ScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.kicker}>{workspaceId ? "SHARED TASK" : "PERSONAL TASK"}</Text><Text style={styles.sheetTitle}>{editing ? "Edit task" : "Create task"}</Text>
          <Text style={styles.label}>Title</Text><TextInput maxLength={200} value={title} onChangeText={setTitle} placeholder="Task title" style={styles.input} />
          <Text style={styles.label}>Details</Text><TextInput multiline maxLength={10000} value={description} onChangeText={setDescription} placeholder="Add details" style={[styles.input, styles.multiline]} />
          <Text style={styles.label}>Status</Text><View style={styles.statuses}>{taskStatuses.map((item) => <Pressable key={item} onPress={() => setStatus(item)} style={[styles.status, status === item && styles.statusActive]}><Text style={[styles.statusText, status === item && styles.statusTextActive]}>{item.replace("_", " ")}</Text></Pressable>)}</View>
          <View style={styles.row}><View style={styles.fieldHalf}><Text style={styles.label}>Progress (0–100)</Text><TextInput keyboardType="number-pad" value={progress} onChangeText={setProgress} style={styles.input} /></View><View style={styles.fieldHalf}><Text style={styles.label}>Deadline</Text><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" style={styles.input} /></View></View>
          {workspaceId ? <><Text style={styles.label}>Assign to</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes}><Pressable onPress={() => setAssigneeUserId("")} style={[styles.scope, !assigneeUserId && styles.scopeActive]}><Text style={[styles.scopeText, !assigneeUserId && styles.scopeTextActive]}>Unassigned</Text></Pressable>{activeMembers.map((member: WorkspaceMember) => <Pressable key={member.user.id} onPress={() => setAssigneeUserId(member.user.id)} style={[styles.scope, assigneeUserId === member.user.id && styles.scopeActive]}><Text style={[styles.scopeText, assigneeUserId === member.user.id && styles.scopeTextActive]}>{member.displayName || member.user.name}</Text></Pressable>)}</ScrollView></> : null}
          <Text style={styles.label}>Attach documents</Text>{filesQuery.isPending ? <ActivityIndicator color={colors.green} /> : files.map((file) => <Pressable key={file.id} onPress={() => setFileIds((current) => current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id])} style={styles.file}><Text style={styles.fileCheck}>{fileIds.includes(file.id) ? "☑" : "□"}</Text><Text numberOfLines={1} style={styles.fileName}>{file.name}</Text></Pressable>)}
          {error && !open ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {error && open ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}><Pressable onPress={() => setOpen(false)} style={styles.secondary}><Text style={styles.secondaryText}>Cancel</Text></Pressable><Pressable disabled={save.isPending} onPress={() => { setError(""); save.mutate(); }} style={styles.primary}><Text style={styles.primaryText}>{save.isPending ? "Saving…" : "Save task"}</Text></Pressable></View>
        </ScrollView></View></View>
      </Modal>
    </ScrollView>
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
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
  card: { flexDirection: "row", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface, padding: 11 },
  taskCopy: { flex: 1, gap: 4 },
  cardTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  body: { color: colors.text, fontSize: 10, lineHeight: 15 },
  meta: { color: colors.muted, fontSize: 8, lineHeight: 13 },
  delete: { alignSelf: "flex-start", backgroundColor: colors.redWash, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 },
  deleteText: { color: colors.red, fontSize: 8, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, padding: 20 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12,31,24,.42)" },
  sheet: { maxHeight: "90%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 12 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 11, paddingVertical: 10, fontSize: 12 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  statuses: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  status: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 7 },
  statusActive: { borderColor: colors.green, backgroundColor: colors.greenWash },
  statusText: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  statusTextActive: { color: colors.greenDark },
  row: { flexDirection: "row", gap: 8 },
  fieldHalf: { flex: 1, gap: 6 },
  file: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 9 },
  fileCheck: { color: colors.greenDark, fontSize: 14, fontWeight: "800" },
  fileName: { flex: 1, color: colors.text, fontSize: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  error: { color: colors.red, fontSize: 10, lineHeight: 15 },
  retry: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 9, padding: 24 },
});
