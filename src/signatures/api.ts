import { apiRequest } from "@/api/client";

export type SignatureMode = "SEQUENTIAL" | "PARALLEL";
export type SignatureRequestStatus = "PENDING" | "FINALIZING" | "COMPLETED" | "DECLINED" | "CANCELLED";
export type SignatureSignerStatus = "PENDING" | "SIGNED" | "DECLINED";

export type SignatureSource = {
  id: string;
  name: string;
  sizeBytes: string;
  folderId: string | null;
  createdAt: string;
};

export type SignatureMember = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
};

export type SignatureSigner = {
  id: string;
  memberId: string;
  userId: string;
  name: string;
  email: string;
  order: number;
  status: SignatureSignerStatus;
  method: "TYPED" | "DRAWN" | null;
  signedName: string | null;
  signedAt: string | null;
  consentedAt: string | null;
  declineReason: string | null;
};

export type SignatureRequest = {
  id: string;
  sourceFileId: string;
  sourceName: string;
  mode: SignatureMode;
  status: SignatureRequestStatus;
  createdById: string;
  createdAt: string;
  dueAt: string | null;
  completedAt: string | null;
  finalFile: { id: string; originalName: string } | null;
  signers: SignatureSigner[];
};

export type CreateSignatureInput = {
  sourceFileId: string;
  mode: SignatureMode;
  signerMemberIds: string[];
  dueAt?: string;
};

export type SignSignatureInput = {
  consent: boolean;
  method: "TYPED" | "DRAWN";
  signedName?: string;
  signaturePng?: string;
};

function signaturePath(workspaceId: string, suffix = ""): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/signatures${suffix}`;
}

export function getSignatureSources(workspaceId: string): Promise<SignatureSource[]> {
  return apiRequest<SignatureSource[]>(signaturePath(workspaceId, "/sources"));
}

export function getSignatureMembers(workspaceId: string): Promise<SignatureMember[]> {
  return apiRequest<SignatureMember[]>(signaturePath(workspaceId, "/members"));
}

export function getSignatureRequests(workspaceId: string): Promise<SignatureRequest[]> {
  return apiRequest<SignatureRequest[]>(signaturePath(workspaceId));
}

export function getSignatureRequest(workspaceId: string, requestId: string): Promise<SignatureRequest> {
  return apiRequest<SignatureRequest>(signaturePath(workspaceId, `/${encodeURIComponent(requestId)}`));
}

export function createSignatureRequest(workspaceId: string, input: CreateSignatureInput): Promise<SignatureRequest> {
  return apiRequest<SignatureRequest>(signaturePath(workspaceId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function signSignatureRequest(
  workspaceId: string,
  requestId: string,
  input: SignSignatureInput,
): Promise<SignatureRequest> {
  return apiRequest<SignatureRequest>(
    signaturePath(workspaceId, `/${encodeURIComponent(requestId)}/sign`),
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function declineSignatureRequest(
  workspaceId: string,
  requestId: string,
  declineReason?: string,
): Promise<SignatureRequest> {
  return apiRequest<SignatureRequest>(
    signaturePath(workspaceId, `/${encodeURIComponent(requestId)}/decline`),
    { method: "POST", body: JSON.stringify(declineReason ? { declineReason } : {}) },
  );
}

export function cancelSignatureRequest(workspaceId: string, requestId: string): Promise<SignatureRequest> {
  return apiRequest<SignatureRequest>(
    signaturePath(workspaceId, `/${encodeURIComponent(requestId)}/cancel`),
    { method: "POST" },
  );
}
