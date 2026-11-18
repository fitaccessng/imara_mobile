import { apiRequest } from "@/api/client";

export type ApprovalReviewMode = "SEQUENTIAL" | "PARALLEL";
export type ApprovalStatus = "IN_PROGRESS" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type ApprovalView = "mine" | "pending" | "history";

export type ApprovalMember = {
  id: string;
  displayName: string | null;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
  user: { id: string; name: string };
};

export type ApprovalTemplateStep = {
  id: string;
  stepOrder: number;
  mode: ApprovalReviewMode;
  approvers: Array<{ memberId: string; member: ApprovalMember }>;
};

export type ApprovalTemplate = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  steps: ApprovalTemplateStep[];
};

export type ApprovalRequest = {
  id: string;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  currentStepOrder: number;
  dueAt: string | null;
  createdAt: string;
  requesterId: string | null;
  requester: { id: string; name: string } | null;
  template: { id: string; name: string } | null;
  steps: Array<{
    id: string;
    stepOrder: number;
    mode: ApprovalReviewMode;
    isComplete: boolean;
    approvers: Array<{
      id: string;
      memberId: string;
      decision: ApprovalDecision;
      decidedAt: string | null;
      member: ApprovalMember;
    }>;
  }>;
  attachments: Array<{
    id: string;
    fileId: string | null;
    fileName: string;
    file: { id: string; status: string; deletedAt: string | null } | null;
  }>;
  activities?: Array<{
    id: string;
    action: string;
    comment: string | null;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }>;
};

export type ApprovalTemplateStepInput = {
  mode: ApprovalReviewMode;
  approverMemberIds: string[];
};

export type CreateApprovalRequestInput = {
  templateId: string;
  title: string;
  description?: string;
  dueAt?: string;
  fileIds?: string[];
};

function approvalsPath(workspaceId: string, suffix = ""): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/approvals${suffix}`;
}

export function getApprovalTemplates(workspaceId: string): Promise<ApprovalTemplate[]> {
  return apiRequest<ApprovalTemplate[]>(approvalsPath(workspaceId, "/templates"));
}

export function createApprovalTemplate(
  workspaceId: string,
  input: { name: string; description?: string; steps: ApprovalTemplateStepInput[] },
): Promise<ApprovalTemplate> {
  return apiRequest<ApprovalTemplate>(approvalsPath(workspaceId, "/templates"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setApprovalTemplateActive(
  workspaceId: string,
  templateId: string,
  isActive: boolean,
): Promise<ApprovalTemplate> {
  return apiRequest<ApprovalTemplate>(
    approvalsPath(workspaceId, `/templates/${encodeURIComponent(templateId)}`),
    { method: "PATCH", body: JSON.stringify({ isActive }) },
  );
}

export function getApprovalRequests(workspaceId: string, view: ApprovalView): Promise<ApprovalRequest[]> {
  return apiRequest<ApprovalRequest[]>(approvalsPath(workspaceId, `?view=${view}`));
}

export function getApprovalRequest(workspaceId: string, requestId: string): Promise<ApprovalRequest> {
  return apiRequest<ApprovalRequest>(approvalsPath(workspaceId, `/${encodeURIComponent(requestId)}`));
}

export function createApprovalRequest(workspaceId: string, input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
  return apiRequest<ApprovalRequest>(approvalsPath(workspaceId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function decideApprovalRequest(
  workspaceId: string,
  requestId: string,
  decision: Exclude<ApprovalDecision, "PENDING">,
  comment?: string,
): Promise<unknown> {
  return apiRequest(
    approvalsPath(workspaceId, `/${encodeURIComponent(requestId)}/decision`),
    { method: "POST", body: JSON.stringify({ decision, ...(comment ? { comment } : {}) }) },
  );
}

export function commentOnApprovalRequest(workspaceId: string, requestId: string, comment: string): Promise<unknown> {
  return apiRequest(
    approvalsPath(workspaceId, `/${encodeURIComponent(requestId)}/comments`),
    { method: "POST", body: JSON.stringify({ comment }) },
  );
}

export function resubmitApprovalRequest(workspaceId: string, requestId: string, comment?: string): Promise<unknown> {
  return apiRequest(
    approvalsPath(workspaceId, `/${encodeURIComponent(requestId)}/resubmit`),
    { method: "POST", body: JSON.stringify(comment ? { comment } : {}) },
  );
}

export function cancelApprovalRequest(workspaceId: string, requestId: string): Promise<unknown> {
  return apiRequest(
    approvalsPath(workspaceId, `/${encodeURIComponent(requestId)}/cancel`),
    { method: "POST" },
  );
}
