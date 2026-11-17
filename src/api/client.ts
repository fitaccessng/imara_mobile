import * as SecureStore from "expo-secure-store";

import { getApiBaseUrl, getApiSessionStorageKey, sessionCookieName } from "@/config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function safeMessage(payload: unknown, status: number): string {
  if (status === 503) return "IMARA is temporarily unavailable. Please try again shortly.";
  if (status >= 500) return "IMARA couldn’t complete the request. Please try again shortly.";

  if (typeof payload !== "object" || payload === null || !("message" in payload)) {
    return "Something went wrong. Please try again.";
  }

  const message = payload.message;
  const text = Array.isArray(message)
    ? message.filter((item): item is string => typeof item === "string").join(" ")
    : typeof message === "string"
      ? message
      : "";

  if (!text || text.length > 500 || /\b(?:Error|Exception):|^\s*at\s|\bat\s+\S+\s+\(/m.test(text)) {
    return "Something went wrong. Please try again.";
  }
  return text;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API paths must be relative to the configured IMARA API.");
  }

  const baseUrl = getApiBaseUrl();
  const nativeCookieFlow = options.credentials === "include";
  const publicAuthEndpoint =
    /^\/auth\/(?:login|register|verify-email(?:-code)?|resend-verification|forgot-password|reset-password(?:-code)?)$/.test(path);
  const sessionCookie =
    nativeCookieFlow || publicAuthEndpoint
      ? null
      : await SecureStore.getItemAsync(getApiSessionStorageKey());
  const headers = new Headers(options.headers);

  if (sessionCookie && !headers.has("Cookie")) {
    headers.set("Cookie", `${sessionCookieName}=${sessionCookie}`);
  }
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: options.credentials ?? "omit",
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("We couldn’t connect to IMARA. Check your internet connection and try again.", 0);
    }
    throw error;
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError("Something went wrong. Please try again.", response.status);
    }
    return undefined as T;
  }

  const body = await response.text();
  let payload: unknown = null;
  if (body) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      if (response.ok) {
        throw new Error("The server returned an unreadable response.");
      }
      payload = body;
    }
  }

  if (!response.ok) {
    throw new ApiError(safeMessage(payload, response.status), response.status);
  }

  return payload as T;
}
