import { apiRequest } from "@/api/client";

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    fileId: string;
    file: { id: string; originalName: string; mimeType: string; sizeBytes: string };
  }>;
};

function notesPath(workspaceId?: string): string {
  return workspaceId
    ? `/workspaces/${encodeURIComponent(workspaceId)}/notes`
    : "/notes";
}

export function getNotes(search?: string, workspaceId?: string): Promise<Note[]> {
  const query = search?.trim() && !workspaceId ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<Note[]>(`${notesPath(workspaceId)}${query}`);
}

export function getNote(noteId: string, workspaceId?: string): Promise<Note> {
  return apiRequest<Note>(`${notesPath(workspaceId)}/${encodeURIComponent(noteId)}`);
}

export function createNote(title: string, body: string, fileIds: string[] = [], workspaceId?: string): Promise<Note> {
  return apiRequest<Note>(notesPath(workspaceId), {
    method: "POST",
    body: JSON.stringify({ title, body, fileIds }),
  });
}

export function updateNote(
  noteId: string,
  changes: { title?: string; body?: string; fileIds?: string[] },
  workspaceId?: string,
): Promise<Note> {
  return apiRequest<Note>(`${notesPath(workspaceId)}/${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteNote(noteId: string, workspaceId?: string): Promise<void> {
  return apiRequest<void>(`${notesPath(workspaceId)}/${encodeURIComponent(noteId)}`, { method: "DELETE" });
}
