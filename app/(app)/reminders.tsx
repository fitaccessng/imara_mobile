import { Link } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import {
  cancelWorkspaceReminder,
  completeWorkspaceReminder,
  createWorkspaceReminder,
  getWorkspaceReminders,
  updateWorkspaceReminder,
  type ReminderInput,
  type ReminderRecurrence,
  type WorkspaceReminder,
} from "@/reminders/api";
import { colors } from "@/ui/theme";
import { getWorkspaceChoices, getWorkspaceMembers, type WorkspaceMember } from "@/workspaces/api";

const recurrenceChoices: { value: ReminderRecurrence; label: string }[] = [
  { value: "ONCE", label: "Once" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];
const dueFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
type ReminderFilter = "upcoming" | "completed" | "cancelled";
type ReminderDraft = {
  title: string;
  description: string;
  dueAt: string;
  recurrence: ReminderRecurrence;
  assignedToUserId: string;
  emailEnabled: boolean;
};

export default function RemindersScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReminderFilter>("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorkspaceReminder | null>(null);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<ReminderDraft>(() => emptyDraft(currentUser?.id ?? ""));

  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaceChoices });
  const workspaces = workspacesQuery.data ?? [];
  const selectedWorkspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0] ?? null;
  const selectedWorkspaceId = selectedWorkspace?.id;
  const isAdministrator = selectedWorkspace?.role === "OWNER" || selectedWorkspace?.role === "ADMIN";

  useEffect(() => {
    if (workspaces.length && !workspaces.some((item) => item.id === workspaceId)) {
      setWorkspaceId(workspaces[0]?.id ?? null);
    }
  }, [workspaceId, workspaces]);

  const remindersQuery = useQuery({
    queryKey: ["workspace-reminders", selectedWorkspaceId],
    queryFn: () => getWorkspaceReminders(selectedWorkspaceId!),
    enabled: Boolean(selectedWorkspaceId),
  });
  const membersQuery = useQuery({
    queryKey: ["workspace-reminder-members", selectedWorkspaceId],
    queryFn: () => getWorkspaceMembers(selectedWorkspaceId!),
    enabled: Boolean(selectedWorkspaceId && isAdministrator && formOpen),
  });

  const reminders = remindersQuery.data ?? [];
  const filteredReminders = useMemo(
    () => reminders
      .filter((reminder) => (
        filter === "upcoming"
          ? !reminder.completedAt && !reminder.cancelledAt
          : filter === "completed" ? Boolean(reminder.completedAt || reminder.lastCompletedAt) : Boolean(reminder.cancelledAt)
      ))
      .sort((a, b) => new Date(a.nextDueAt ?? a.dueAt).getTime() - new Date(b.nextDueAt ?? b.dueAt).getTime()),
    [filter, reminders],
  );
  const activeMembers = (membersQuery.data ?? []).filter((member) => member.status === "ACTIVE");
  const remindersKey = ["workspace-reminders", selectedWorkspaceId];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: remindersKey });
  };

  const save = useMutation({
    mutationFn: () => {
      const dueAt = new Date(draft.dueAt);
      if (!draft.title.trim()) throw new Error("Add a title for this reminder.");
      if (!draft.dueAt.trim() || Number.isNaN(dueAt.getTime())) throw new Error("Enter a valid due date and time.");
      if (!selectedWorkspaceId) throw new Error("Choose a workspace before saving.");
      const input: ReminderInput = {
        title: draft.title.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        dueAt: dueAt.toISOString(),
        recurrence: draft.recurrence,
        ...(draft.assignedToUserId ? { assignedToUserId: draft.assignedToUserId } : {}),
        emailEnabled: draft.emailEnabled,
      };
      return editing
        ? updateWorkspaceReminder(selectedWorkspaceId, editing.id, input)
        : createWorkspaceReminder(selectedWorkspaceId, input);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setEditing(null);
      setFormError("");
      await refresh();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "The reminder could not be saved."),
  });

  const complete = useMutation({
    mutationFn: (reminderId: string) => completeWorkspaceReminder(selectedWorkspaceId!, reminderId),
    onSuccess: refresh,
    onError: (error) => Alert.alert("Couldn’t complete reminder", error instanceof Error ? error.message : "Please try again."),
  });
  const cancel = useMutation({
    mutationFn: (reminderId: string) => cancelWorkspaceReminder(selectedWorkspaceId!, reminderId),
    onSuccess: refresh,
    onError: (error) => Alert.alert("Couldn’t cancel reminder", error instanceof Error ? error.message : "Please try again."),
  });

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft(currentUser?.id ?? ""));
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(reminder: WorkspaceReminder) {
    setEditing(reminder);
    setDraft({
      title: reminder.title,
      description: reminder.description ?? "",
      dueAt: toLocalInput(reminder.nextDueAt ?? reminder.dueAt),
      recurrence: reminder.recurrence,
      assignedToUserId: reminder.assignedToId,
      emailEnabled: reminder.emailEnabled,
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (save.isPending) return;
    setFormOpen(false);
    setEditing(null);
    setFormError("");
  }

  function confirmCancel(reminder: WorkspaceReminder) {
    Alert.alert("Cancel this reminder?", `${reminder.title} will no longer appear in upcoming reminders.`, [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel reminder", style: "destructive", onPress: () => cancel.mutate(reminder.id) },
    ]);
  }

  if (workspacesQuery.isPending) return <State title="Loading workspaces…" />;
  if (workspacesQuery.isError) return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  if (!selectedWorkspace) {
    return <State title="No business workspace" detail="Reminders are available in a workspace you own or have been invited to." />;
  }
  if (remindersQuery.isPending) return <State title="Loading reminders…" />;
  if (remindersQuery.isError) return <State title="Reminders couldn’t load" detail={message(remindersQuery.error)} retry={() => void remindersQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>WORKSPACE PRODUCTIVITY</Text>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Follow-ups and recurring work, all in one place.</Text>
        </View>
        <Pressable onPress={openCreate} style={styles.addButton}><Text style={styles.addButtonText}>＋ Add</Text></Pressable>
      </View>

      {workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceChoices}>
          {workspaces.map((item) => (
            <Pressable key={item.id} accessibilityState={{ selected: selectedWorkspace.id === item.id }} onPress={() => setWorkspaceId(item.id)} style={[styles.chip, selectedWorkspace.id === item.id ? styles.chipActive : null]}>
              <Text style={[styles.chipText, selectedWorkspace.id === item.id ? styles.chipTextActive : null]}>{item.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : <Text style={styles.workspaceLabel}>{selectedWorkspace.name} · {selectedWorkspace.role.toLowerCase()}</Text>}

      <View style={styles.filterRow}>
        <FilterButton label="Upcoming" count={reminders.filter((item) => !item.completedAt && !item.cancelledAt).length} active={filter === "upcoming"} onPress={() => setFilter("upcoming")} />
        <FilterButton label="Completed" count={reminders.filter((item) => item.completedAt || item.lastCompletedAt).length} active={filter === "completed"} onPress={() => setFilter("completed")} />
        <FilterButton label="Cancelled" count={reminders.filter((item) => item.cancelledAt).length} active={filter === "cancelled"} onPress={() => setFilter("cancelled")} />
      </View>

      {filteredReminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{filter === "upcoming" ? "No upcoming reminders" : `No ${filter} reminders`}</Text>
          <Text style={styles.subtitle}>{filter === "upcoming" ? "Create a reminder to keep the next step from slipping." : "This list will fill as the team uses reminders."}</Text>
          {filter === "upcoming" ? <Pressable onPress={openCreate} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create reminder</Text></Pressable> : null}
        </View>
      ) : filteredReminders.map((reminder) => {
        const isCompleted = Boolean(reminder.completedAt || reminder.lastCompletedAt);
        const canComplete = reminder.assignedToId === currentUser?.id || reminder.createdById === currentUser?.id || isAdministrator;
        const canEdit = reminder.createdById === currentUser?.id || isAdministrator;
        const dueAt = reminder.nextDueAt ?? reminder.dueAt;
        return (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={[styles.statusMark, reminder.cancelledAt ? styles.statusCancelled : isCompleted ? styles.statusCompleted : null]}>
              <Text style={styles.statusMarkText}>{reminder.cancelledAt ? "×" : isCompleted ? "✓" : "•"}</Text>
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <Text style={styles.dueText}>{dueAt ? dueFormat.format(new Date(dueAt)) : "No next due date"}{reminder.recurrence !== "ONCE" ? ` · ${recurrenceLabel(reminder.recurrence)}` : ""}</Text>
              {reminder.description ? <Text style={styles.description}>{reminder.description}</Text> : null}
              <Text style={styles.metaText}>Assigned to {reminder.assignee?.name ?? "workspace member"} · Created by {reminder.creator?.name ?? "workspace member"}</Text>
              {reminder.emailEnabled ? <Text style={styles.metaText}>Email notifications on</Text> : null}
              {reminder.lastCompletedAt && reminder.recurrence !== "ONCE" ? <Text style={styles.metaText}>Last completed {dueFormat.format(new Date(reminder.lastCompletedAt))}</Text> : null}
              {reminder.completedAt ? <Text style={styles.metaText}>Completed {dueFormat.format(new Date(reminder.completedAt))}</Text> : null}
              <View style={styles.actions}>
                {!reminder.cancelledAt && !reminder.completedAt && canComplete ? <Pressable disabled={complete.isPending} onPress={() => complete.mutate(reminder.id)} style={styles.actionButton}><Text style={styles.actionText}>Mark done</Text></Pressable> : null}
                {!reminder.cancelledAt && !reminder.completedAt && canEdit ? <Pressable onPress={() => openEdit(reminder)} style={styles.actionButton}><Text style={styles.actionText}>Edit</Text></Pressable> : null}
                {!reminder.cancelledAt && !reminder.completedAt && canEdit ? <Pressable disabled={cancel.isPending} onPress={() => confirmCancel(reminder)} style={styles.actionButton}><Text style={styles.cancelText}>Cancel</Text></Pressable> : null}
              </View>
            </View>
          </View>
        );
      })}

      <Link href="/(app)/productivity" asChild><Pressable><Text style={styles.link}>Back to productivity</Text></Pressable></Link>

      <Modal animationType="slide" onRequestClose={closeForm} transparent visible={formOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.kicker}>{selectedWorkspace.name}</Text>
              <Text style={styles.sheetTitle}>{editing ? "Edit reminder" : "Create reminder"}</Text>
              <Text style={styles.label}>Reminder title</Text>
              <TextInput autoFocus maxLength={200} onChangeText={(title) => setDraft((current) => ({ ...current, title }))} placeholder="e.g. Follow up with the supplier" placeholderTextColor={colors.muted} style={styles.input} value={draft.title} />
              <Text style={styles.label}>Description · optional</Text>
              <TextInput multiline maxLength={2000} onChangeText={(description) => setDraft((current) => ({ ...current, description }))} placeholder="Add a note for the team" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput]} value={draft.description} />
              <Text style={styles.label}>Due · YYYY-MM-DDTHH:mm</Text>
              <TextInput autoCapitalize="none" onChangeText={(dueAt) => setDraft((current) => ({ ...current, dueAt }))} placeholder="2026-11-18T10:00" placeholderTextColor={colors.muted} style={styles.input} value={draft.dueAt} />
              <Text style={styles.label}>Repeat</Text>
              <View style={styles.choiceRow}>
                {recurrenceChoices.map((choice) => (
                  <Pressable key={choice.value} onPress={() => setDraft((current) => ({ ...current, recurrence: choice.value }))} style={[styles.choice, draft.recurrence === choice.value ? styles.choiceSelected : null]}>
                    <Text style={[styles.choiceText, draft.recurrence === choice.value ? styles.choiceTextSelected : null]}>{choice.label}</Text>
                  </Pressable>
                ))}
              </View>
              {isAdministrator ? (
                <View style={styles.memberPicker}>
                  <Text style={styles.label}>Assign to</Text>
                  {membersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
                  {membersQuery.isError ? <Text style={styles.error}>{message(membersQuery.error)}</Text> : null}
                  {activeMembers.map((member) => <AssigneeChoice key={member.id} member={member} selected={draft.assignedToUserId === member.user.id} onPress={() => setDraft((current) => ({ ...current, assignedToUserId: member.user.id }))} />)}
                  {!membersQuery.isPending && !membersQuery.isError && !activeMembers.length ? <Text style={styles.helper}>No active members are available.</Text> : null}
                </View>
              ) : null}
              <View style={styles.switchRow}><Text style={styles.label}>Email notifications</Text><Switch value={draft.emailEnabled} onValueChange={(emailEnabled) => setDraft((current) => ({ ...current, emailEnabled }))} trackColor={{ false: colors.line, true: colors.green }} /></View>
              {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
              <View style={styles.formFooter}>
                <Pressable disabled={save.isPending} onPress={closeForm} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
                <Pressable disabled={save.isPending} onPress={() => { setFormError(""); save.mutate(); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Create reminder"}</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FilterButton({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filterButton, active ? styles.filterButtonActive : null]}><Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{label} {count}</Text></Pressable>;
}

function AssigneeChoice({ member, selected, onPress }: { member: WorkspaceMember; selected: boolean; onPress: () => void }) {
  const name = member.displayName?.trim() || member.user.name;
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={styles.assigneeChoice}><View style={[styles.radio, selected ? styles.radioSelected : null]} /> <Text style={styles.assigneeName}>{name}</Text><Text style={styles.helper}>{member.role.toLowerCase()}</Text></Pressable>;
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <View style={styles.state}><Text style={styles.reminderTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : <ActivityIndicator color={colors.green} />}{retry ? <Pressable onPress={retry}><Text style={styles.link}>Try again</Text></Pressable> : null}</View>;
}

function emptyDraft(userId: string): ReminderDraft {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    dueAt: toLocalInput(date.toISOString()),
    recurrence: "ONCE",
    assignedToUserId: userId,
    emailEnabled: false,
  };
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function recurrenceLabel(recurrence: ReminderRecurrence): string {
  return recurrence.toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
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
  addButton: { backgroundColor: colors.green, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
  addButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" },
  workspaceChoices: { gap: 7 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  chipTextActive: { color: colors.greenDark },
  workspaceLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 6 },
  filterButton: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 9, backgroundColor: colors.surface },
  filterButtonActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  filterTextActive: { color: colors.greenDark },
  empty: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  reminderCard: { flexDirection: "row", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  statusMark: { width: 23, height: 23, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenWash },
  statusCompleted: { backgroundColor: colors.green },
  statusCancelled: { backgroundColor: colors.redWash },
  statusMarkText: { color: colors.greenDark, fontSize: 13, fontWeight: "800" },
  reminderContent: { flex: 1, gap: 5 },
  reminderTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  dueText: { color: colors.greenDark, fontSize: 10, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  metaText: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3 },
  actionButton: { borderRadius: 8, backgroundColor: colors.greenWash, paddingHorizontal: 9, paddingVertical: 7 },
  actionText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  cancelText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  primaryButton: { flex: 1, backgroundColor: colors.green, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  link: { color: colors.greenDark, fontSize: 11, fontWeight: "800", textAlign: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "800" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 10, color: colors.ink, fontSize: 12 },
  descriptionInput: { minHeight: 66, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  choiceTextSelected: { color: colors.greenDark },
  memberPicker: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 7 },
  assigneeChoice: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  radioSelected: { borderWidth: 5, borderColor: colors.green },
  assigneeName: { flex: 1, color: colors.text, fontSize: 10, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  formFooter: { flexDirection: "row", gap: 8, marginTop: 3 },
  error: { color: colors.red, fontSize: 11, lineHeight: 16 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
});
