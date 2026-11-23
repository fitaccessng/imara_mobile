import { apiRequest } from "@/api/client";

export type CalendarPerson = {
  id: string;
  name: string;
  email?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdByUserId: string;
  creator?: { id: string; name: string };
  reminderMinutesBefore: number | null;
  taggedUsers?: CalendarPerson[];
  taggedUserIds?: string[];
  linkedFileId?: string | null;
  linkedTaskId?: string | null;
  linkedMeetingId?: string | null;
  linkedFile?: { id: string; originalName: string; name?: string; mimeType: string; sizeBytes: string } | null;
  linkedTask?: { id: string; title: string; status: string; progress: number; dueAt: string | null } | null;
  linkedMeeting?: { id: string; title: string; startedAt: string | null; endedAt: string | null } | null;
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  reminderMinutesBefore: number | null;
  taggedUserIds?: string[];
  linkedFileId?: string | null;
  linkedTaskId?: string | null;
};

export function getCalendarEvents(workspaceId?: string): Promise<CalendarEvent[]> {
  const path = workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/calendar/events`
    : "/calendar/events";
  return apiRequest<CalendarEvent[]>(path);
}

export function saveCalendarEvent(
  input: CalendarEventInput,
  workspaceId?: string,
  eventId?: string,
): Promise<CalendarEvent> {
  const basePath = workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/calendar/events`
    : "/calendar/events";
  const path = eventId ? `${basePath}/${encodeURIComponent(eventId)}` : basePath;
  return apiRequest<CalendarEvent>(path, {
    method: eventId ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
}

export function deleteCalendarEvent(eventId: string, workspaceId?: string): Promise<void> {
  const basePath = workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/calendar/events`
    : "/calendar/events";
  return apiRequest<void>(`${basePath}/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}
