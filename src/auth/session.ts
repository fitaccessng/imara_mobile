import CookieManager from "@preeternal/react-native-cookie-manager";
import * as SecureStore from "expo-secure-store";

import { getApiOrigin, getApiSessionStorageKey, sessionCookieName } from "@/config";

export async function persistSessionFromNativeCookieJar(): Promise<void> {
  const cookies = await CookieManager.get(getApiOrigin());
  const sessionCookie = cookies[sessionCookieName];

  if (!sessionCookie?.value) {
    await CookieManager.clearByName(getApiOrigin(), sessionCookieName);
    throw new Error(
      "IMARA signed in, but this device did not retain the secure session cookie. Update the app or contact support.",
    );
  }

  try {
    await SecureStore.setItemAsync(getApiSessionStorageKey(), sessionCookie.value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    await CookieManager.clearByName(getApiOrigin(), sessionCookieName);
    throw error;
  }
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(getApiSessionStorageKey());
  await CookieManager.clearByName(getApiOrigin(), sessionCookieName);
}

export async function hasStoredSession(): Promise<boolean> {
  return (await SecureStore.getItemAsync(getApiSessionStorageKey())) !== null;
}
