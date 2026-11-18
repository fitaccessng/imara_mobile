import { apiRequest } from "@/api/client";

export type ReminderRecurrence = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type WorkspaceReminder = {
  id: string;
  workspaceId: string;
  createdById: string;
  assignedToId: string;
  title: string;
  description: string | null;
  dueAt: string;
  nextDueAt: string | null;
  recurrence: ReminderRecurrence;
  emailEnabled: boolean;
  completedAt: string | null;
  lastCompletedAt: string | null;
  cancelledAt: string | null;
  creator: { id: string; name: string };
  assignee: { id: string; name: string };
};

export type ReminderInput = {
  title: string;
  description?: string;
  dueAt: string;
  recurrence: ReminderRecurrence;
  assignedToUserId?: string;
  emailEnabled: boolean;
};

function remindersPath(workspaceId: string, suffix = ""): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/reminders${suffix}`;
}

export function getWorkspaceReminders(workspaceId: string): Promise<WorkspaceReminder[]> {
  return apiRequest<WorkspaceReminder[]>(remindersPath(workspaceId));
}

export function createWorkspaceReminder(workspaceId: string, input: ReminderInput): Promise<WorkspaceReminder> {
  return apiRequest<WorkspaceReminder>(remindersPath(workspaceId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkspaceReminder(
  workspaceId: string,
  reminderId: string,
  input: Partial<ReminderInput>,
): Promise<WorkspaceReminder> {
  return apiRequest<WorkspaceReminder>(
    remindersPath(workspaceId, `/${encodeURIComponent(reminderId)}`),
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function completeWorkspaceReminder(workspaceId: string, reminderId: string): Promise<unknown> {
  return apiRequest<WorkspaceReminder>(
    remindersPath(workspaceId, `/${encodeURIComponent(reminderId)}/complete`),
    { method: "POST" },
  );
}

export function cancelWorkspaceReminder(workspaceId: string, reminderId: string): Promise<unknown> {
  return apiRequest<WorkspaceReminder>(
    remindersPath(workspaceId, `/${encodeURIComponent(reminderId)}/cancel`),
    { method: "POST" },
  );
}
