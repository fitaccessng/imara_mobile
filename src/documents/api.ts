import { apiRequest } from "@/api/client";

export type PersonalDocument = {
  id: string;
  type: "FORM" | "AGREEMENT" | "INVOICE";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  published: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export function getDocuments(): Promise<PersonalDocument[]> {
  return apiRequest<PersonalDocument[]>("/documents");
}

export function getDocument(documentId: string): Promise<PersonalDocument> {
  return apiRequest<PersonalDocument>(`/documents/${encodeURIComponent(documentId)}`);
}

export function createDocument(input: {
  type: PersonalDocument["type"];
  title: string;
  description?: string;
  content: Record<string, unknown>;
  published?: boolean;
}): Promise<PersonalDocument> {
  return apiRequest<PersonalDocument>("/documents", { method: "POST", body: JSON.stringify(input) });
}

export function updateDocument(documentId: string, changes: Partial<{
  type: PersonalDocument["type"];
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  published: boolean;
}>): Promise<PersonalDocument> {
  return apiRequest<PersonalDocument>(`/documents/${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function deleteDocument(documentId: string): Promise<void> {
  return apiRequest<void>(`/documents/${encodeURIComponent(documentId)}`, { method: "DELETE" });
}

export function getDocumentResponses(documentId: string): Promise<unknown[]> {
  return apiRequest<unknown[]>(`/documents/${encodeURIComponent(documentId)}/responses`);
}

export function shareDocument(documentId: string): Promise<{ token: string }> {
  return apiRequest<{ token: string }>(`/documents/${encodeURIComponent(documentId)}/share`, { method: "POST" });
}

export function revokeDocumentShare(documentId: string): Promise<void> {
  return apiRequest<void>(`/documents/${encodeURIComponent(documentId)}/share`, { method: "DELETE" });
}

export function getPublicDocument(token: string): Promise<unknown> {
  return apiRequest<unknown>(`/public-documents/${encodeURIComponent(token)}`);
}
