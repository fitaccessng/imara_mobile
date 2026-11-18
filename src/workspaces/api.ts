import { apiRequest } from "@/api/client";
import type { WorkspaceFolder } from "@/files/api";
import { getWorkspaces } from "@/communications/api";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
export type WorkspaceMemberStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";
export type WorkspaceInvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type WorkspacePermissionEffect = "GRANT" | "RESTRICT";

export type WorkspaceMember = {
  id: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  joinedAt: string;
  updatedAt: string;
  displayName: string | null;
  user: { id: string; email: string; name: string };
  accessibleFolderCount: number;
  _count?: { permissions: number };
};

export type WorkspaceInvitation = {
  id: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type WorkspaceInvitationActionResult = Pick<
  WorkspaceInvitation,
  "id" | "email" | "role" | "status" | "expiresAt"
>;

export type WorkspaceMemberFolderRule = {
  folderId: string;
  effect: WorkspacePermissionEffect;
  permissionKeys: string[];
  inherit: boolean;
};

export type InviteWorkspaceMemberInput = {
  email: string;
  name?: string;
  role: Exclude<WorkspaceRole, "OWNER">;
  initialPermissions?: WorkspaceMemberFolderRule[];
};

export type WorkspaceActivity = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
};

export type WorkspaceMemberPermissionSet = {
  memberId: string;
  role: WorkspaceRole;
  permissions: Array<WorkspaceMemberFolderRule & {
    id: string;
    createdAt: string;
    updatedAt: string;
    folder: Pick<WorkspaceFolder, "id" | "name" | "parentFolderId">;
  }>;
};

function workspacePath(workspaceId: string, suffix: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/${suffix}`;
}

export function getWorkspaceDetail(workspaceId: string): Promise<{
  id: string;
  name: string;
  role: WorkspaceRole;
  subscription?: {
    state: "ACTIVE" | "GRACE" | "RESTRICTED" | "FREE";
    plan: "FREE" | "PRO" | "BUSINESS";
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    graceDaysRemaining: number;
    restricted: boolean;
  };
}> {
  return apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}`);
}

export function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return apiRequest<WorkspaceMember[]>(workspacePath(workspaceId, "members"));
}

export function getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  return apiRequest<WorkspaceInvitation[]>(workspacePath(workspaceId, "invitations"));
}

export function inviteWorkspaceMember(
  workspaceId: string,
  input: InviteWorkspaceMemberInput,
): Promise<WorkspaceInvitationActionResult> {
  return apiRequest<WorkspaceInvitationActionResult>(workspacePath(workspaceId, "invitations"), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resendWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<WorkspaceInvitationActionResult> {
  return apiRequest<WorkspaceInvitationActionResult>(
    workspacePath(workspaceId, `invitations/${encodeURIComponent(invitationId)}/resend`),
    { method: "POST" },
  );
}

export function revokeWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<void> {
  return apiRequest<void>(
    workspacePath(workspaceId, `invitations/${encodeURIComponent(invitationId)}`),
    { method: "DELETE" },
  );
}

export function updateWorkspaceMember(
  workspaceId: string,
  memberId: string,
  changes: { role?: Exclude<WorkspaceRole, "OWNER">; name?: string },
): Promise<Pick<WorkspaceMember, "id" | "role" | "status" | "displayName">> {
  return apiRequest<Pick<WorkspaceMember, "id" | "role" | "status" | "displayName">>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}`),
    { method: "PATCH", body: JSON.stringify(changes) },
  );
}

export function setWorkspaceMemberStatus(
  workspaceId: string,
  memberId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<{ id: string; status: WorkspaceMemberStatus }> {
  const action = status === "ACTIVE" ? "restore" : "suspend";
  return apiRequest<{ id: string; status: WorkspaceMemberStatus }>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}/${action}`),
    { method: "POST" },
  );
}

export function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<void> {
  return apiRequest<void>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}`),
    { method: "DELETE" },
  );
}

export function getWorkspaceActivity(workspaceId: string): Promise<WorkspaceActivity[]> {
  return apiRequest<WorkspaceActivity[]>(workspacePath(workspaceId, "activity"));
}

export function getWorkspaceFolderChoices(workspaceId: string): Promise<WorkspaceFolder[]> {
  return apiRequest<WorkspaceFolder[]>(workspacePath(workspaceId, "my-folders"));
}

export function getWorkspaceMember(
  workspaceId: string,
  memberId: string,
): Promise<WorkspaceMember> {
  return apiRequest<WorkspaceMember>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}`),
  );
}

export function getWorkspaceMemberActivity(
  workspaceId: string,
  memberId: string,
): Promise<WorkspaceActivity[]> {
  return apiRequest<WorkspaceActivity[]>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}/activity`),
  );
}

export function getWorkspaceMemberPermissions(
  workspaceId: string,
  memberId: string,
): Promise<WorkspaceMemberPermissionSet> {
  return apiRequest<WorkspaceMemberPermissionSet>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}/permissions`),
  );
}

export function replaceWorkspaceMemberPermissions(
  workspaceId: string,
  memberId: string,
  permissions: WorkspaceMemberFolderRule[],
): Promise<WorkspaceMemberPermissionSet> {
  return apiRequest<WorkspaceMemberPermissionSet>(
    workspacePath(workspaceId, `members/${encodeURIComponent(memberId)}/permissions`),
    { method: "PUT", body: JSON.stringify({ permissions }) },
  );
}

export const getWorkspaceChoices = getWorkspaces;
