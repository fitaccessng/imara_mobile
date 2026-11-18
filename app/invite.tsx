import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/auth/auth-store";
import { acceptWorkspaceInvitation } from "@/public/api";
import { colors } from "@/ui/theme";

export default function InvitationAcceptRoute() {
  const status = useAuthStore((state) => state.status);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [error, setError] = useState("");

  const accept = useMutation({
    mutationFn: () => acceptWorkspaceInvitation(token),
  });

  useEffect(() => {
    if (!token) setError("No invitation token was found in this link.");
  }, [token]);

  if (status === "checking") return <State title="Checking session…" />;
  if (status !== "signedIn") return <State title="Sign in to accept" detail="Use the email address that received this workspace invitation." />;

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.kicker}>WORKSPACE INVITATION</Text>
        <Text style={styles.title}>Join the workspace</Text>
        <Text style={styles.subtitle}>Accepting connects this account with the invitation’s role and folder permissions.</Text>
        {!token ? <Text style={styles.error}>No invitation token was found in this link.</Text> : error ? <Text style={styles.error}>{error}</Text> : null}
        {accept.isSuccess ? <><Text style={styles.success}>Invitation accepted.</Text><Pressable onPress={() => {}} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Open workspace</Text></Pressable></> : <Pressable disabled={!token || accept.isPending} onPress={() => { setError(""); accept.mutate(undefined, { onError: (cause) => setError(cause instanceof Error ? cause.message : "The invitation could not be accepted.") }); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{accept.isPending ? "Accepting…" : "Accept invitation"}</Text></Pressable>}
      </View>
    </View>
  );
}

function State({ title, detail }: { title: string; detail?: string }) {
  return <View style={styles.state}><ActivityIndicator color={colors.green} /><Text style={styles.title}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 18, justifyContent: "center" }, state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }, card: { gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface, padding: 20 }, kicker: { color: colors.greenDark, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 17 }, primaryButton: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" }, primaryButtonText: { color: colors.surface, fontSize: 11, fontWeight: "800" }, error: { color: colors.red, backgroundColor: colors.redWash, borderRadius: 9, padding: 9, fontSize: 10 }, success: { color: colors.greenDark, backgroundColor: colors.greenWash, borderRadius: 9, padding: 9, fontSize: 10, fontWeight: "700" },
});
