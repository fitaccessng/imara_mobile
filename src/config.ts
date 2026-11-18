import Constants from "expo-constants";
import { Platform } from "react-native";

type AppExtra = {
  apiUrl?: string;
  webUrl?: string;
  sessionCookieName?: string;
};

const extra = Constants.expoConfig?.extra as AppExtra | undefined;

export const sessionCookieName = extra?.sessionCookieName ?? "imara_session";

if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(sessionCookieName)) {
  throw new Error("EXPO_PUBLIC_SESSION_COOKIE_NAME is not a valid cookie name.");
}

export function getApiBaseUrl(): string {
  const configuredUrl = extra?.apiUrl?.trim();
  if (!configuredUrl) {
    throw new Error("Set EXPO_PUBLIC_API_URL in mobile/.env before connecting to IMARA.");
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_URL must be an absolute URL.");
  }

  if (url.protocol !== "https:" && !__DEV__) {
    throw new Error("IMARA mobile requires HTTPS outside development builds.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("EXPO_PUBLIC_API_URL must not contain credentials, query parameters, or a fragment.");
  }

  return configuredUrl.replace(/\/+$/, "");
}

export function getApiOrigin(): string {
  return new URL(getApiBaseUrl()).origin;
}

export function getWebBaseUrl(): string {
  const configuredUrl = extra?.webUrl?.trim();
  if (!configuredUrl) {
    throw new Error("Set EXPO_PUBLIC_WEB_URL in mobile/.env before creating public links.");
  }
  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_WEB_URL must be an absolute URL.");
  }
  if (url.protocol !== "https:" && !__DEV__) {
    throw new Error("IMARA mobile requires HTTPS for public links outside development builds.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("EXPO_PUBLIC_WEB_URL must not contain credentials, query parameters, or a fragment.");
  }
  return configuredUrl.replace(/\/+$/, "");
}

export function getApiSessionStorageKey(): string {
  const url = new URL(getApiBaseUrl());
  const apiPath = url.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-");
  return `imara.session.v1.${Platform.OS}.${url.hostname}.${apiPath}`;
}
