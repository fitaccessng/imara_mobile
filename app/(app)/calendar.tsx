import { Link } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import { deleteCalendarEvent, getCalendarEvents, saveCalendarEvent, type CalendarEvent } from "@/calendar/api";
import type { WorkspaceItem } from "@/communications/api";
import { getWorkspaceChoices, getWorkspaceMembers, type WorkspaceMember } from "@/workspaces/api";
import { colors } from "@/ui/theme";

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const reminderChoices = [
  { value: null, label: "None" },
  { value: 0, label: "At time" },
  { value: 5, label: "5m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1h" },
  { value: 1440, label: "1 day" },
] as const;
const monthFormat = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const eventDateFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

type EventDraft = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  reminderMinutesBefore: number | null;
  taggedUserIds: string[];
};

export function CalendarScreen({ shared = false }: { shared?: boolean }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => createDraft(dayKey(new Date())));
  const [formError, setFormError] = useState("");

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaceChoices,
    enabled: shared,
  });
  const workspaces = workspacesQuery.data ?? [];
  const workspace = workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null;
  const workspaceId = shared ? workspace?.id : undefined;
  const isAdministrator = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  useEffect(() => {
    if (shared && workspaces.length && !workspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(workspaces[0]?.id ?? null);
    }
  }, [selectedWorkspaceId, shared, workspaces]);

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", workspaceId ?? "personal"],
    queryFn: () => getCalendarEvents(workspaceId),
    enabled: !shared || Boolean(workspaceId),
  });
  const membersQuery = useQuery({
    queryKey: ["workspace-calendar-members", workspaceId],
    queryFn: () => getWorkspaceMembers(workspaceId!),
    enabled: Boolean(shared && workspaceId && isAdministrator && formOpen),
  });

  const events = eventsQuery.data ?? [];
  const eventsByDay = useMemo(() => indexEventsByDay(events), [events]);
  const monthDays = useMemo(() => makeMonthGrid(month), [month]);
  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const selected = dateFromKey(selectedDate);
  const activeMembers = (membersQuery.data ?? []).filter((member) => member.status === "ACTIVE");
  const eventKey = workspaceId ?? "personal";

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["calendar-events", eventKey] });
  };

  const save = useMutation({
    mutationFn: () => {
      const start = localDateTimeToIso(draft.startsAt, draft.allDay, false);
      const end = localDateTimeToIso(draft.endsAt, draft.allDay, true);
      if (!draft.title.trim()) throw new Error("Add a title for this calendar event.");
      if (!start || !end || new Date(end) <= new Date(start)) {
        throw new Error("Enter valid dates, and make sure the end is after the start.");
      }
      return saveCalendarEvent({
        title: draft.title.trim(),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
        startsAt: start,
        endsAt: end,
        allDay: draft.allDay,
        reminderMinutesBefore: draft.reminderMinutesBefore,
        ...(shared ? { taggedUserIds: draft.taggedUserIds } : {}),
      }, workspaceId, editing?.id);
    },
    onSuccess: async () => {
      setFormOpen(false);
      setFormError("");
      await refresh();
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "The calendar event could not be saved."),
  });

  const remove = useMutation({
    mutationFn: (eventId: string) => deleteCalendarEvent(eventId, workspaceId),
    onSuccess: refresh,
    onError: (error) => setFormError(error instanceof Error ? error.message : "The calendar event could not be deleted."),
  });

  function openCreate() {
    setEditing(null);
    setDraft(createDraft(selectedDate));
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setDraft({
      title: event.title,
      description: event.description ?? "",
      startsAt: toLocalInput(event.startsAt, event.allDay),
      endsAt: toLocalInput(event.endsAt, event.allDay),
      allDay: event.allDay,
      reminderMinutesBefore: event.reminderMinutesBefore,
      taggedUserIds: event.taggedUserIds ?? event.taggedUsers?.map((member) => member.id) ?? [],
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

  function deleteEvent(event: CalendarEvent) {
    Alert.alert("Delete calendar item?", `${event.title} will be permanently removed from this calendar.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(event.id) },
    ]);
  }

  function updateDraft(changes: Partial<EventDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  if (shared && workspacesQuery.isPending) return <State title="Loading workspace…" />;
  if (shared && workspacesQuery.isError) return <State title="Workspaces couldn’t load" detail={message(workspacesQuery.error)} retry={() => void workspacesQuery.refetch()} />;
  if (shared && !workspace) {
    return <State title="No business workspace" detail="A workspace you own or have been invited to will appear here." />;
  }
  if (eventsQuery.isPending) return <State title="Loading calendar…" />;
  if (eventsQuery.isError) return <State title="Calendar couldn’t load" detail={message(eventsQuery.error)} retry={() => void eventsQuery.refetch()} />;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{shared ? "TEAM PLANNER" : "YOUR SPACE"}</Text>
          <Text style={styles.title}>{shared ? "Shared calendar" : "Calendar"}</Text>
          <Text style={styles.subtitle}>{shared ? "One clear view of your team's plans." : "Keep the dates and plans that matter close."}</Text>
        </View>
        <Pressable onPress={openCreate} style={styles.addButton}><Text style={styles.addButtonText}>＋ Add</Text></Pressable>
      </View>

      {shared && workspaces.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workspaceChoices}>
          {workspaces.map((item) => (
            <WorkspaceChip key={item.id} item={item} active={workspace?.id === item.id} onPress={() => setSelectedWorkspaceId(item.id)} />
          ))}
        </ScrollView>
      ) : shared && workspace ? <Text style={styles.workspaceLabel}>{workspace.name} · {workspace.role.toLowerCase()}</Text> : null}

      {!shared && workspaces.length ? (
        <Link href="/(app)/workspace-calendar" asChild><Pressable><Text style={styles.sharedLink}>Open shared calendar ›</Text></Pressable></Link>
      ) : null}

      <View style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <View>
            <Text style={styles.overline}>{shared ? workspace?.name : "YOUR CALENDAR"}</Text>
            <Text style={styles.monthTitle}>{monthFormat.format(month)}</Text>
          </View>
          <View style={styles.monthControls}>
            <Pressable accessibilityLabel="Previous month" onPress={() => setMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))} style={styles.monthButton}><Text style={styles.monthButtonText}>‹</Text></Pressable>
            <Pressable onPress={() => { const today = new Date(); setMonth(startOfMonth(today)); setSelectedDate(dayKey(today)); }} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable>
            <Pressable accessibilityLabel="Next month" onPress={() => setMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))} style={styles.monthButton}><Text style={styles.monthButtonText}>›</Text></Pressable>
          </View>
        </View>
        <View style={styles.calendarGrid}>
          {weekDays.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}
          {monthDays.map((date) => {
            const key = dayKey(date);
            const count = eventsByDay.get(key)?.length ?? 0;
            const outside = date.getMonth() !== month.getMonth();
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${eventDateFormat.format(date)}${count ? `, ${count} calendar items` : ""}`}
                accessibilityState={{ selected: selectedDate === key }}
                key={key}
                onPress={() => { setSelectedDate(key); if (outside) setMonth(startOfMonth(date)); }}
                style={[styles.dayCell, selectedDate === key ? styles.daySelected : null, outside ? styles.dayOutside : null]}
              >
                <Text style={[styles.dayNumber, selectedDate === key ? styles.dayNumberSelected : null]}>{date.getDate()}</Text>
                <View style={[styles.dayMarker, count ? styles.dayMarkerActive : null]} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.monthFooter}><Text style={styles.footerText}>●  Scheduled items</Text><Text style={styles.footerText}>{events.length} total</Text></View>
      </View>

      <View style={styles.agendaHeader}>
        <View><Text style={styles.overline}>{selectedDate === dayKey(new Date()) ? "TODAY" : "DAY AGENDA"}</Text><Text style={styles.agendaDate}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(selected)}</Text></View>
        <Text style={styles.agendaFullDate}>{eventDateFormat.format(selected)}</Text>
      </View>

      {formError && !formOpen ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
      {selectedEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing planned</Text>
          <Text style={styles.subtitle}>Enjoy the open space, or add an item.</Text>
          <Pressable onPress={openCreate} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Add to this day</Text></Pressable>
        </View>
      ) : selectedEvents.map((event) => {
        const canManage = !shared || isAdministrator || event.createdByUserId === currentUserId || event.creator?.id === currentUserId;
        return (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventRail}><Text style={styles.eventTime}>{event.allDay ? "ALL DAY" : timeFormat.format(new Date(event.startsAt))}</Text><View style={styles.railLine} /></View>
            <View style={styles.eventCopy}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              {event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}
              <Text style={styles.eventDescription}>{event.allDay ? "All day" : `${timeFormat.format(new Date(event.startsAt))} – ${timeFormat.format(new Date(event.endsAt))}`}</Text>
              {event.reminderMinutesBefore !== null ? <Text style={styles.eventMeta}>{reminderLabel(event.reminderMinutesBefore)} reminder</Text> : null}
              {event.taggedUsers?.length ? <Text style={styles.eventMeta}>Tagged: {event.taggedUsers.map((person) => person.name).join(", ")}</Text> : null}
              {shared && event.creator?.name ? <Text style={styles.eventMeta}>Added by {event.creator.name}</Text> : null}
              {canManage ? (
                <View style={styles.eventActions}>
                  <Pressable onPress={() => openEdit(event)} style={styles.eventAction}><Text style={styles.eventActionText}>Edit</Text></Pressable>
                  <Pressable disabled={remove.isPending} onPress={() => deleteEvent(event)} style={styles.eventAction}><Text style={styles.deleteText}>Delete</Text></Pressable>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}

      {shared && !isAdministrator ? <Text style={styles.roleNote}>You can manage events you created. Workspace administrators can manage all shared items.</Text> : null}

      <Modal animationType="slide" onRequestClose={closeForm} transparent visible={formOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.kicker}>{shared ? workspace?.name : "PERSONAL CALENDAR"}</Text>
              <Text style={styles.sheetTitle}>{editing ? "Edit calendar item" : "Add to calendar"}</Text>
              <Text style={styles.label}>What’s happening?</Text>
              <TextInput autoFocus maxLength={200} onChangeText={(title) => updateDraft({ title })} placeholder="e.g. Team planning session" placeholderTextColor={colors.muted} style={styles.input} value={draft.title} />
              <Text style={styles.label}>Details · optional</Text>
              <TextInput multiline maxLength={4000} onChangeText={(description) => updateDraft({ description })} placeholder="Add context or a short note" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput]} value={draft.description} />
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: draft.allDay }} onPress={() => updateDraft({ allDay: !draft.allDay })} style={styles.toggleRow}>
                <View style={[styles.checkbox, draft.allDay ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{draft.allDay ? "✓" : ""}</Text></View>
                <Text style={styles.label}>All day</Text>
              </Pressable>
              <Text style={styles.label}>Starts · {draft.allDay ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm"}</Text>
              <TextInput autoCapitalize="none" onChangeText={(startsAt) => updateDraft({ startsAt })} placeholder={draft.allDay ? "2026-11-17" : "2026-11-17T09:00"} placeholderTextColor={colors.muted} style={styles.input} value={draft.startsAt} />
              <Text style={styles.label}>Ends · {draft.allDay ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm"}</Text>
              <TextInput autoCapitalize="none" onChangeText={(endsAt) => updateDraft({ endsAt })} placeholder={draft.allDay ? "2026-11-17" : "2026-11-17T10:00"} placeholderTextColor={colors.muted} style={styles.input} value={draft.endsAt} />
              <Text style={styles.label}>Reminder</Text>
              <View style={styles.choiceRow}>
                {reminderChoices.map((choice) => (
                  <Pressable key={String(choice.value)} onPress={() => updateDraft({ reminderMinutesBefore: choice.value })} style={[styles.choice, draft.reminderMinutesBefore === choice.value ? styles.choiceSelected : null]}>
                    <Text style={[styles.choiceText, draft.reminderMinutesBefore === choice.value ? styles.choiceTextSelected : null]}>{choice.label}</Text>
                  </Pressable>
                ))}
              </View>
              {shared && isAdministrator ? (
                <View style={styles.memberPicker}>
                  <Text style={styles.label}>Notify team members · optional</Text>
                  {membersQuery.isPending ? <ActivityIndicator color={colors.green} /> : null}
                  {membersQuery.isError ? <Text style={styles.error}>{message(membersQuery.error)}</Text> : null}
                  {activeMembers.map((member) => (
                    <MemberChoice
                      key={member.id}
                      member={member}
                      checked={draft.taggedUserIds.includes(member.user.id)}
                      onPress={() => updateDraft({
                        taggedUserIds: draft.taggedUserIds.includes(member.user.id)
                          ? draft.taggedUserIds.filter((id) => id !== member.user.id)
                          : [...draft.taggedUserIds, member.user.id],
                      })}
                    />
                  ))}
                  {!membersQuery.isPending && !membersQuery.isError && !activeMembers.length ? <Text style={styles.helper}>No active members are available to tag.</Text> : null}
                </View>
              ) : null}
              {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
              <View style={styles.formFooter}>
                <Pressable disabled={save.isPending} onPress={closeForm} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
                <Pressable disabled={save.isPending} onPress={() => { setFormError(""); save.mutate(); }} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>{save.isPending ? "Saving…" : editing ? "Save changes" : "Add item"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function CalendarRoute() {
  return <CalendarScreen />;
}

export function SharedCalendarRoute() {
  return <CalendarScreen shared />;
}

function WorkspaceChip({ item, active, onPress }: { item: WorkspaceItem; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityState={{ selected: active }} onPress={onPress} style={[styles.workspaceChip, active ? styles.workspaceChipActive : null]}><Text style={[styles.workspaceChipText, active ? styles.workspaceChipTextActive : null]}>{item.name}</Text></Pressable>;
}

function MemberChoice({ member, checked, onPress }: { member: WorkspaceMember; checked: boolean; onPress: () => void }) {
  const name = member.displayName?.trim() || member.user.name;
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.memberChoice}>
      <View style={[styles.checkbox, checked ? styles.checkboxActive : null]}><Text style={styles.checkmark}>{checked ? "✓" : ""}</Text></View>
      <View style={styles.memberCopy}><Text style={styles.memberName}>{name}</Text><Text style={styles.helper}>{member.user.email}</Text></View>
    </Pressable>
  );
}

function createDraft(date: string): EventDraft {
  return {
    title: "",
    description: "",
    startsAt: `${date}T09:00`,
    endsAt: `${date}T10:00`,
    allDay: false,
    reminderMinutesBefore: 15,
    taggedUserIds: [],
  };
}

function toLocalInput(value: string, allDay: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString();
  return allDay ? local.slice(0, 10) : local.slice(0, 16);
}

function localDateTimeToIso(value: string, allDay: boolean, endOfDay: boolean): string | null {
  if (!value.trim()) return null;
  const input = allDay ? `${value.trim()}T${endOfDay ? "23:59:59" : "00:00:00"}` : value.trim();
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(value: string): Date {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function makeMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function indexEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const result = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const finalDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (date <= finalDate) {
      const key = dayKey(date);
      const onDay = result.get(key) ?? [];
      result.set(key, [...onDay, event]);
      date.setDate(date.getDate() + 1);
    }
  }
  return result;
}

function reminderLabel(minutes: number): string {
  if (minutes === 0) return "At-time";
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 1440) return "1 day";
  return `${minutes / 60} hr`;
}

function State({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.eventTitle}>{title}</Text>
      {detail ? <Text style={styles.subtitle}>{detail}</Text> : <ActivityIndicator color={colors.green} />}
      {retry ? <Pressable onPress={retry}><Text style={styles.sharedLink}>Try again</Text></Pressable> : null}
    </View>
  );
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
  workspaceChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  workspaceChipActive: { backgroundColor: colors.greenWash, borderColor: colors.green },
  workspaceChipText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  workspaceChipTextActive: { color: colors.greenDark },
  workspaceLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  sharedLink: { color: colors.greenDark, fontSize: 11, fontWeight: "800" },
  monthCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 12, gap: 12 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  overline: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  monthTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  monthControls: { flexDirection: "row", alignItems: "center", gap: 5 },
  monthButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 9 },
  monthButtonText: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  todayButton: { paddingHorizontal: 8, paddingVertical: 7 },
  todayText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", textAlign: "center", color: colors.muted, fontSize: 9, fontWeight: "800", paddingVertical: 6 },
  dayCell: { width: "14.2857%", minHeight: 38, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 10 },
  daySelected: { backgroundColor: colors.green },
  dayOutside: { opacity: 0.4 },
  dayNumber: { color: colors.text, fontSize: 11, fontWeight: "600" },
  dayNumberSelected: { color: colors.surface, fontWeight: "800" },
  dayMarker: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  dayMarkerActive: { backgroundColor: colors.green },
  monthFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 },
  footerText: { color: colors.muted, fontSize: 9 },
  agendaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 2 },
  agendaDate: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 2 },
  agendaFullDate: { flex: 1, textAlign: "right", color: colors.muted, fontSize: 9, paddingBottom: 3 },
  eventCard: { flexDirection: "row", gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12 },
  eventRail: { width: 48, alignItems: "center", gap: 7 },
  eventTime: { color: colors.ink, fontSize: 9, fontWeight: "800", textAlign: "center" },
  railLine: { width: 2, flex: 1, minHeight: 25, borderRadius: 1, backgroundColor: colors.greenWash },
  eventCopy: { flex: 1, gap: 5 },
  eventTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  eventDescription: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  eventMeta: { color: colors.greenDark, fontSize: 9, lineHeight: 14 },
  eventActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  eventAction: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.greenWash, borderRadius: 8 },
  eventActionText: { color: colors.greenDark, fontSize: 9, fontWeight: "800" },
  deleteText: { color: colors.red, fontSize: 9, fontWeight: "800" },
  empty: { alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 20 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  secondaryButton: { backgroundColor: colors.greenWash, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center" },
  secondaryButtonText: { color: colors.greenDark, fontSize: 10, fontWeight: "800" },
  roleNote: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: "center" },
  error: { color: colors.red, fontSize: 11, lineHeight: 16 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(12, 31, 24, 0.42)" },
  sheet: { maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 9, paddingBottom: 22 },
  grabber: { width: 40, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: "center", marginBottom: 12 },
  sheetContent: { gap: 9, paddingBottom: 10 },
  sheetTitle: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "800", marginBottom: 2 },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800", marginTop: 2 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 10, color: colors.ink, fontSize: 12 },
  descriptionInput: { minHeight: 66, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: colors.green, borderColor: colors.green },
  checkmark: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choice: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  choiceSelected: { backgroundColor: colors.greenWash, borderColor: colors.green },
  choiceText: { color: colors.muted, fontSize: 9, fontWeight: "700" },
  choiceTextSelected: { color: colors.greenDark },
  memberPicker: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 7 },
  memberChoice: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 3 },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: colors.text, fontSize: 10, fontWeight: "700" },
  helper: { color: colors.muted, fontSize: 9, lineHeight: 14 },
  formFooter: { flexDirection: "row", gap: 8, marginTop: 3 },
  primaryButton: { flex: 1, backgroundColor: colors.green, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  primaryButtonText: { color: colors.surface, fontSize: 10, fontWeight: "800" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
});
