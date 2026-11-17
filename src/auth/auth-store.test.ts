import { ApiError } from "@/api/client";
import { getCurrentUser } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { clearStoredSession, hasStoredSession } from "@/auth/session";

jest.mock("@/auth/auth-api", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/auth/session", () => ({
  clearStoredSession: jest.fn(),
  hasStoredSession: jest.fn(),
}));

const user = {
  id: "user-1",
  email: "person@example.test",
  name: "Imara User",
  emailVerified: true,
};

describe("session bootstrap", () => {
  const getCurrentUserMock = jest.mocked(getCurrentUser);
  const hasStoredSessionMock = jest.mocked(hasStoredSession);
  const clearStoredSessionMock = jest.mocked(clearStoredSession);

  beforeEach(() => {
    useAuthStore.setState({
      status: "checking",
      user: null,
      workspaceId: null,
      error: null,
    });
    hasStoredSessionMock.mockResolvedValue(true);
    getCurrentUserMock.mockResolvedValue(user);
    clearStoredSessionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("checks the server session before marking the user signed in", async () => {
    await useAuthStore.getState().initialize();

    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      status: "signedIn",
      user,
      error: null,
    });
  });

  it("clears local session state when the server reports an expired session", async () => {
    getCurrentUserMock.mockRejectedValueOnce(new ApiError("Please sign in again.", 401));

    await useAuthStore.getState().initialize();

    expect(clearStoredSessionMock).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      status: "signedOut",
      user: null,
      error: null,
    });
  });

  it("preserves saved credentials after a network error", async () => {
    getCurrentUserMock.mockRejectedValueOnce(new ApiError("We couldn’t connect to IMARA.", 0));

    await useAuthStore.getState().initialize();

    expect(clearStoredSessionMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "error",
      user: null,
      error: "We couldn’t connect to IMARA.",
    });
  });

  it("does not call the API when no saved session exists", async () => {
    hasStoredSessionMock.mockResolvedValueOnce(false);

    await useAuthStore.getState().initialize();

    expect(getCurrentUserMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      status: "signedOut",
      user: null,
    });
  });
});
