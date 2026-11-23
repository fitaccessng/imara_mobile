import { apiRequest } from "@/api/client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type ProductivityAttachment = {
  fileId: string;
  file: { id: string; name?: string; originalName?: string; mimeType: string; sizeBytes: string };
};

export type ProductivityTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  dueAt: string | null;
  assignee?: { user: { id: string; name: string; email: string } } | null;
  attachments: ProductivityAttachment[];
};

export type ProductivityFile = {
  id: string;
  name?: string;
  originalName?: string;
  mimeType: string;
  sizeBytes: string;
};

export type MeetingActionItem = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  assigneeUserId: string | null;
  personalTaskId?: string | null;
  workspaceTaskId?: string | null;
};

export type MeetingRecord = {
  id: string;
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  transcript: string;
  summary: string | null;
  decisions: string[];
  recordingFileId: string | null;
  recordingFile: ProductivityFile | null;
  calendarEventId: string | null;
  calendarEvent: { id: string; title: string; startsAt: string; endsAt: string } | null;
  actionItems: MeetingActionItem[];
};

export type FormQuestionType =
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "EMAIL"
  | "NUMBER"
  | "FILE_UPLOAD";

export type FormQuestion = {
  id: string;
  prompt: string;
  type: FormQuestionType;
  required: boolean;
  choices?: string[];
};

export type WorkspaceForm = {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  schema: { questions: FormQuestion[] };
  shareActive: boolean;
  responseCount: number;
  publishedAt: string | null;
};

export type FormResponse = {
  id: string;
  respondentName: string;
  respondentEmail: string;
  answers: Record<string, unknown>;
  submittedAt: string;
};

function scopePath(resource: string, workspaceId?: string): string {
  return workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/${resource}`
    : `/${resource}`;
}

export function getTasks(workspaceId?: string): Promise<ProductivityTask[]> {
  return apiRequest<ProductivityTask[]>(scopePath("tasks", workspaceId));
}

export function saveTask(
  input: {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    progress?: number;
    dueAt?: string | null;
    assigneeUserId?: string | null;
    fileIds?: string[];
  },
  workspaceId?: string,
  taskId?: string,
): Promise<ProductivityTask> {
  const base = scopePath("tasks", workspaceId);
  return apiRequest<ProductivityTask>(taskId ? `${base}/${encodeURIComponent(taskId)}` : base, {
    method: taskId ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
}

export function deleteTask(taskId: string, workspaceId?: string): Promise<void> {
  return apiRequest<void>(`${scopePath("tasks", workspaceId)}/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}

export function getMeetings(workspaceId?: string): Promise<MeetingRecord[]> {
  return apiRequest<MeetingRecord[]>(scopePath("meetings", workspaceId));
}

export function saveMeeting(
  input: {
    title: string;
    startedAt?: string | null;
    endedAt?: string | null;
    transcript: string;
    summary?: string | null;
    decisions?: string[];
    recordingFileId?: string | null;
    calendarEventId?: string | null;
    actionItems?: Array<{ title: string; description?: string | null; dueAt?: string | null; assigneeUserId?: string | null }>;
  },
  workspaceId?: string,
  meetingId?: string,
): Promise<MeetingRecord> {
  const base = scopePath("meetings", workspaceId);
  return apiRequest<MeetingRecord>(meetingId ? `${base}/${encodeURIComponent(meetingId)}` : base, {
    method: meetingId ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
}

export function deleteMeeting(meetingId: string, workspaceId?: string): Promise<void> {
  return apiRequest<void>(`${scopePath("meetings", workspaceId)}/${encodeURIComponent(meetingId)}`, { method: "DELETE" });
}

export function createMeetingTask(
  meetingId: string,
  actionItemId: string,
  workspaceId?: string,
): Promise<ProductivityTask> {
  return apiRequest<ProductivityTask>(
    `${scopePath("meetings", workspaceId)}/${encodeURIComponent(meetingId)}/action-items/${encodeURIComponent(actionItemId)}/task`,
    { method: "POST" },
  );
}

export function getWorkspaceForms(workspaceId: string): Promise<WorkspaceForm[]> {
  return apiRequest<WorkspaceForm[]>(scopePath("forms", workspaceId));
}

export function saveWorkspaceForm(
  workspaceId: string,
  input: { title: string; description?: string | null; schema: { questions: FormQuestion[] } },
  formId?: string,
): Promise<WorkspaceForm> {
  const base = scopePath("forms", workspaceId);
  return apiRequest<WorkspaceForm>(formId ? `${base}/${encodeURIComponent(formId)}` : base, {
    method: formId ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
}

export function shareWorkspaceForm(workspaceId: string, formId: string): Promise<{ token: string }> {
  return apiRequest<{ token: string }>(`${scopePath("forms", workspaceId)}/${encodeURIComponent(formId)}/share`, { method: "POST" });
}

export function revokeWorkspaceForm(workspaceId: string, formId: string): Promise<void> {
  return apiRequest<void>(`${scopePath("forms", workspaceId)}/${encodeURIComponent(formId)}/share`, { method: "DELETE" });
}

export function deleteWorkspaceForm(workspaceId: string, formId: string): Promise<void> {
  return apiRequest<void>(`${scopePath("forms", workspaceId)}/${encodeURIComponent(formId)}`, { method: "DELETE" });
}

export function getWorkspaceFormResponses(workspaceId: string, formId: string): Promise<FormResponse[]> {
  return apiRequest<FormResponse[]>(`${scopePath("forms", workspaceId)}/${encodeURIComponent(formId)}/responses`);
}

export function getPublicWorkspaceForm(token: string): Promise<{
  id: string;
  title: string;
  description: string | null;
  schema: { questions: FormQuestion[] };
}> {
  return apiRequest(`/public-forms/${encodeURIComponent(token)}`);
}

export function uploadPublicFormFile(token: string, questionId: string, file: Blob & { name: string }): Promise<{ fileId: string }> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiRequest(`/public-forms/${encodeURIComponent(token)}/questions/${encodeURIComponent(questionId)}/uploads`, {
    method: "POST",
    body,
  });
}

export function submitPublicWorkspaceForm(
  token: string,
  input: { name: string; email: string; answers: Record<string, unknown> },
): Promise<{ id: string; submittedAt: string }> {
  return apiRequest(`/public-forms/${encodeURIComponent(token)}/responses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
