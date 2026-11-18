import { apiRequest } from "@/api/client";
import {
  getWorkspaceActivity,
  getWorkspaceFolderChoices,
  getWorkspaceInvitations,
  getWorkspaceMember,
  getWorkspaceMemberActivity,
  getWorkspaceMemberPermissions,
  getWorkspaceMembers,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  replaceWorkspaceMemberPermissions,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  setWorkspaceMemberStatus,
  updateWorkspaceMember,
} from "@/workspaces/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("workspace team API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the current workspace member and invitation endpoints", async () => {
    const initialPermissions = [{
      folderId: "folder-id",
      effect: "GRANT" as const,
      permissionKeys: ["viewFolder", "uploadFiles"],
      inherit: true,
    }];
    await getWorkspaceMembers("workspace/id");
    await getWorkspaceInvitations("workspace/id");
    await inviteWorkspaceMember("workspace/id", {
      email: "person@example.com",
      name: "Person",
      role: "STAFF",
      initialPermissions,
    });
    await resendWorkspaceInvitation("workspace/id", "invite/id");
    await revokeWorkspaceInvitation("workspace/id", "invite/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/members");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/invitations");
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/invitations", {
      method: "POST",
      body: JSON.stringify({
        email: "person@example.com",
        name: "Person",
        role: "STAFF",
        initialPermissions,
      }),
    });
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/workspaces/workspace%2Fid/invitations/invite%2Fid/resend",
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(
      5,
      "/workspaces/workspace%2Fid/invitations/invite%2Fid",
      { method: "DELETE" },
    );
  });

  it("uses the current member lifecycle, profile, and role endpoints", async () => {
    await getWorkspaceMember("workspace/id", "member/id");
    await updateWorkspaceMember("workspace/id", "member/id", { role: "MANAGER", name: "New name" });
    await setWorkspaceMemberStatus("workspace/id", "member/id", "SUSPENDED");
    await setWorkspaceMemberStatus("workspace/id", "member/id", "ACTIVE");
    await removeWorkspaceMember("workspace/id", "member/id");

    expect(request).toHaveBeenNthCalledWith(
      1,
      "/workspaces/workspace%2Fid/members/member%2Fid",
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/workspaces/workspace%2Fid/members/member%2Fid",
      { method: "PATCH", body: JSON.stringify({ role: "MANAGER", name: "New name" }) },
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/workspaces/workspace%2Fid/members/member%2Fid/suspend",
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/workspaces/workspace%2Fid/members/member%2Fid/restore",
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(
      5,
      "/workspaces/workspace%2Fid/members/member%2Fid",
      { method: "DELETE" },
    );
  });

  it("uses authorized folder, activity, and member-permission endpoints", async () => {
    const permissions = [{
      folderId: "folder-id",
      effect: "RESTRICT" as const,
      permissionKeys: ["downloadFiles"],
      inherit: true,
    }];
    await getWorkspaceFolderChoices("workspace/id");
    await getWorkspaceActivity("workspace/id");
    await getWorkspaceMemberActivity("workspace/id", "member/id");
    await getWorkspaceMemberPermissions("workspace/id", "member/id");
    await replaceWorkspaceMemberPermissions("workspace/id", "member/id", permissions);

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/my-folders");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/activity");
    expect(request).toHaveBeenNthCalledWith(
      3,
      "/workspaces/workspace%2Fid/members/member%2Fid/activity",
    );
    expect(request).toHaveBeenNthCalledWith(
      4,
      "/workspaces/workspace%2Fid/members/member%2Fid/permissions",
    );
    expect(request).toHaveBeenNthCalledWith(
      5,
      "/workspaces/workspace%2Fid/members/member%2Fid/permissions",
      { method: "PUT", body: JSON.stringify({ permissions }) },
    );
  });
});
