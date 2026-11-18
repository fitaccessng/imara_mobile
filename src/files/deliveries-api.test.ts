import { apiRequest } from "@/api/client";
import { getWorkspaceFileDeliveries, getWorkspaceFileDeliveryDownloadPath } from "@/files/deliveries-api";

jest.mock("@/api/client", () => ({
  apiRequest: jest.fn(),
}));

const request = jest.mocked(apiRequest);

describe("workspace file deliveries API", () => {
  beforeEach(() => {
    request.mockResolvedValue([] as never);
  });

  it("uses the current collection and authenticated download routes", async () => {
    await getWorkspaceFileDeliveries("workspace/id");
    expect(request).toHaveBeenCalledWith("/workspaces/workspace%2Fid/file-deliveries");
    expect(getWorkspaceFileDeliveryDownloadPath("workspace/id", "delivery/id"))
      .toBe("/workspaces/workspace%2Fid/file-deliveries/delivery%2Fid/download");
  });
});
