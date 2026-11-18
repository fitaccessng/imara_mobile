import { apiRequest } from "@/api/client";

export type FileRequest = {
  id: string;
  title: string;
  message: string | null;
  destinationFolderId: string | null;
  token: string;
  revokedAt: string | null;
  createdAt: string;
};

export function getFileRequests(): Promise<FileRequest[]> {
  return apiRequest<FileRequest[]>("/file-requests");
}

export function createFileRequest(input: { title: string; message?: string; destinationFolderId?: string }): Promise<FileRequest> {
  return apiRequest<FileRequest>("/file-requests", { method: "POST", body: JSON.stringify(input) });
}

export function revokeFileRequest(requestId: string): Promise<void> {
  return apiRequest<void>(`/file-requests/${encodeURIComponent(requestId)}`, { method: "DELETE" });
}

export function getPublicFileRequest(token: string): Promise<unknown> {
  return apiRequest<unknown>(`/file-requests/public/${encodeURIComponent(token)}`);
}
