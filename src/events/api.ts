import { apiRequest } from "@/api/client";

export type EventItem = {
  id: string;
  name: string;
  date: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  gallerySetting: "PRIVATE" | "LINK_PUBLIC" | "PASSCODE";
  captureToken: string;
  galleryToken: string;
  createdAt: string;
  updatedAt: string;
};

export function getEvents(): Promise<EventItem[]> {
  return apiRequest<EventItem[]>("/events");
}

export function getEvent(eventId: string): Promise<EventItem> {
  return apiRequest<EventItem>(`/events/${encodeURIComponent(eventId)}`);
}

export function createEvent(input: {
  name: string;
  date: string;
  description?: string;
  folderId?: string;
  gallerySetting?: "PRIVATE" | "LINK_PUBLIC" | "PASSCODE";
  passcode?: string;
}): Promise<EventItem> {
  return apiRequest<EventItem>("/events", { method: "POST", body: JSON.stringify(input) });
}

export function updateEvent(eventId: string, changes: Partial<{
  name: string;
  date: string;
  description: string | null;
  gallerySetting: "PRIVATE" | "LINK_PUBLIC" | "PASSCODE";
  passcode: string;
}>): Promise<EventItem> {
  return apiRequest<EventItem>(`/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteEvent(eventId: string): Promise<void> {
  return apiRequest<void>(`/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}

export function getOwnerEventMediaDownloadUrl(eventId: string, mediaId: string): string {
  return `/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}/download`;
}

export function rotateEventTokens(eventId: string): Promise<{ captureToken: string; galleryToken: string }> {
  return apiRequest<{ captureToken: string; galleryToken: string }>(`/events/${encodeURIComponent(eventId)}/rotate-tokens`, { method: "POST" });
}

export function getOwnerEventMedia(eventId: string): Promise<Array<{ id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string }>> {
  return apiRequest<Array<{ id: string; name: string; mimeType: string; sizeBytes: string; createdAt: string }>>(`/events/${encodeURIComponent(eventId)}/media`);
}

export function getCaptureEvent(token: string): Promise<unknown> {
  return apiRequest<unknown>(`/events/capture/${encodeURIComponent(token)}`);
}

export function getPublicEventGallery(token: string, authorization?: string): Promise<unknown> {
  return apiRequest<unknown>(`/events/gallery/${encodeURIComponent(token)}`, {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

export function unlockPublicEventGallery(token: string, passcode: string): Promise<{ authorization: string }> {
  return apiRequest<{ authorization: string }>(`/events/gallery/${encodeURIComponent(token)}/unlock`, {
    method: "POST",
    body: JSON.stringify({ passcode }),
  });
}
