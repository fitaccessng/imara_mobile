import { useNetInfo } from "@react-native-community/netinfo";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File } from "expo-file-system";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError, apiRequest } from "@/api/client";
import { useAuthStore } from "@/auth/auth-store";
import { Notice, PrimaryButton } from "@/ui/components";
import { savePendingScan, removePendingScan } from "@/offline/scan-queue";
import { colors } from "@/ui/theme";

export default function ScanScreen() {
  const userId = useAuthStore((state) => state.user?.id);
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const netInfo = useNetInfo();
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function captureAndQueue(): Promise<void> {
    if (!camera.current || !userId) {
      setError("Camera is not ready or your account session is unavailable.");
      return;
    }
    setCapturing(true);
    setError("");
    setMessage("");
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.82 });
      const scan = await savePendingScan(picture.uri, userId);
      if (netInfo.isConnected !== true) {
        setMessage("Scan saved in this app’s private local queue. Connect to upload it.");
        return;
      }

      try {
        const form = new FormData();
        form.append("file", new File(scan.uri), scan.fileName);
        await apiRequest("/files/scan", { method: "POST", body: form });
        await removePendingScan(scan);
        setMessage("Scan uploaded to your personal IMARA files.");
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 0) {
          setMessage("Connection dropped. The scan is saved locally and can be uploaded from Offline support.");
        } else {
          setError(caught instanceof Error ? caught.message : "Scan could not be uploaded. It remains in the local queue.");
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not capture or save the scan.");
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return <View style={styles.center}><Text style={styles.body}>Checking camera permission…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>Allow camera access to capture a document for your IMARA files.</Text>
        <PrimaryButton title="Allow camera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>DOCUMENT SCANNER</Text>
      <Text style={styles.title}>Capture a document</Text>
      <View style={styles.cameraFrame}>
        <CameraView
          ref={camera}
          active
          autofocus="on"
          facing="back"
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
          style={styles.camera}
        />
      </View>
      {error ? <Notice>{error}</Notice> : null}
      {message ? <Notice success>{message}</Notice> : null}
      <Text style={styles.hint}>
        Captures are queued in app-private storage and uploaded through the existing IMARA scan endpoint. Workspace scans and multi-page scanning are not included yet.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !cameraReady || capturing, busy: capturing }}
        disabled={!cameraReady || capturing}
        onPress={() => void captureAndQueue()}
        style={[styles.captureButton, !cameraReady || capturing ? styles.disabled : null]}
      >
        <Text style={styles.captureText}>{capturing ? "Saving…" : "Capture and upload"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24, gap: 14 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  cameraFrame: { width: "100%", height: 420, overflow: "hidden", borderRadius: 22, backgroundColor: colors.ink },
  camera: { flex: 1 },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  captureButton: { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  disabled: { opacity: 0.55 },
  captureText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
});
