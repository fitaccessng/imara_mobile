import { apiRequest } from "@/api/client";
import { getApiBaseUrl } from "@/config";

export type PublicFileMetadata = {
  name: string;
  mimeType: string;
  sizeBytes: string;
};

export type PublicDocument = {
  id: string;
  type: "FORM" | "AGREEMENT" | "INVOICE";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
};

export type PublicFileRequest = {
  title: string;
  message: string | null;
  ownerName: string;
  destinationFolderName: string | null;
  maxUploadBytes: string;
  active: boolean;
};

export type PublicCaptureEvent = {
  name: string;
  date: string;
  description: string | null;
  active: boolean;
};

export type PublicGallery = {
  name: string;
  date: string;
  media: Array<{ id: string; name: string; mimeType: string; sizeBytes: string }>;
  protected: boolean;
  authorizationRequired: boolean;
};

export function acceptWorkspaceInvitation(token: string): Promise<{ workspaceId: string; memberId: string; role: string }> {
  return apiRequest<{ workspaceId: string; memberId: string; role: string }>(`/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
}

export function getPublicSharedFile(token: string): Promise<PublicFileMetadata> {
  return apiRequest<PublicFileMetadata>(`/public-shares/${encodeURIComponent(token)}`);
}

export function getPublicSharedFileDownloadUrl(token: string): string {
  return `${getApiBaseUrl()}/public-shares/${encodeURIComponent(token)}/download`;
}

export function getPublicDocument(token: string): Promise<PublicDocument> {
  return apiRequest<PublicDocument>(`/public-documents/${encodeURIComponent(token)}`);
}

export function submitPublicDocumentForm(token: string, input: { name: string; email: string; answers: Record<string, unknown> }): Promise<unknown> {
  return apiRequest<unknown>(`/public-documents/${encodeURIComponent(token)}/responses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function signPublicDocument(token: string, input: { name: string; email: string; consent: boolean }): Promise<unknown> {
  return apiRequest<unknown>(`/public-documents/${encodeURIComponent(token)}/sign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPublicFileRequest(token: string): Promise<PublicFileRequest> {
  return apiRequest<PublicFileRequest>(`/file-requests/public/${encodeURIComponent(token)}`);
}

export async function uploadPublicFileRequest(token: string, file: Blob & { name: string }, relativePath?: string): Promise<unknown> {
  const body = new FormData();
  body.append("file", file, file.name);
  if (relativePath) body.append("relativePath", relativePath);
  return apiRequest<unknown>(`/file-requests/public/${encodeURIComponent(token)}/uploads`, {
    method: "POST",
    body,
  });
}

export async function uploadCaptureEventMedia(token: string, file: Blob & { name: string }): Promise<unknown> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiRequest<unknown>(`/events/capture/${encodeURIComponent(token)}/uploads`, {
    method: "POST",
    body,
  });
}

export function getCaptureEvent(token: string): Promise<PublicCaptureEvent> {
  return apiRequest<PublicCaptureEvent>(`/events/capture/${encodeURIComponent(token)}`);
}

export function getPublicGallery(token: string, authorization?: string): Promise<PublicGallery> {
  return apiRequest<PublicGallery>(`/events/gallery/${encodeURIComponent(token)}`, {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

export function unlockPublicGallery(token: string, passcode: string): Promise<{ authorization: string }> {
  return apiRequest<{ authorization: string }>(`/events/gallery/${encodeURIComponent(token)}/unlock`, {
    method: "POST",
    body: JSON.stringify({ passcode }),
  });
}
