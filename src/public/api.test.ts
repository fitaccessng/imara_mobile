import { apiRequest } from "@/api/client";
import {
  acceptWorkspaceInvitation,
  getCaptureEvent,
  getPublicDocument,
  getPublicFileRequest,
  getPublicGallery,
  getPublicSharedFile,
  getPublicSharedFileDownloadUrl,
  signPublicDocument,
  submitPublicDocumentForm,
  unlockPublicGallery,
} from "@/public/api";

jest.mock("@/api/client", () => ({ apiRequest: jest.fn() }));
jest.mock("@/config", () => ({
  getApiBaseUrl: () => "https://api.example.test/api/v1",
}));

const request = jest.mocked(apiRequest);

describe("public token API", () => {
  beforeEach(() => request.mockResolvedValue({} as never));

  it("uses invitation, shared file and public document routes", async () => {
    await acceptWorkspaceInvitation("invite/token");
    await getPublicSharedFile("share/token");
    await getPublicDocument("document/token");
    await submitPublicDocumentForm("document/token", { name: "Ada", email: "ada@example.com", answers: {} });
    await signPublicDocument("document/token", { name: "Ada", email: "ada@example.com", consent: true });

    expect(request).toHaveBeenNthCalledWith(1, "/invitations/invite%2Ftoken/accept", { method: "POST" });
    expect(request).toHaveBeenNthCalledWith(2, "/public-shares/share%2Ftoken");
    expect(request).toHaveBeenNthCalledWith(3, "/public-documents/document%2Ftoken");
    expect(request).toHaveBeenNthCalledWith(4, "/public-documents/document%2Ftoken/responses", {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com", answers: {} }),
    });
    expect(request).toHaveBeenNthCalledWith(5, "/public-documents/document%2Ftoken/sign", {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com", consent: true }),
    });
    expect(getPublicSharedFileDownloadUrl("share/token")).toContain("/public-shares/share%2Ftoken/download");
  });

  it("uses file request and event public routes", async () => {
    await getPublicFileRequest("request/token");
    await getCaptureEvent("capture/token");
    await getPublicGallery("gallery/token");
    await unlockPublicGallery("gallery/token", "12345678");

    expect(request).toHaveBeenNthCalledWith(1, "/file-requests/public/request%2Ftoken");
    expect(request).toHaveBeenNthCalledWith(2, "/events/capture/capture%2Ftoken");
    expect(request).toHaveBeenNthCalledWith(3, "/events/gallery/gallery%2Ftoken", { headers: undefined });
    expect(request).toHaveBeenNthCalledWith(4, "/events/gallery/gallery%2Ftoken/unlock", {
      method: "POST",
      body: JSON.stringify({ passcode: "12345678" }),
    });
  });
});
