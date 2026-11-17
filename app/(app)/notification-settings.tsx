import * as Notifications from "expo-notifications";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Notice } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function NotificationSettingsScreen() {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshPermission(): Promise<void> {
    const result = await Notifications.getPermissionsAsync();
    setPermission(result.granted);
  }

  useEffect(() => {
    void refreshPermission().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not read notification permission.");
    });
  }, []);

  async function requestPermission(): Promise<void> {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await Notifications.requestPermissionsAsync();
      setPermission(result.granted);
      setMessage(
        result.granted
          ? "This device allows notifications. Remote IMARA push delivery still requires backend device registration."
          : "Permission was not granted. You can enable it later in device settings.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request notification permission.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>DEVICE SETTINGS</Text>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Permission status</Text>
        <Text style={styles.status}>{permission === null ? "Checking…" : permission ? "Allowed" : "Not enabled"}</Text>
      </View>
      {error ? <Notice>{error}</Notice> : null}
      {message ? <Notice success>{message}</Notice> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void requestPermission()} style={styles.action}>
        <Text style={styles.actionText}>{busy ? "Please wait…" : "Request permission"}</Text>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>In-app inbox remains available</Text>
        <Text style={styles.infoText}>This setting controls device permission only. IMARA inbox alerts load from the authenticated API.</Text>
      </View>
      <Link href="/(app)/notifications" asChild><Pressable><Text style={styles.link}>Open notification inbox</Text></Pressable></Link>
      <Link href="/(app)/native-support" asChild><Pressable><Text style={styles.link}>Back to device tools</Text></Pressable></Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  status: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  action: { backgroundColor: colors.green, borderRadius: 15, paddingVertical: 14, alignItems: "center" },
  actionText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  info: { backgroundColor: colors.greenWash, borderRadius: 18, padding: 16, gap: 6 },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  infoText: { color: colors.text, fontSize: 12, lineHeight: 19 },
  link: { color: colors.greenDark, fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 7 },
});
