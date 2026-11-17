import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "IMARA",
  slug: "imara-mobile",
  scheme: "imara",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["ios", "android"],
  newArchEnabled: true,
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-splash-screen",
    "expo-sqlite",
    [
      "expo-camera",
      {
        cameraPermission: "Allow IMARA to scan documents you choose to upload.",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission: "Allow IMARA to verify your identity on this device.",
      },
    ],
    [
      "expo-notifications",
      {
        defaultChannel: "imara-updates",
        enableBackgroundRemoteNotifications: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    bundleIdentifier: "space.useimara.mobile",
    supportsTablet: true,
  },
  android: {
    package: "space.useimara.mobile",
    predictiveBackGestureEnabled: true,
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    sessionCookieName: process.env.EXPO_PUBLIC_SESSION_COOKIE_NAME ?? "imara_session",
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
