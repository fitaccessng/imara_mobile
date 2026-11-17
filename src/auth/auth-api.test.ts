import CookieManager from "@preeternal/react-native-cookie-manager";
import * as SecureStore from "expo-secure-store";

import { ApiError } from "@/api/client";
import { getApiSessionStorageKey } from "@/config";
import {
  getCurrentUser,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signIn,
  verifyEmailCode,
  type AuthResult,
} from "@/auth/auth-api";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: "https://api.example.test/api/v1",
        sessionCookieName: "imara_session",
      },
    },
  },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

jest.mock("@preeternal/react-native-cookie-manager", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    clearByName: jest.fn(),
  },
}));

const user = {
  id: "user-1",
  email: "person@example.test",
  name: "Imara User",
  emailVerified: true,
};

function response(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), { status });
}

describe("native authentication API", () => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  const secureStore = jest.mocked(SecureStore);
  const cookieManager = jest.mocked(CookieManager);

  beforeEach(() => {
    fetchMock.mockReset();
    secureStore.getItemAsync.mockResolvedValue(null);
    secureStore.setItemAsync.mockResolvedValue(undefined);
    cookieManager.get.mockResolvedValue({
      imara_session: { name: "imara_session", value: "opaque-session-value" },
    });
    cookieManager.clearByName.mockResolvedValue(true);
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it("captures the API-issued login cookie in OS-protected storage", async () => {
    const result: AuthResult = { user, workspaceId: null };
    fetchMock.mockResolvedValueOnce(response(result));

    await expect(signIn(user.email, "not-a-real-password")).resolves.toEqual(result);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/v1/auth/login");
    expect(options?.credentials).toBe("include");
    expect(new Headers(options?.headers).get("Cookie")).toBeNull();
    expect(cookieManager.get).toHaveBeenCalledWith("https://api.example.test");
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      getApiSessionStorageKey(),
      "opaque-session-value",
      { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  });

  it("sends saved session material only as a cookie to the configured API", async () => {
    secureStore.getItemAsync.mockResolvedValue("opaque-session-value");
    fetchMock.mockResolvedValueOnce(response(user));

    await expect(getCurrentUser()).resolves.toEqual(user);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/v1/auth/me");
    expect(options?.credentials).toBe("omit");
    expect(new Headers(options?.headers).get("Cookie")).toBe("imara_session=opaque-session-value");
    expect(new Headers(options?.headers).get("Authorization")).toBeNull();
  });

  it("captures the session cookie after email-code verification", async () => {
    const result: AuthResult = { user, workspaceId: "workspace-1" };
    fetchMock.mockResolvedValueOnce(response(result));

    await expect(verifyEmailCode(user.email, "123456")).resolves.toEqual(result);

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/api/v1/auth/verify-email-code");
    expect(fetchMock.mock.calls[0][1]?.credentials).toBe("include");
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      getApiSessionStorageKey(),
      "opaque-session-value",
      expect.any(Object),
    );
  });

  it("sends business registration using the existing API fields", async () => {
    fetchMock.mockResolvedValueOnce(response({ emailVerified: false, workspaceId: "workspace-1" }, 201));

    await expect(
      register({
        name: user.name,
        email: user.email,
        password: "not-a-real-password",
        accountType: "BUSINESS",
        workspaceName: "Example team",
        referralCode: "REFERRAL8",
      }),
    ).resolves.toEqual({ emailVerified: false, workspaceId: "workspace-1" });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/v1/auth/register");
    expect(JSON.parse(String(options?.body))).toEqual({
      name: user.name,
      email: user.email,
      password: "not-a-real-password",
      accountType: "BUSINESS",
      workspaceName: "Example team",
      referralCode: "REFERRAL8",
    });
    expect(new Headers(options?.headers).get("Cookie")).toBeNull();
  });

  it("uses the existing email-code password recovery endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ message: "If the address is registered, an email will be sent." }, 202))
      .mockResolvedValueOnce(response(null, 204));

    await requestPasswordReset(user.email);
    await resetPassword(user.email, "123456", "a-strong-new-password");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/v1/auth/forgot-password",
      "https://api.example.test/api/v1/auth/reset-password-code",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      email: user.email,
      code: "123456",
      password: "a-strong-new-password",
    });
  });

  it("resends email verification through the public controller route", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ message: "If the address needs verification, an email will be sent." }, 202),
    );

    await expect(resendVerification(user.email)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.test/api/v1/auth/resend-verification");
  });

  it("surfaces API login errors without creating local session state", async () => {
    fetchMock.mockResolvedValueOnce(response({ message: "Invalid credentials." }, 401));

    await expect(signIn(user.email, "wrong-password")).rejects.toMatchObject({
      name: "ApiError",
      message: "Invalid credentials.",
      status: 401,
    } satisfies Partial<ApiError>);
    expect(cookieManager.get).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("refuses a successful login if the native cookie jar did not retain the session", async () => {
    fetchMock.mockResolvedValueOnce(response({ user, workspaceId: null }));
    cookieManager.get.mockResolvedValue({});

    await expect(signIn(user.email, "not-a-real-password")).rejects.toThrow(
      "this device did not retain the secure session cookie",
    );
    expect(cookieManager.clearByName).toHaveBeenCalledWith(
      "https://api.example.test",
      "imara_session",
    );
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
