import { apiRequest } from "@/api/client";

export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function getNotes(search?: string): Promise<Note[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiRequest<Note[]>(`/notes${query}`);
}

export function getNote(noteId: string): Promise<Note> {
  return apiRequest<Note>(`/notes/${encodeURIComponent(noteId)}`);
}

export function createNote(title: string, body: string): Promise<Note> {
  return apiRequest<Note>("/notes", { method: "POST", body: JSON.stringify({ title, body }) });
}

export function updateNote(noteId: string, changes: { title?: string; body?: string }): Promise<Note> {
  return apiRequest<Note>(`/notes/${encodeURIComponent(noteId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteNote(noteId: string): Promise<void> {
  return apiRequest<void>(`/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" });
}
