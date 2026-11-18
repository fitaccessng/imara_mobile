import { apiRequest } from "@/api/client";
import {
  cancelSignatureRequest,
  createSignatureRequest,
  declineSignatureRequest,
  getSignatureMembers,
  getSignatureRequest,
  getSignatureRequests,
  getSignatureSources,
  signSignatureRequest,
} from "@/signatures/api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("workspace signature API", () => {
  beforeEach(() => {
    request.mockResolvedValue({} as never);
  });

  it("uses the current collection, source and member endpoints", async () => {
    await getSignatureRequests("workspace/id");
    await getSignatureSources("workspace/id");
    await getSignatureMembers("workspace/id");
    await getSignatureRequest("workspace/id", "request/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/signatures");
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/signatures/sources");
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/signatures/members");
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/signatures/request%2Fid");
  });

  it("uses the current request action endpoints", async () => {
    const createInput = {
      sourceFileId: "file/id",
      mode: "SEQUENTIAL" as const,
      signerMemberIds: ["member/id"],
      dueAt: "2026-12-01T10:00:00.000Z",
    };
    const signInput = { consent: true, method: "TYPED" as const, signedName: "A. User" };
    await createSignatureRequest("workspace/id", createInput);
    await signSignatureRequest("workspace/id", "request/id", signInput);
    await declineSignatureRequest("workspace/id", "request/id", "Not authorized");
    await cancelSignatureRequest("workspace/id", "request/id");

    expect(request).toHaveBeenNthCalledWith(1, "/workspaces/workspace%2Fid/signatures", {
      method: "POST",
      body: JSON.stringify(createInput),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/workspaces/workspace%2Fid/signatures/request%2Fid/sign", {
      method: "POST",
      body: JSON.stringify(signInput),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/workspaces/workspace%2Fid/signatures/request%2Fid/decline", {
      method: "POST",
      body: JSON.stringify({ declineReason: "Not authorized" }),
    });
    expect(request).toHaveBeenNthCalledWith(4, "/workspaces/workspace%2Fid/signatures/request%2Fid/cancel", {
      method: "POST",
    });
  });
});
