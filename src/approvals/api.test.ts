import { apiRequest } from "@/api/client";
import {
  cancelApprovalRequest,
  commentOnApprovalRequest,
  createApprovalRequest,
  createApprovalTemplate,
  decideApprovalRequest,
  getApprovalRequest,
  getApprovalRequests,
  getApprovalTemplates,
  resubmitApprovalRequest,
  setApprovalTemplateActive,
} from "@/approvals/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("workspace approvals API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the current template, list and detail routes", async () => {
    await getApprovalTemplates("workspace/id");
    await getApprovalRequests("workspace/id", "pending");
    await getApprovalRequest("workspace/id", "request/id");
    await setApprovalTemplateActive("workspace/id", "template/id", false);

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/approvals/templates");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/approvals?view=pending");
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/approvals/request%2Fid");
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/approvals/templates/template%2Fid", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
  });

  it("uses the current create and request-action contracts", async () => {
    const template = {
      name: "Purchase approval",
      description: "Purchases",
      steps: [{ mode: "SEQUENTIAL" as const, approverMemberIds: ["member/id"] }],
    };
    const approval = {
      templateId: "template/id",
      title: "Laptop purchase",
      dueAt: "2026-12-01T10:00:00.000Z",
      fileIds: ["file/id"],
    };
    await createApprovalTemplate("workspace/id", template);
    await createApprovalRequest("workspace/id", approval);
    await decideApprovalRequest("workspace/id", "request/id", "CHANGES_REQUESTED", "Please update");
    await commentOnApprovalRequest("workspace/id", "request/id", "Reviewed");
    await resubmitApprovalRequest("workspace/id", "request/id", "Updated attachment");
    await cancelApprovalRequest("workspace/id", "request/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/approvals/templates", {
      method: "POST",
      body: JSON.stringify(template),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/approvals", {
      method: "POST",
      body: JSON.stringify(approval),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/approvals/request%2Fid/decision", {
      method: "POST",
      body: JSON.stringify({ decision: "CHANGES_REQUESTED", comment: "Please update" }),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/approvals/request%2Fid/comments", {
      method: "POST",
      body: JSON.stringify({ comment: "Reviewed" }),
    });
    expect(request).toHaveBeenNthCalledWith(5, "/workspaces/workspace%2Fid/approvals/request%2Fid/resubmit", {
      method: "POST",
      body: JSON.stringify({ comment: "Updated attachment" }),
    });
    expect(request).toHaveBeenNthCalledWith(6, "/workspaces/workspace%2Fid/approvals/request%2Fid/cancel", {
      method: "POST",
    });
  });
});
