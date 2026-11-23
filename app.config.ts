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
    [
      "expo-audio",
      {
        microphonePermission: "Allow IMARA to record meetings and dictate notes on this device.",
      },
    ],
    [
      "expo-speech-recognition",
      {
        microphonePermission: "Allow IMARA to dictate notes on this device.",
        speechRecognitionPermission: "Allow IMARA to turn your speech into text on this device.",
      },
    ],
    "expo-sharing",
    "expo-secure-store",
    "expo-splash-screen",
    "expo-sqlite",
    "react-native-blob-util",
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
    associatedDomains: ["applinks:www.useimara.space", "applinks:useimara.space"],
  },
  android: {
    package: "space.useimara.mobile",
    predictiveBackGestureEnabled: true,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/workspace/invitations/accept" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/share" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/respond" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/request" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/capture" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/gallery" },
          { scheme: "https", host: "www.useimara.space", pathPrefix: "/form" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/workspace/invitations/accept" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/share" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/respond" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/request" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/capture" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/gallery" },
          { scheme: "https", host: "useimara.space", pathPrefix: "/form" },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    webUrl: process.env.EXPO_PUBLIC_WEB_URL,
    sessionCookieName: process.env.EXPO_PUBLIC_SESSION_COOKIE_NAME ?? "imara_session",
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
