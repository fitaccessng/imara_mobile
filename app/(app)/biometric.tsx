import * as LocalAuthentication from "expo-local-authentication";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Notice } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function BiometricScreen() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hasHardware, hasEnrollment]) => {
        if (active) {
          setAvailable(hasHardware);
          setEnrolled(hasEnrollment);
        }
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not check device biometrics.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function verify(): Promise<void> {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your identity",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      });
      setMessage(result.success
        ? "Device verification succeeded. IMARA’s server session and permissions remain authoritative."
        : "Identity verification was not completed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Biometric verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>DEVICE SECURITY</Text>
      <Text style={styles.title}>Biometric verification</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Hardware</Text>
        <Text style={styles.status}>{available === null ? "Checking…" : available ? "Available" : "Not available"}</Text>
        <Text style={styles.detail}>Enrollment: {enrolled ? "Ready" : "Not set up on this device"}</Text>
      </View>
      {error ? <Notice>{error}</Notice> : null}
      {message ? <Notice success>{message}</Notice> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy || !available || !enrolled}
        onPress={() => void verify()}
        style={[styles.action, busy || !available || !enrolled ? styles.disabled : null]}
      >
        <Text style={styles.actionText}>{busy ? "Verifying…" : "Verify on this device"}</Text>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>Biometrics do not replace sign-in</Text>
        <Text style={styles.infoText}>This check is local to the device. It cannot grant permissions or extend an expired IMARA session.</Text>
      </View>
      <Link href="/(app)/native-support" asChild><Pressable><Text style={styles.link}>Back to device tools</Text></Pressable></Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 36, gap: 14 },
  kicker: { color: colors.greenDark, fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.5 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 7 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  status: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: 12 },
  action: { backgroundColor: colors.green, borderRadius: 15, paddingVertical: 14, alignItems: "center" },
  disabled: { opacity: 0.55 },
  actionText: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  info: { backgroundColor: colors.greenWash, borderRadius: 18, padding: 16, gap: 6 },
  infoTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  infoText: { color: colors.text, fontSize: 12, lineHeight: 19 },
  link: { color: colors.greenDark, fontSize: 13, fontWeight: "700", textAlign: "center", paddingVertical: 7 },
});
